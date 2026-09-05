-- =====================================================================
-- GEOCAD 3D — New Veda City
-- 001_schema.sql
-- Hierarchy: CITY -> ZONE -> PARCEL -> BUILDING -> FLOOR -> UNIT -> ROOM
-- ULPIN lives on PARCEL only (one ULPIN per land parcel, never per room).
-- Target: PostgreSQL 14+ with PostGIS 3+
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- 0. EXTENSIONS
-- ---------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "pgcrypto";   -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "postgis";    -- geometry types

-- ---------------------------------------------------------------------
-- 0.1 SCHEMA
-- ---------------------------------------------------------------------
CREATE SCHEMA IF NOT EXISTS geocad;
SET search_path TO geocad, public;

-- ---------------------------------------------------------------------
-- 0.2 SHARED TRIGGER: auto-maintain updated_at
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION geocad.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at := now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------------
-- 0.3 SHARED SEQUENCE HELPER for human-readable codes
-- (PKs are UUIDs; *_code columns are the "friendly" unique IDs used by
--  GIS/field/ops teams, e.g. NVC, NVC-ZA, NVC-ZA-P003, ...)
-- ---------------------------------------------------------------------

-- =====================================================================
-- 1. CITY
-- =====================================================================
CREATE TABLE geocad.cities (
    city_id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    city_code          TEXT NOT NULL UNIQUE,                 -- e.g. 'NVC'
    city_name          TEXT NOT NULL,
    state              TEXT NOT NULL,
    country            TEXT NOT NULL,
    boundary_geometry  geometry(MultiPolygon, 4326),
    status             TEXT NOT NULL DEFAULT 'active'
                          CHECK (status IN ('active','inactive','planned')),
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_cities_updated_at BEFORE UPDATE ON geocad.cities
    FOR EACH ROW EXECUTE FUNCTION geocad.set_updated_at();
CREATE INDEX idx_cities_geom ON geocad.cities USING GIST (boundary_geometry);

-- =====================================================================
-- 2. ZONE
-- =====================================================================
CREATE TABLE geocad.zones (
    zone_id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    zone_code          TEXT NOT NULL UNIQUE,                 -- e.g. 'NVC-ZA'
    city_id            UUID NOT NULL REFERENCES geocad.cities(city_id) ON DELETE CASCADE,
    zone_name          TEXT NOT NULL,
    zone_type          TEXT NOT NULL
                          CHECK (zone_type IN (
                              'residential','commercial','industrial',
                              'mixed_use','institutional',
                              'green_recreational','agricultural',
                              'special_economic'
                          )),
    land_use           TEXT,
    area_sq_m          NUMERIC(16,2) CHECK (area_sq_m >= 0),
    boundary_geometry  geometry(MultiPolygon, 4326),
    status             TEXT NOT NULL DEFAULT 'active'
                          CHECK (status IN ('active','inactive','planned')),
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_zones_updated_at BEFORE UPDATE ON geocad.zones
    FOR EACH ROW EXECUTE FUNCTION geocad.set_updated_at();
CREATE INDEX idx_zones_city_id ON geocad.zones(city_id);
CREATE INDEX idx_zones_geom ON geocad.zones USING GIST (boundary_geometry);

-- =====================================================================
-- 3. PARCEL  (ULPIN lives HERE, once per land parcel)
-- =====================================================================
CREATE TABLE geocad.parcels (
    parcel_id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parcel_code         TEXT NOT NULL UNIQUE,                -- e.g. 'NVC-ZA-P0003'
    city_id             UUID NOT NULL REFERENCES geocad.cities(city_id) ON DELETE RESTRICT,
    zone_id             UUID NOT NULL REFERENCES geocad.zones(zone_id) ON DELETE RESTRICT,
    block_id            TEXT,
    survey_number       TEXT,
    ulpin               TEXT NOT NULL UNIQUE,                -- one ULPIN per parcel, ever
    land_use            TEXT,
    area_sq_m           NUMERIC(16,2) CHECK (area_sq_m >= 0),
    perimeter_m         NUMERIC(12,2) CHECK (perimeter_m >= 0),
    ownership_type      TEXT CHECK (ownership_type IN
                            ('freehold','leasehold','government','trust','disputed')),
    land_status         TEXT NOT NULL DEFAULT 'vacant'
                          CHECK (land_status IN
                            ('vacant','under_construction','developed','disputed','reserved')),
    centroid_lat        NUMERIC(10,7) CHECK (centroid_lat BETWEEN -90 AND 90),
    centroid_lon        NUMERIC(10,7) CHECK (centroid_lon BETWEEN -180 AND 180),
    boundary_geometry   geometry(Polygon, 4326),
    vertex_coordinates  JSONB,                               -- raw GeoJSON-style vertex array
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
    -- Note: zone.city_id == parcel.city_id is enforced by trigger below,
    -- since a plain CHECK constraint cannot reference another table.
);
CREATE TRIGGER trg_parcels_updated_at BEFORE UPDATE ON geocad.parcels
    FOR EACH ROW EXECUTE FUNCTION geocad.set_updated_at();
CREATE INDEX idx_parcels_city_id ON geocad.parcels(city_id);
CREATE INDEX idx_parcels_zone_id ON geocad.parcels(zone_id);
CREATE INDEX idx_parcels_ulpin   ON geocad.parcels(ulpin);
CREATE INDEX idx_parcels_geom    ON geocad.parcels USING GIST (boundary_geometry);

-- Trigger: zone.city_id must equal parcel.city_id (referential sanity across hierarchy)
CREATE OR REPLACE FUNCTION geocad.check_parcel_zone_city()
RETURNS TRIGGER AS $$
DECLARE v_zone_city UUID;
BEGIN
    SELECT city_id INTO v_zone_city FROM geocad.zones WHERE zone_id = NEW.zone_id;
    IF v_zone_city IS NULL OR v_zone_city <> NEW.city_id THEN
        RAISE EXCEPTION 'Parcel city_id (%) does not match zone''s city_id (%)', NEW.city_id, v_zone_city;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER trg_parcels_zone_city_check
    BEFORE INSERT OR UPDATE ON geocad.parcels
    FOR EACH ROW EXECUTE FUNCTION geocad.check_parcel_zone_city();

-- =====================================================================
-- 4. BUILDING
-- =====================================================================
CREATE TABLE geocad.buildings (
    building_id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    building_code           TEXT NOT NULL UNIQUE,            -- e.g. 'NVC-ZA-P0003-B01'
    parcel_id               UUID NOT NULL REFERENCES geocad.parcels(parcel_id) ON DELETE RESTRICT,
    building_name           TEXT NOT NULL,
    building_type           TEXT NOT NULL
                              CHECK (building_type IN
                                ('residential','commercial','mixed_use',
                                 'institutional','industrial','government')),
    status                  TEXT NOT NULL DEFAULT 'planned'
                              CHECK (status IN
                                ('planned','under_construction','completed','demolished')),
    number_of_floors        INT NOT NULL DEFAULT 0 CHECK (number_of_floors >= 0),
    basement_count          INT NOT NULL DEFAULT 0 CHECK (basement_count >= 0),
    ground_floor_height_m   NUMERIC(5,2) CHECK (ground_floor_height_m > 0),
    typical_floor_height_m  NUMERIC(5,2) CHECK (typical_floor_height_m > 0),
    total_height_m          NUMERIC(7,2) CHECK (total_height_m >= 0),
    footprint_area_sq_m     NUMERIC(14,2) CHECK (footprint_area_sq_m >= 0),
    built_up_area_sq_m      NUMERIC(14,2) CHECK (built_up_area_sq_m >= 0),
    ground_elevation_m      NUMERIC(8,2),
    roof_height_m           NUMERIC(7,2),
    orientation_deg         NUMERIC(5,2) CHECK (orientation_deg BETWEEN 0 AND 360),
    setback_front_m         NUMERIC(5,2) DEFAULT 0,
    setback_rear_m          NUMERIC(5,2) DEFAULT 0,
    setback_left_m          NUMERIC(5,2) DEFAULT 0,
    setback_right_m         NUMERIC(5,2) DEFAULT 0,
    construction_year       INT CHECK (construction_year BETWEEN 1800 AND 2100),
    occupancy_status        TEXT NOT NULL DEFAULT 'vacant'
                              CHECK (occupancy_status IN
                                ('vacant','partially_occupied','fully_occupied')),
    building_geometry       geometry(PolygonZ, 4326),
    centroid                geometry(PointZ, 4326),
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_buildings_updated_at BEFORE UPDATE ON geocad.buildings
    FOR EACH ROW EXECUTE FUNCTION geocad.set_updated_at();
CREATE INDEX idx_buildings_parcel_id ON geocad.buildings(parcel_id);
CREATE INDEX idx_buildings_geom ON geocad.buildings USING GIST (building_geometry);
CREATE INDEX idx_buildings_centroid ON geocad.buildings USING GIST (centroid);

-- =====================================================================
-- 5. FLOOR
-- =====================================================================
CREATE TABLE geocad.floors (
    floor_id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    floor_code               TEXT NOT NULL UNIQUE,           -- e.g. 'NVC-ZA-P0003-B01-F03'
    building_id              UUID NOT NULL REFERENCES geocad.buildings(building_id) ON DELETE CASCADE,
    floor_number             INT NOT NULL,                   -- negative = basement, 0 = ground
    floor_label              TEXT NOT NULL,                  -- 'Ground', 'Basement 1', 'Floor 3'
    elevation_m              NUMERIC(8,2),
    floor_height_m           NUMERIC(5,2) CHECK (floor_height_m > 0),
    gross_floor_area_sq_m    NUMERIC(14,2) CHECK (gross_floor_area_sq_m >= 0),
    usable_floor_area_sq_m   NUMERIC(14,2) CHECK (usable_floor_area_sq_m >= 0),
    floor_use                TEXT,
    unit_count               INT NOT NULL DEFAULT 0 CHECK (unit_count >= 0),
    status                   TEXT NOT NULL DEFAULT 'planned'
                               CHECK (status IN ('planned','constructed','occupied','vacant')),
    geometry                 geometry(PolygonZ, 4326),
    created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (building_id, floor_number)
);
CREATE TRIGGER trg_floors_updated_at BEFORE UPDATE ON geocad.floors
    FOR EACH ROW EXECUTE FUNCTION geocad.set_updated_at();
CREATE INDEX idx_floors_building_id ON geocad.floors(building_id);
CREATE INDEX idx_floors_geom ON geocad.floors USING GIST (geometry);

-- =====================================================================
-- 6. FLOOR_PLAN (versioned)
-- =====================================================================
CREATE TABLE geocad.floor_plans (
    floor_plan_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    floor_plan_code     TEXT NOT NULL UNIQUE,
    floor_id            UUID NOT NULL REFERENCES geocad.floors(floor_id) ON DELETE CASCADE,
    plan_version        INT NOT NULL CHECK (plan_version > 0),
    total_area_sq_m     NUMERIC(14,2) CHECK (total_area_sq_m >= 0),
    built_up_area_sq_m  NUMERIC(14,2) CHECK (built_up_area_sq_m >= 0),
    wall_geometry       geometry(MultiLineString, 4326),
    door_geometry       geometry(MultiPoint, 4326),
    window_geometry     geometry(MultiPoint, 4326),
    stair_geometry      geometry(MultiPolygon, 4326),
    lift_geometry       geometry(MultiPolygon, 4326),
    corridor_geometry   geometry(MultiPolygon, 4326),
    plan_file           TEXT,                                -- URL/path to CAD/DXF/DWG source
    plan_image          TEXT,                                -- URL/path to rendered raster
    is_current          BOOLEAN NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (floor_id, plan_version)
);
CREATE TRIGGER trg_floor_plans_updated_at BEFORE UPDATE ON geocad.floor_plans
    FOR EACH ROW EXECUTE FUNCTION geocad.set_updated_at();
CREATE INDEX idx_floor_plans_floor_id ON geocad.floor_plans(floor_id);

-- Ensure only one "current" plan version per floor
CREATE UNIQUE INDEX uq_floor_plans_current
    ON geocad.floor_plans(floor_id) WHERE is_current;

-- =====================================================================
-- 7. UNIT / FLAT
-- =====================================================================
CREATE TABLE geocad.units (
    unit_id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    unit_code                  TEXT NOT NULL UNIQUE,         -- e.g. 'NVC-ZA-P0003-B01-F03-U02'
    building_id                UUID NOT NULL REFERENCES geocad.buildings(building_id) ON DELETE RESTRICT,
    floor_id                   UUID NOT NULL REFERENCES geocad.floors(floor_id) ON DELETE RESTRICT,
    unit_number                TEXT NOT NULL,
    unit_type                  TEXT NOT NULL
                                 CHECK (unit_type IN
                                   ('studio','1bhk','2bhk','3bhk','4bhk',
                                    'office','shop','warehouse','other')),
    carpet_area_sq_m           NUMERIC(10,2) CHECK (carpet_area_sq_m >= 0),
    built_up_area_sq_m         NUMERIC(10,2) CHECK (built_up_area_sq_m >= 0),
    super_built_up_area_sq_m   NUMERIC(10,2) CHECK (super_built_up_area_sq_m >= 0),
    balcony_area_sq_m          NUMERIC(10,2) DEFAULT 0 CHECK (balcony_area_sq_m >= 0),
    entrance_coordinates       geometry(Point, 4326),
    unit_geometry               geometry(Polygon, 4326),
    orientation_deg             NUMERIC(5,2) CHECK (orientation_deg BETWEEN 0 AND 360),
    occupancy_status             TEXT NOT NULL DEFAULT 'vacant'
                                 CHECK (occupancy_status IN ('vacant','occupied','rented')),
    ownership_status            TEXT NOT NULL DEFAULT 'owned'
                                 CHECK (ownership_status IN
                                   ('owned','rented','disputed','under_registration')),
    property_status              TEXT NOT NULL DEFAULT 'active'
                                 CHECK (property_status IN
                                   ('active','inactive','under_construction','demolished')),
    created_at                   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at                   TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (floor_id, unit_number)
);
CREATE TRIGGER trg_units_updated_at BEFORE UPDATE ON geocad.units
    FOR EACH ROW EXECUTE FUNCTION geocad.set_updated_at();
CREATE INDEX idx_units_building_id ON geocad.units(building_id);
CREATE INDEX idx_units_floor_id ON geocad.units(floor_id);
CREATE INDEX idx_units_geom ON geocad.units USING GIST (unit_geometry);

-- Trigger: floor.building_id must equal unit.building_id
CREATE OR REPLACE FUNCTION geocad.check_unit_floor_building()
RETURNS TRIGGER AS $$
DECLARE v_floor_building UUID;
BEGIN
    SELECT building_id INTO v_floor_building FROM geocad.floors WHERE floor_id = NEW.floor_id;
    IF v_floor_building IS NULL OR v_floor_building <> NEW.building_id THEN
        RAISE EXCEPTION 'Unit building_id (%) does not match floor''s building_id (%)', NEW.building_id, v_floor_building;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER trg_units_floor_building_check
    BEFORE INSERT OR UPDATE ON geocad.units
    FOR EACH ROW EXECUTE FUNCTION geocad.check_unit_floor_building();

-- =====================================================================
-- 8. ROOM
-- =====================================================================
CREATE TABLE geocad.rooms (
    room_id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_code           TEXT NOT NULL UNIQUE,               -- e.g. 'NVC-ZA-P0003-B01-F03-U02-R01'
    unit_id             UUID NOT NULL REFERENCES geocad.units(unit_id) ON DELETE CASCADE,
    room_number         TEXT NOT NULL,
    room_type           TEXT NOT NULL
                          CHECK (room_type IN
                            ('bedroom','living_room','kitchen','bathroom',
                             'balcony','study','storage','dining','hall','other')),
    area_sq_m           NUMERIC(8,2) CHECK (area_sq_m >= 0),
    length_m            NUMERIC(6,2) CHECK (length_m >= 0),
    width_m             NUMERIC(6,2) CHECK (width_m >= 0),
    height_m            NUMERIC(5,2) CHECK (height_m >= 0),
    perimeter_m         NUMERIC(8,2) CHECK (perimeter_m >= 0),
    floor_elevation_m   NUMERIC(8,2),
    ceiling_height_m    NUMERIC(5,2),
    centroid            geometry(Point, 4326),
    geometry            geometry(Polygon, 4326),
    polygon_vertices    JSONB,
    door_count          INT NOT NULL DEFAULT 0 CHECK (door_count >= 0),
    window_count        INT NOT NULL DEFAULT 0 CHECK (window_count >= 0),
    usage_status        TEXT NOT NULL DEFAULT 'in_use'
                          CHECK (usage_status IN ('in_use','vacant','under_renovation')),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (unit_id, room_number)
);
CREATE TRIGGER trg_rooms_updated_at BEFORE UPDATE ON geocad.rooms
    FOR EACH ROW EXECUTE FUNCTION geocad.set_updated_at();
CREATE INDEX idx_rooms_unit_id ON geocad.rooms(unit_id);
CREATE INDEX idx_rooms_geom ON geocad.rooms USING GIST (geometry);

-- =====================================================================
-- 9. OWNER + OWNERSHIP  (all synthetic/fictional persons & entities)
-- =====================================================================
CREATE TABLE geocad.owners (
    owner_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_code      TEXT NOT NULL UNIQUE,                    -- e.g. 'OWN-000001'
    full_name       TEXT NOT NULL,                            -- FICTIONAL demo name only
    owner_type      TEXT NOT NULL DEFAULT 'individual'
                      CHECK (owner_type IN ('individual','company','government','trust')),
    contact_email   TEXT,
    contact_phone   TEXT,
    is_synthetic    BOOLEAN NOT NULL DEFAULT TRUE,            -- always TRUE: demo data flag
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_owners_updated_at BEFORE UPDATE ON geocad.owners
    FOR EACH ROW EXECUTE FUNCTION geocad.set_updated_at();

CREATE TABLE geocad.ownerships (
    ownership_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ownership_code     TEXT NOT NULL UNIQUE,
    unit_id            UUID NOT NULL REFERENCES geocad.units(unit_id) ON DELETE CASCADE,
    owner_id           UUID NOT NULL REFERENCES geocad.owners(owner_id) ON DELETE RESTRICT,
    ownership_type     TEXT NOT NULL DEFAULT 'sole'
                         CHECK (ownership_type IN ('sole','joint','leasehold','inherited')),
    share_percentage   NUMERIC(5,2) NOT NULL DEFAULT 100.00
                         CHECK (share_percentage > 0 AND share_percentage <= 100),
    registration_date  DATE,
    valid_from         DATE NOT NULL DEFAULT CURRENT_DATE,
    valid_to           DATE,
    status             TEXT NOT NULL DEFAULT 'active'
                         CHECK (status IN ('active','transferred','cancelled','pending')),
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (valid_to IS NULL OR valid_to >= valid_from)
);
CREATE TRIGGER trg_ownerships_updated_at BEFORE UPDATE ON geocad.ownerships
    FOR EACH ROW EXECUTE FUNCTION geocad.set_updated_at();
CREATE INDEX idx_ownerships_unit_id ON geocad.ownerships(unit_id);
CREATE INDEX idx_ownerships_owner_id ON geocad.ownerships(owner_id);

-- Only one ACTIVE ownership share-set should sum to <= 100% per unit.
-- Enforced at application layer / via periodic check; a simple guard trigger:
CREATE OR REPLACE FUNCTION geocad.check_ownership_share()
RETURNS TRIGGER AS $$
DECLARE v_total NUMERIC;
BEGIN
    SELECT COALESCE(SUM(share_percentage), 0) INTO v_total
    FROM geocad.ownerships
    WHERE unit_id = NEW.unit_id
      AND status = 'active'
      AND ownership_id <> NEW.ownership_id;
    IF NEW.status = 'active' AND (v_total + NEW.share_percentage) > 100.01 THEN
        RAISE EXCEPTION 'Total active ownership share for unit % would exceed 100%% (currently %, adding %)',
            NEW.unit_id, v_total, NEW.share_percentage;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER trg_ownerships_share_check
    BEFORE INSERT OR UPDATE ON geocad.ownerships
    FOR EACH ROW EXECUTE FUNCTION geocad.check_ownership_share();

-- =====================================================================
-- 10. DOCUMENT (polymorphic: attaches to parcel, building, unit, or room)
-- =====================================================================
CREATE TABLE geocad.documents (
    document_id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_code         TEXT NOT NULL UNIQUE,
    property_type         TEXT NOT NULL
                            CHECK (property_type IN ('parcel','building','unit','room')),
    property_id           UUID NOT NULL,                    -- polymorphic FK, validated by trigger
    document_type         TEXT NOT NULL
                            CHECK (document_type IN (
                                'sale_deed','khata','property_tax_receipt',
                                'building_plan_approval','occupancy_certificate',
                                'ulpin_certificate','mutation_record',
                                'lease_agreement','other'
                            )),
    document_number       TEXT,
    issue_date            DATE,
    registration_date     DATE,
    document_url          TEXT,
    verification_status   TEXT NOT NULL DEFAULT 'pending'
                            CHECK (verification_status IN
                              ('verified','pending','rejected','expired')),
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_documents_updated_at BEFORE UPDATE ON geocad.documents
    FOR EACH ROW EXECUTE FUNCTION geocad.set_updated_at();
CREATE INDEX idx_documents_property ON geocad.documents(property_type, property_id);

-- Validate the polymorphic property_id actually exists in the referenced table
CREATE OR REPLACE FUNCTION geocad.check_document_property()
RETURNS TRIGGER AS $$
DECLARE v_exists BOOLEAN;
BEGIN
    IF NEW.property_type = 'parcel' THEN
        SELECT EXISTS(SELECT 1 FROM geocad.parcels WHERE parcel_id = NEW.property_id) INTO v_exists;
    ELSIF NEW.property_type = 'building' THEN
        SELECT EXISTS(SELECT 1 FROM geocad.buildings WHERE building_id = NEW.property_id) INTO v_exists;
    ELSIF NEW.property_type = 'unit' THEN
        SELECT EXISTS(SELECT 1 FROM geocad.units WHERE unit_id = NEW.property_id) INTO v_exists;
    ELSIF NEW.property_type = 'room' THEN
        SELECT EXISTS(SELECT 1 FROM geocad.rooms WHERE room_id = NEW.property_id) INTO v_exists;
    ELSE
        v_exists := FALSE;
    END IF;

    IF NOT v_exists THEN
        RAISE EXCEPTION 'Document.property_id (%) does not exist in table for property_type=%',
            NEW.property_id, NEW.property_type;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER trg_documents_property_check
    BEFORE INSERT OR UPDATE ON geocad.documents
    FOR EACH ROW EXECUTE FUNCTION geocad.check_document_property();

-- =====================================================================
-- 11. CONVENIENCE VIEWS for GIS / 3D visualization & ML feature export
-- =====================================================================

-- Full vertical hierarchy path, one row per room (leaf), with every
-- ancestor id/name and every geometry column, ready for 3D tile export.
CREATE OR REPLACE VIEW geocad.vw_property_hierarchy AS
SELECT
    ci.city_id, ci.city_name,
    z.zone_id, z.zone_name, z.zone_type,
    p.parcel_id, p.ulpin, p.parcel_code,
    b.building_id, b.building_name, b.building_type,
    f.floor_id, f.floor_number, f.floor_label,
    u.unit_id, u.unit_number, u.unit_type,
    r.room_id, r.room_number, r.room_type,
    ci.boundary_geometry AS city_geom,
    z.boundary_geometry  AS zone_geom,
    p.boundary_geometry  AS parcel_geom,
    b.building_geometry  AS building_geom,
    f.geometry           AS floor_geom,
    u.unit_geometry       AS unit_geom,
    r.geometry            AS room_geom
FROM geocad.rooms r
JOIN geocad.units u     ON u.unit_id = r.unit_id
JOIN geocad.floors f    ON f.floor_id = u.floor_id
JOIN geocad.buildings b ON b.building_id = u.building_id
JOIN geocad.parcels p   ON p.parcel_id = b.parcel_id
JOIN geocad.zones z     ON z.zone_id = p.zone_id
JOIN geocad.cities ci   ON ci.city_id = z.city_id;

-- Current ownership snapshot per unit, with parcel ULPIN for land-registry lookups
CREATE OR REPLACE VIEW geocad.vw_current_ownership AS
SELECT
    u.unit_id, u.unit_code, u.unit_number,
    b.building_name, p.ulpin, p.parcel_code,
    o.owner_id, o.full_name, o.owner_type,
    os.share_percentage, os.ownership_type, os.registration_date, os.status
FROM geocad.ownerships os
JOIN geocad.units u     ON u.unit_id = os.unit_id
JOIN geocad.buildings b ON b.building_id = u.building_id
JOIN geocad.parcels p   ON p.parcel_id = b.parcel_id
JOIN geocad.owners o    ON o.owner_id = os.owner_id
WHERE os.status = 'active';

COMMIT;
