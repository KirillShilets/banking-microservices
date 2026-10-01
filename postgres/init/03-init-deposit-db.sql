\set ON_ERROR_STOP on

\getenv deposit_user DEPOSIT_DB_USER
\getenv deposit_password DEPOSIT_DB_PASSWORD

CREATE USER :"deposit_user"
    WITH PASSWORD :'deposit_password';

CREATE DATABASE deposit_service_database
    OWNER :"deposit_user";

GRANT ALL PRIVILEGES
    ON DATABASE deposit_service_database
    TO :"deposit_user";