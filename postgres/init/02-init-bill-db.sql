CREATE USER bill_service_admin WITH PASSWORD 'billserviceadmin';
CREATE DATABASE bill_service_database OWNER bill_service_admin;
GRANT ALL PRIVILEGES ON DATABASE bill_service_database TO bill_service_admin;