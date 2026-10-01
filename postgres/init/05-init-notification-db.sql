\set ON_ERROR_STOP on

\getenv notification_user NOTIFICATION_DB_USER
\getenv notification_password NOTIFICATION_DB_PASSWORD

CREATE USER :"notification_user"
    WITH PASSWORD :'notification_password';

CREATE DATABASE notification_service_database
    OWNER :"notification_user";

GRANT ALL PRIVILEGES
    ON DATABASE notification_service_database
    TO :"notification_user";