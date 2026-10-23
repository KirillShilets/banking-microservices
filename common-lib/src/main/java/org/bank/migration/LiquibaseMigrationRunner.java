package org.bank.migration;

import liquibase.Liquibase;
import liquibase.exception.LiquibaseException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

/**
 * Runs the Liquibase migration and then exits the application with a nonzero
 * exit code propagated on failure.
 *
 * <p>Activated only under the {@code migrate} profile, which the Helm
 * pre-upgrade/pre-install Job (templates/migration-job.yaml) uses. The plain
 * Spring Boot autoconfiguration would leave the process running
 * (web-application-type=none + schedulers/AMQP threads), so an explicit
 * {@link SpringApplication#exit} is required for the Job to complete.
 *
 * <p>The default Spring Boot run (non-{@code migrate} profile, e.g. local dev
 * and Testcontainers tests) is unaffected — this runner never activates there.
 */
@Component
@Profile("migrate")
public class LiquibaseMigrationRunner implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(LiquibaseMigrationRunner.class);

    private final Liquibase liquibase;
    private final ConfigurableApplicationContext context;

    public LiquibaseMigrationRunner(Liquibase liquibase, ConfigurableApplicationContext context) {
        this.liquibase = liquibase;
        this.context = context;
    }

    @Override
    public void run(ApplicationArguments args) {
        int exitCode = 0;
        try {
            // Idempotent: already-applied change sets are skipped.
            liquibase.update("");
            log.info("Liquibase migration completed successfully");
        } catch (LiquibaseException e) {
            log.error("Liquibase migration failed", e);
            exitCode = 1;
        }
        final int exitCodeForLambda = exitCode;
        SpringApplication.exit(context, () -> exitCodeForLambda);
    }
}
