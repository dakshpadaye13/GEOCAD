# GEOCAD 3D — New Veda City Database

A PostgreSQL + PostGIS schema and synthetic seed dataset for the full
property hierarchy:

```
CITY → ZONE → PARCEL (ULPIN) → BUILDING → FLOOR → FLOOR_PLAN
                                          ↳ UNIT → ROOM
                                                 ↳ OWNERSHIP → OWNER
PARCEL / BUILDING / UNIT / ROOM → DOCUMENT (polymorphic)
```

**All data is synthetic.** New Veda City, its coordinates, ULPINs, owner
names, and documents are fictional and generated for demo/testing
purposes only — no real citizen, company, or land-registry data is used.

## Files

| File | Purpose |
|---|---|
| `001_schema.sql` | Full DDL — tables, PKs/FKs, checks, indexes, triggers, cross-hierarchy integrity triggers, GIS indexes, convenience views. |
| `002_seed.sql` | Procedurally generates the synthetic dataset (5 zones, 14 parcels, ~17 buildings, ~100 floors, ~300 units, ~1,200 rooms, 48 owners, ownerships, documents). |
| `003_example_queries.sql` | Ready-to-use queries: hierarchy counts, ULPIN lookup, GeoJSON export for 3D viewers, ownership reports, ML feature export. |
| `models.py` | SQLAlchemy + GeoAlchemy2 ORM models mirroring the schema 1:1, for the application layer. |

## Prerequisites

- PostgreSQL 14+
- PostGIS 3+ extension available on the server
- `pgcrypto` extension (for `gen_random_uuid()`) — created automatically by the schema script

## Setup

```bash
createdb geocad3d
psql -d geocad3d -f 001_schema.sql
psql -d geocad3d -f 002_seed.sql
```

Everything lives in the `geocad` schema (not `public`), so it's safe to
install alongside other apps in the same database.

To wipe and reseed, truncate the tables (command is included, commented
out, at the bottom of `002_seed.sql`) and re-run the seed script.

## Design notes

- **ULPIN discipline**: `ulpin` is a `UNIQUE NOT NULL` column on
  `parcels` only. No other table has a ULPIN column — buildings,
  floors, units and rooms are all linked back to their parcel's ULPIN
  through foreign keys (`building.parcel_id → parcel.ulpin`), never by
  duplicating the value.
- **Human-readable codes**: every entity has a UUID primary key *and* a
  short unique `*_code` (e.g. `NVC-ZA-P0003-B01-F03-U02-R01`) that
  encodes its position in the hierarchy — useful for GIS layer naming,
  URLs, and support tickets, without exposing UUIDs to end users.
- **Cross-hierarchy integrity**: beyond plain foreign keys, triggers
  enforce that a parcel's `zone_id` actually belongs to its `city_id`,
  and a unit's `floor_id` actually belongs to its `building_id`, so the
  hierarchy can never become inconsistent even if the wrong FK is
  passed in from the application.
- **GIS-ready**: every spatial level (parcel, building, floor, unit,
  room) carries a PostGIS `geometry` column (SRID 4326) plus GIST
  indexes. Buildings and floors use `PolygonZ`/`PointZ` to carry
  elevation for 3D rendering; parcels/units/rooms are 2D footprints
  with separate elevation/height columns. `vertex_coordinates` /
  `polygon_vertices` JSONB columns give a ready-to-consume raw vertex
  array for front-end 3D engines that don't want to parse WKB/WKT.
- **Versioned floor plans**: `floor_plans` has a `(floor_id,
  plan_version)` unique constraint and an `is_current` flag (partial
  unique index guarantees exactly one current plan per floor), so you
  can keep full plan history as buildings are renovated.
- **Polymorphic documents**: `documents.property_type` +
  `property_id` can point at a parcel, building, unit, or room. A
  trigger validates the referenced row actually exists in the right
  table (Postgres can't do a normal FK across multiple target tables).
- **Ownership shares**: a trigger guards that the sum of `active`
  ownership shares for any one unit never exceeds 100%, so joint
  ownership records stay consistent.
- **Scalability / future work**: schema is normalized and indexed for
  growth — add a `building_versions`/`digital_twin_snapshots` table if
  you need full 3D-model version history, a `sensor_readings` table
  keyed by `room_id` for IoT/ML features, or partition `rooms`/`units`
  by `building_id` once the dataset is large. The `vw_property_hierarchy`
  view is a good starting point for a materialized view once query
  volume grows.

## Seed data summary (approximate)

- 1 city — **New Veda City**
- 5 zones — residential, commercial, mixed-use, industrial, green belt
- 14 parcels, each with a unique fictional ULPIN
- ~17 buildings across residential towers, a CBD, a mixed-use corridor, and an industrial park
- ~100 floors (including basements for commercial/mixed-use buildings)
- ~300 units (studios through 4BHK, offices, shops, warehouses)
- ~1,200 rooms with dimensions derived from their actual polygon geometry
- 48 fictional owners (40 individuals, 8 companies) and matching ownership records
- ULPIN certificates, building plan approvals, occupancy certificates, and sale deeds for the appropriate entities

## Caveats

This was authored without a live PostGIS instance to execute against
(sandboxed environment with no database or network access). The SQL
has been checked carefully for syntax and logical consistency, but
**run it on a disposable/test database first** and report back if
anything needs adjusting — happy to iterate.
