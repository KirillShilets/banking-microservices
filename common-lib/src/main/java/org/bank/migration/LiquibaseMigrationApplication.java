package org.bank.migration;

import org.springframework.boot.WebApplicationType;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.builder.SpringApplicationBuilder;

/**
 * Minimal application context used by the Helm pre-install/pre-upgrade
 * migration Jobs (templates/migration-job.yaml).
 *
 * <p>The regular service application (e.g. AccountApplication) boots the full
 * web stack — controllers, security filter chain and business services — which
 * require request-scoped security beans such as {@code AuthenticatedUser}.
 * Those beans do not exist in a headless migration context, so starting the
 * main application for migrations fails before Liquibase even gets a chance to
 * run. This class deliberately scans only the {@code org.bank.migration}
 * package: the {@link LiquibaseMigrationRunner} plus the Spring Boot
 * auto-configurations needed for a {@code DataSource} and Liquibase. The
 * changelog is still resolved from the service jar's own classpath
 * ({@code classpath:db/changelog/db.changelog-master.xml}).
 */
@SpringBootApplication(scanBasePackages = "org.bank.migration")
public class LiquibaseMigrationApplication {

    public static void main(String[] args) {
        new SpringApplicationBuilder(LiquibaseMigrationApplication.class)
                .web(WebApplicationType.NONE)
                .run(args);
    }
}
