CREATE USER account_service_admin WITH PASSWORD 'accountserviceadmin';
CREATE DATABASE account_service_database OWNER account_service_admin;
GRANT ALL PRIVILEGES ON DATABASE account_service_database TO account_service_admin;