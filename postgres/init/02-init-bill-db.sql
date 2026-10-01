\set ON_ERROR_STOP on

\getenv bill_user BILL_DB_USER
\getenv bill_password BILL_DB_PASSWORD

CREATE USER :"bill_user"
    WITH PASSWORD :'bill_password';

CREATE DATABASE bill_service_database
    OWNER :"bill_user";

GRANT ALL PRIVILEGES
    ON DATABASE bill_service_database
    TO :"bill_user";