package org.bank.config.annotation;

import org.bank.config.PostgresTestConfiguration;
import org.springframework.context.annotation.Import;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

@Retention(RetentionPolicy.RUNTIME)
@Target(ElementType.TYPE)
@Import(PostgresTestConfiguration.class)
public @interface EnablePostgresTestConfiguration {
}
