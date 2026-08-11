# Dukkeobi portfolio deployment

This repository can currently be deployed only as an archived, read-only
portfolio shell. The complete PostGIS dump and GeoServer datasets/styles are
not present in the repository, so enabling the data features would produce
incorrect or failing results.

The safe defaults are:

- canonical Tomcat context: `/dukkeobi`
- loopback listener: `127.0.0.1:5178`
- container health URL: `http://127.0.0.1:8080/dukkeobi/`
- host-side health URL: `http://127.0.0.1:5178/dukkeobi/`
- database: `dukkeobi` on the existing `cksDB` container/network
- database role: `dukkeobi_app` (no superuser, create-role, or create-db rights)
- data endpoints unavailable until `DUKKEOBI_DATA_AVAILABLE=true`
- all non-GET/HEAD/OPTIONS requests blocked until `DUKKEOBI_READ_ONLY=false`
- OpenStreetMap background when no domain-restricted VWorld browser key is set

## One-time database preparation

Run `ops/create-database.sql` as the `cksDB` administrator with
`DUKKEOBI_DB_PASSWORD` supplied only at runtime. This creates an isolated
database/role and PostGIS extension; it does **not** invent or import the
missing project dataset.

Afterward, give the same password to the application through its untracked
`.env` file. Do not enable data or write mode until an authoritative schema,
spatial data dump, and matching GeoServer configuration have been restored and
validated.
