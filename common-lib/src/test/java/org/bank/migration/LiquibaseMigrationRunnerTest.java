package org.bank.migration;

import liquibase.Liquibase;
import liquibase.exception.LiquibaseException;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ExitCodeGenerator;
import org.springframework.boot.SpringApplication;
import org.springframework.context.ConfigurableApplicationContext;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.mockStatic;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class LiquibaseMigrationRunnerTest {

    private final Liquibase liquibase = mock(Liquibase.class);
    private final ConfigurableApplicationContext context = mock(ConfigurableApplicationContext.class);
    private final ApplicationArguments args = mock(ApplicationArguments.class);

    @SuppressWarnings("unchecked")
    private final ObjectProvider<Liquibase> liquibaseProvider = mock(ObjectProvider.class);

    @Test
    void appliesMigrationsAndExitsWithZeroCodeOnSuccess() throws Exception {
        when(liquibaseProvider.getIfAvailable()).thenReturn(liquibase);

        try (var springApp = mockStatic(SpringApplication.class)) {
            LiquibaseMigrationRunner runner = new LiquibaseMigrationRunner(liquibaseProvider, context);

            runner.run(args);

            verify(liquibase).update("");
            var captor = org.mockito.ArgumentCaptor.forClass(ExitCodeGenerator.class);
            springApp.verify(() -> SpringApplication.exit(any(ConfigurableApplicationContext.class), captor.capture()));
            assertThat(captor.getValue().getExitCode()).isZero();
        }
    }

    @Test
    void exitsWithNonZeroCodeWhenMigrationFails() throws Exception {
        when(liquibaseProvider.getIfAvailable()).thenReturn(liquibase);
        doThrow(new LiquibaseException("boom")).when(liquibase).update("");

        try (var springApp = mockStatic(SpringApplication.class)) {
            LiquibaseMigrationRunner runner = new LiquibaseMigrationRunner(liquibaseProvider, context);

            runner.run(args);

            var captor = org.mockito.ArgumentCaptor.forClass(ExitCodeGenerator.class);
            springApp.verify(() -> SpringApplication.exit(any(ConfigurableApplicationContext.class), captor.capture()));
            assertThat(captor.getValue().getExitCode()).isEqualTo(1);
        }
    }

    @Test
    void exitsZeroWhenBootAutoConfigurationAlreadyRanTheMigration() throws Exception {
        when(liquibaseProvider.getIfAvailable()).thenReturn(null);

        try (var springApp = mockStatic(SpringApplication.class)) {
            LiquibaseMigrationRunner runner = new LiquibaseMigrationRunner(liquibaseProvider, context);

            runner.run(args);

            verify(liquibase, never()).update(anyString());
            var captor = org.mockito.ArgumentCaptor.forClass(ExitCodeGenerator.class);
            springApp.verify(() -> SpringApplication.exit(any(ConfigurableApplicationContext.class), captor.capture()));
            assertThat(captor.getValue().getExitCode()).isZero();
        }
    }
}
