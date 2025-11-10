CREATE USER deposit_service_admin WITH PASSWORD 'depositserviceadmin';
CREATE DATABASE deposit_service_database OWNER deposit_service_admin;
GRANT ALL PRIVILEGES ON DATABASE deposit_service_database TO deposit_service_admin;