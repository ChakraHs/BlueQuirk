-- Runs once, only on FIRST initialization of an empty data volume
-- (docker-entrypoint-initdb.d). The application database + user are created by
-- the MARIADB_* environment variables; this just sets server-wide defaults.
--
-- Store timestamps in UTC; the app formats to the user's locale at the edge.
SET GLOBAL time_zone = '+00:00';
