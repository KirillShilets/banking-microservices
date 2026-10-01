\set ON_ERROR_STOP on

\getenv account_user ACCOUNT_DB_USER
\getenv account_password ACCOUNT_DB_PASSWORD

CREATE USER :"account_user"
    WITH PASSWORD :'account_password';

CREATE DATABASE account_service_database
    OWNER :"account_user";

GRANT ALL PRIVILEGES
    ON DATABASE account_service_database
    TO :"account_user";