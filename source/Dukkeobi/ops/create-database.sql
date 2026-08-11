\set ON_ERROR_STOP on
\getenv dukkeobi_password DUKKEOBI_DB_PASSWORD

\if :{?dukkeobi_password}
  SELECT length(:'dukkeobi_password') > 0 AS password_is_set \gset
\else
  \set password_is_set false
\endif

\if :password_is_set
\else
  \echo 'DUKKEOBI_DB_PASSWORD is required'
  \quit
\endif

SELECT format(
  'CREATE ROLE dukkeobi_app LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE PASSWORD %L',
  :'dukkeobi_password'
)
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'dukkeobi_app')
\gexec

SELECT format(
  'ALTER ROLE dukkeobi_app WITH LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE PASSWORD %L',
  :'dukkeobi_password'
)
\gexec

SELECT 'CREATE DATABASE dukkeobi OWNER dukkeobi_app'
WHERE NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = 'dukkeobi')
\gexec

REVOKE CONNECT ON DATABASE dukkeobi FROM PUBLIC;
GRANT CONNECT ON DATABASE dukkeobi TO dukkeobi_app;

\connect dukkeobi
CREATE EXTENSION IF NOT EXISTS postgis;
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
ALTER SCHEMA public OWNER TO dukkeobi_app;
GRANT USAGE, CREATE ON SCHEMA public TO dukkeobi_app;
