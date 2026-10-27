package org.bank.migration;

import liquibase.Liquibase;
import liquibase.exception.LiquibaseException;
import org.junit.jupiter.api.Test;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ExitCodeGenerator;
import org.springframework.boot.SpringApplication;
import org.springframework.context.ConfigurableApplicationContext;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.mockStatic;
import static org.mockito.Mockito.verify;

class LiquibaseMigrationRunnerTest {

    private final Liquibase liquibase = mock(Liquibase.class);
    private final ConfigurableApplicationContext context = mock(ConfigurableApplicationContext.class);
    private final ApplicationArguments args = mock(ApplicationArguments.class);

    @Test
    void appliesMigrationsAndExitsWithZeroCodeOnSuccess() throws Exception {
        try (var springApp = mockStatic(SpringApplication.class)) {
            LiquibaseMigrationRunner runner = new LiquibaseMigrationRunner(liquibase, context);

            runner.run(args);

            verify(liquibase).update("");
            var captor = org.mockito.ArgumentCaptor.forClass(ExitCodeGenerator.class);
            springApp.verify(() -> SpringApplication.exit(any(ConfigurableApplicationContext.class), captor.capture()));
            assertThat(captor.getValue().getExitCode()).isZero();
        }
    }

    @Test
    void exitsWithNonZeroCodeWhenMigrationFails() throws Exception {
        doThrow(new LiquibaseException("boom")).when(liquibase).update("");

        try (var springApp = mockStatic(SpringApplication.class)) {
            LiquibaseMigrationRunner runner = new LiquibaseMigrationRunner(liquibase, context);

            runner.run(args);

            var captor = org.mockito.ArgumentCaptor.forClass(ExitCodeGenerator.class);
            springApp.verify(() -> SpringApplication.exit(any(ConfigurableApplicationContext.class), captor.capture()));
            assertThat(captor.getValue().getExitCode()).isEqualTo(1);
        }
    }
}
