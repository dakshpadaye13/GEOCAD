-- =====================================================================
-- GEOCAD 3D — New Veda City
-- 002_seed.sql
-- Procedurally generates SYNTHETIC / FICTIONAL demo data across the
-- full hierarchy: CITY -> ZONE -> PARCEL -> BUILDING -> FLOOR ->
-- FLOOR_PLAN -> UNIT -> ROOM, plus OWNERS / OWNERSHIP / DOCUMENTS.
--
-- All coordinates are an invented location and do NOT correspond to
-- any real city. All owner names are fictional placeholders — no real
-- citizen or company data is used anywhere in this file.
--
-- Run 001_schema.sql first. Idempotent-ish: safe to run once against
-- an empty schema. Re-running will fail on unique constraints unless
-- you truncate first (see bottom of file, commented out).
-- =====================================================================

SET search_path TO geocad, public;

BEGIN;

-- ---------------------------------------------------------------------
-- Helper: cut a rectangular envelope into a col x row grid cell,
-- shrunk by a gap ratio (keeps a visible margin between sibling
-- features, e.g. parcels within a zone, or rooms within a unit).
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION geocad.fn_grid_cell(
    p_xmin double precision, p_ymin double precision,
    p_xmax double precision, p_ymax double precision,
    p_cols int, p_rows int, p_col int, p_row int,
    p_gap_ratio double precision DEFAULT 0.10
) RETURNS geometry AS $$
DECLARE
    v_cell_w double precision := (p_xmax - p_xmin) / p_cols;
    v_cell_h double precision := (p_ymax - p_ymin) / p_rows;
    v_gap_x  double precision := v_cell_w * p_gap_ratio;
    v_gap_y  double precision := v_cell_h * p_gap_ratio;
BEGIN
    RETURN ST_SetSRID(ST_MakeEnvelope(
        p_xmin + p_col * v_cell_w + v_gap_x / 2.0,
        p_ymin + p_row * v_cell_h + v_gap_y / 2.0,
        p_xmin + (p_col + 1) * v_cell_w - v_gap_x / 2.0,
        p_ymin + (p_row + 1) * v_cell_h - v_gap_y / 2.0
    ), 4326);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- =====================================================================
-- MAIN SEED PROCEDURE
-- =====================================================================
DO $seed$
DECLARE
    v_city_id       UUID;
    v_city_env      geometry;

    z               RECORD;          -- current zone loop record
    v_zone_id       UUID;
    v_zone_env      geometry;

    v_parcel_env    geometry;
    v_parcel_id     UUID;
    v_parcel_code   TEXT;
    v_ulpin         TEXT;

    v_building_env  geometry;
    v_building_id   UUID;
    v_building_code TEXT;
    v_building_type TEXT;
    v_num_floors    INT;
    v_basement_ct   INT;
    v_gfh           NUMERIC;         -- ground floor height
    v_tfh           NUMERIC;         -- typical floor height
    v_total_height  NUMERIC;
    v_ground_elev   NUMERIC;
    v_status        TEXT;
    v_occ_status    TEXT;

    v_floor_id      UUID;
    v_floor_code    TEXT;
    v_floor_env     geometry;
    v_floor_elev    NUMERIC;
    v_floor_height  NUMERIC;
    v_floor_label   TEXT;

    v_unit_env      geometry;
    v_unit_id       UUID;
    v_unit_code     TEXT;
    v_unit_type     TEXT;

    v_room_env      geometry;
    v_room_types    TEXT[];
    v_room_type     TEXT;

    i INT; j INT; k INT; m INT; fl INT;
    v_num_parcels   INT;
    v_num_buildings INT;
    v_num_units     INT;
    v_num_rooms     INT;

    v_bx0 double precision; v_by0 double precision;
    v_bx1 double precision; v_by1 double precision;
    v_ux0 double precision; v_uy0 double precision;
    v_ux1 double precision; v_uy1 double precision;

    v_length_m      NUMERIC;
    v_width_m       NUMERIC;

    v_owner_ids     UUID[];
    v_company_ids   UUID[];
    v_owner_id      UUID;
    v_owner_id2     UUID;

    v_reg_date      DATE;
    v_rand          DOUBLE PRECISION;
BEGIN

    ----------------------------------------------------------------
    -- 1. CITY
    ----------------------------------------------------------------
    v_city_env := ST_SetSRID(ST_MakeEnvelope(78.860, 21.460, 78.940, 21.520), 4326);

    INSERT INTO geocad.cities (city_code, city_name, state, country, boundary_geometry, status)
    VALUES ('NVC', 'New Veda City', 'Veda Pradesh (fictional)', 'Fictionland', ST_Multi(v_city_env), 'active')
    RETURNING city_id INTO v_city_id;

    ----------------------------------------------------------------
    -- 2 & 3 & 4 & 5 & 6 & 7 & 8. ZONE -> PARCEL -> BUILDING -> FLOOR
    --    -> FLOOR_PLAN -> UNIT -> ROOM
    ----------------------------------------------------------------
    FOR z IN
        SELECT * FROM (VALUES
            ('A', 'New Veda Residential Enclave',      'residential',         78.864, 21.464, 78.892, 21.492, 4, TRUE),
            ('B', 'New Veda Central Business District', 'commercial',         78.898, 21.464, 78.918, 21.492, 3, TRUE),
            ('C', 'New Veda Mixed Use Corridor',        'mixed_use',          78.922, 21.464, 78.938, 21.492, 3, TRUE),
            ('D', 'New Veda Industrial Park',           'industrial',         78.864, 21.496, 78.896, 21.516, 2, TRUE),
            ('E', 'New Veda Green Belt',                'green_recreational', 78.900, 21.496, 78.938, 21.516, 2, FALSE)
        ) AS t(zone_letter, zone_name, zone_type, xmin, ymin, xmax, ymax, num_parcels, allow_buildings)
    LOOP
        v_zone_env := ST_SetSRID(ST_MakeEnvelope(z.xmin, z.ymin, z.xmax, z.ymax), 4326);

        INSERT INTO geocad.zones (zone_code, city_id, zone_name, zone_type, land_use, area_sq_m, boundary_geometry, status)
        VALUES (
            'NVC-Z' || z.zone_letter, v_city_id, z.zone_name, z.zone_type,
            initcap(replace(z.zone_type, '_', ' ')),
            ROUND(ST_Area(v_zone_env::geography)::numeric, 2),
            ST_Multi(v_zone_env), 'active'
        )
        RETURNING zone_id INTO v_zone_id;

        v_num_parcels := z.num_parcels;

        ----------------------------------------------------------------
        -- PARCELS within this zone
        ----------------------------------------------------------------
        FOR i IN 0..v_num_parcels - 1 LOOP
            v_parcel_env := geocad.fn_grid_cell(z.xmin, z.ymin, z.xmax, z.ymax, v_num_parcels, 1, i, 0, 0.15);
            v_parcel_code := 'NVC-Z' || z.zone_letter || '-P' || lpad((i + 1)::text, 4, '0');
            v_ulpin := 'NV' || upper(substr(md5(v_parcel_code || v_zone_id::text), 1, 14)); -- fictional 16-char ULPIN-style code

            INSERT INTO geocad.parcels (
                parcel_code, city_id, zone_id, block_id, survey_number, ulpin,
                land_use, area_sq_m, perimeter_m, ownership_type, land_status,
                centroid_lat, centroid_lon, boundary_geometry, vertex_coordinates
            ) VALUES (
                v_parcel_code, v_city_id, v_zone_id,
                'BLK-' || z.zone_letter || (i + 1),
                'SY-' || (1000 + i) || '/' || z.zone_letter,
                v_ulpin,
                initcap(replace(z.zone_type, '_', ' ')),
                ROUND(ST_Area(v_parcel_env::geography)::numeric, 2),
                ROUND(ST_Perimeter(v_parcel_env::geography)::numeric, 2),
                (ARRAY['freehold','leasehold','government'])[1 + (i % 3)],
                CASE WHEN z.allow_buildings THEN 'developed' ELSE 'reserved' END,
                ROUND(ST_Y(ST_Centroid(v_parcel_env))::numeric, 7),
                ROUND(ST_X(ST_Centroid(v_parcel_env))::numeric, 7),
                v_parcel_env,
                (ST_AsGeoJSON(v_parcel_env)::jsonb -> 'coordinates')
            )
            RETURNING parcel_id INTO v_parcel_id;

            -- ULPIN certificate for every parcel (land registry record)
            INSERT INTO geocad.documents (document_code, property_type, property_id, document_type,
                                           document_number, issue_date, registration_date, document_url, verification_status)
            VALUES (
                'DOC-' || v_parcel_code || '-ULPIN', 'parcel', v_parcel_id, 'ulpin_certificate',
                v_ulpin, DATE '2019-04-01' + (i * 30), DATE '2019-04-15' + (i * 30),
                'https://demo.geocad3d.example/docs/' || lower(v_ulpin) || '.pdf', 'verified'
            );

            CONTINUE WHEN NOT z.allow_buildings; -- green belt parcels: no buildings, skip to next parcel

            ----------------------------------------------------------------
            -- BUILDINGS within this parcel
            ----------------------------------------------------------------
            v_num_buildings := CASE WHEN z.zone_type = 'industrial' THEN 1 ELSE 1 + (i % 2) END;
            v_building_type := z.zone_type;
            IF v_building_type NOT IN ('residential','commercial','mixed_use','industrial') THEN
                v_building_type := 'institutional';
            END IF;

            v_bx0 := ST_XMin(v_parcel_env); v_by0 := ST_YMin(v_parcel_env);
            v_bx1 := ST_XMax(v_parcel_env); v_by1 := ST_YMax(v_parcel_env);

            FOR j IN 0..v_num_buildings - 1 LOOP
                v_building_env := geocad.fn_grid_cell(v_bx0, v_by0, v_bx1, v_by1, v_num_buildings, 1, j, 0, 0.30);
                v_building_code := v_parcel_code || '-B' || lpad((j + 1)::text, 2, '0');

                v_num_floors := CASE v_building_type
                                    WHEN 'residential' THEN 4 + ((i + j) % 6)   -- 4..9
                                    WHEN 'commercial'  THEN 8 + ((i + j) % 8)   -- 8..15
                                    WHEN 'mixed_use'   THEN 6 + ((i + j) % 6)   -- 6..11
                                    WHEN 'industrial'  THEN 1 + ((i + j) % 2)   -- 1..2
                                    ELSE 3
                                 END;
                v_basement_ct := CASE WHEN v_building_type IN ('commercial','mixed_use') THEN 1 ELSE 0 END;
                v_gfh := CASE WHEN v_building_type IN ('commercial','mixed_use') THEN 4.20 ELSE 3.20 END;
                v_tfh := CASE v_building_type
                            WHEN 'residential' THEN 3.00
                            WHEN 'commercial'  THEN 3.60
                            WHEN 'mixed_use'   THEN 3.30
                            WHEN 'industrial'  THEN 6.00
                            ELSE 3.00
                         END;
                v_total_height := v_gfh + v_tfh * (v_num_floors - 1);
                v_ground_elev  := 284.50 + ((i + j) % 5) * 0.40;
                v_status       := CASE WHEN z.zone_type = 'industrial' AND j = v_num_buildings - 1
                                        THEN 'under_construction' ELSE 'completed' END;
                v_occ_status   := CASE WHEN v_status = 'completed' THEN 'partially_occupied' ELSE 'vacant' END;

                INSERT INTO geocad.buildings (
                    building_code, parcel_id, building_name, building_type, status,
                    number_of_floors, basement_count, ground_floor_height_m, typical_floor_height_m,
                    total_height_m, footprint_area_sq_m, built_up_area_sq_m, ground_elevation_m,
                    roof_height_m, orientation_deg, setback_front_m, setback_rear_m,
                    setback_left_m, setback_right_m, construction_year, occupancy_status,
                    building_geometry, centroid
                ) VALUES (
                    v_building_code, v_parcel_id,
                    initcap(replace(z.zone_type,'_',' ')) || ' Tower ' || v_building_code,
                    v_building_type, v_status,
                    v_num_floors, v_basement_ct, v_gfh, v_tfh, v_total_height,
                    ROUND(ST_Area(v_building_env::geography)::numeric, 2),
                    ROUND((ST_Area(v_building_env::geography) * v_num_floors * 0.85)::numeric, 2),
                    v_ground_elev,
                    v_total_height + 1.20,
                    ((i * 37 + j * 53) % 360),
                    CASE v_building_type WHEN 'residential' THEN 3.0 ELSE 5.0 END,
                    CASE v_building_type WHEN 'residential' THEN 2.0 ELSE 3.0 END,
                    1.50, 1.50,
                    2005 + ((i + j) % 18),
                    v_occ_status,
                    ST_Force3D(v_building_env, v_ground_elev),
                    ST_Force3D(ST_Centroid(v_building_env), v_ground_elev + v_total_height / 2.0)
                )
                RETURNING building_id INTO v_building_id;

                IF v_status = 'completed' THEN
                    INSERT INTO geocad.documents (document_code, property_type, property_id, document_type,
                                                   document_number, issue_date, registration_date, document_url, verification_status)
                    VALUES
                    ('DOC-' || v_building_code || '-BPA', 'building', v_building_id, 'building_plan_approval',
                     'BPA-' || v_building_code, DATE '2020-01-10', DATE '2020-01-20',
                     'https://demo.geocad3d.example/docs/' || lower(v_building_code) || '-bpa.pdf', 'verified'),
                    ('DOC-' || v_building_code || '-OC', 'building', v_building_id, 'occupancy_certificate',
                     'OC-' || v_building_code, DATE '2022-06-01', DATE '2022-06-10',
                     'https://demo.geocad3d.example/docs/' || lower(v_building_code) || '-oc.pdf', 'verified');
                END IF;

                v_ux0 := ST_XMin(v_building_env); v_uy0 := ST_YMin(v_building_env);
                v_ux1 := ST_XMax(v_building_env); v_uy1 := ST_YMax(v_building_env);

                ----------------------------------------------------------------
                -- FLOORS within this building (basements negative, ground = 0)
                ----------------------------------------------------------------
                FOR fl IN (-v_basement_ct)..(v_num_floors - 1) LOOP
                    v_floor_height := CASE WHEN fl = 0 THEN v_gfh ELSE v_tfh END;
                    v_floor_elev   := CASE
                                          WHEN fl = 0 THEN v_ground_elev
                                          WHEN fl > 0 THEN v_ground_elev + v_gfh + v_tfh * (fl - 1)
                                          ELSE v_ground_elev + v_tfh * fl
                                       END;
                    v_floor_label  := CASE
                                          WHEN fl < 0 THEN 'Basement ' || abs(fl)
                                          WHEN fl = 0 THEN 'Ground Floor'
                                          ELSE 'Floor ' || fl
                                       END;
                    v_floor_code   := v_building_code || '-F' || lpad((fl + 100)::text, 3, '0');
                    v_floor_env    := ST_Force3D(v_building_env, v_floor_elev);

                    INSERT INTO geocad.floors (
                        floor_code, building_id, floor_number, floor_label, elevation_m,
                        floor_height_m, gross_floor_area_sq_m, usable_floor_area_sq_m,
                        floor_use, unit_count, status, geometry
                    ) VALUES (
                        v_floor_code, v_building_id, fl, v_floor_label, v_floor_elev,
                        v_floor_height,
                        ROUND(ST_Area(v_building_env::geography)::numeric, 2),
                        ROUND((ST_Area(v_building_env::geography) * 0.82)::numeric, 2),
                        v_building_type, 0,
                        CASE WHEN v_status = 'completed' THEN 'occupied' ELSE 'constructed' END,
                        v_floor_env
                    )
                    RETURNING floor_id INTO v_floor_id;

                    INSERT INTO geocad.floor_plans (
                        floor_plan_code, floor_id, plan_version, total_area_sq_m, built_up_area_sq_m,
                        wall_geometry, door_geometry, window_geometry, stair_geometry, lift_geometry,
                        corridor_geometry, plan_file, plan_image, is_current
                    ) VALUES (
                        v_floor_code || '-FP1', v_floor_id, 1,
                        ROUND(ST_Area(v_building_env::geography)::numeric, 2),
                        ROUND((ST_Area(v_building_env::geography) * 0.85)::numeric, 2),
                        ST_Multi(ST_Boundary(v_building_env)),
                        ST_Multi(ST_Centroid(geocad.fn_grid_cell(v_ux0, v_uy0, v_ux1, v_uy1, 6, 1, 0, 0, 0.5))),
                        ST_Multi(ST_Centroid(geocad.fn_grid_cell(v_ux0, v_uy0, v_ux1, v_uy1, 6, 1, 5, 0, 0.5))),
                        ST_Multi(geocad.fn_grid_cell(v_ux0, v_uy0, v_ux1, v_uy1, 6, 4, 0, 0, 0.30)),
                        ST_Multi(geocad.fn_grid_cell(v_ux0, v_uy0, v_ux1, v_uy1, 6, 4, 1, 0, 0.30)),
                        ST_Multi(geocad.fn_grid_cell(v_ux0, v_uy0, v_ux1, v_uy1, 6, 1, 2, 0, 0.85)),
                        'https://demo.geocad3d.example/plans/' || lower(v_floor_code) || '.dxf',
                        'https://demo.geocad3d.example/plans/' || lower(v_floor_code) || '.png',
                        TRUE
                    );

                    ----------------------------------------------------------------
                    -- UNITS within this floor
                    ----------------------------------------------------------------
                    IF fl < 0 THEN
                        v_num_units := 1; -- basement = parking/services, modeled as one "other" unit
                    ELSIF v_building_type = 'residential' THEN
                        v_num_units := 2 + ((fl + i) % 3);           -- 2..4
                    ELSIF v_building_type = 'commercial' THEN
                        v_num_units := 3 + (fl % 4);                 -- 3..6
                    ELSIF v_building_type = 'mixed_use' THEN
                        v_num_units := CASE WHEN fl = 0 THEN 4 ELSE 2 + (fl % 3) END;
                    ELSE -- industrial
                        v_num_units := 1;
                    END IF;

                    FOR k IN 0..v_num_units - 1 LOOP
                        v_unit_env  := geocad.fn_grid_cell(v_ux0, v_uy0, v_ux1, v_uy1, v_num_units, 1, k, 0, 0.12);
                        v_unit_code := v_floor_code || '-U' || lpad((k + 1)::text, 2, '0');

                        v_unit_type := CASE
                            WHEN fl < 0 THEN 'other'
                            WHEN v_building_type = 'residential' THEN
                                (ARRAY['studio','1bhk','2bhk','3bhk'])[1 + ((i + j + fl + k) % 4)]
                            WHEN v_building_type = 'commercial' THEN
                                (ARRAY['office','shop'])[1 + ((i + j + fl + k) % 2)]
                            WHEN v_building_type = 'mixed_use' THEN
                                CASE WHEN fl = 0 THEN 'shop'
                                     ELSE (ARRAY['office','2bhk','1bhk'])[1 + ((i + j + fl + k) % 3)]
                                END
                            ELSE 'warehouse'
                        END;

                        INSERT INTO geocad.units (
                            unit_code, building_id, floor_id, unit_number, unit_type,
                            carpet_area_sq_m, built_up_area_sq_m, super_built_up_area_sq_m, balcony_area_sq_m,
                            entrance_coordinates, unit_geometry, orientation_deg,
                            occupancy_status, ownership_status, property_status
                        ) VALUES (
                            v_unit_code, v_building_id, v_floor_id,
                            (fl + 100)::text || '-' || lpad((k + 1)::text, 2, '0'),
                            v_unit_type,
                            ROUND((ST_Area(v_unit_env::geography) * 0.88)::numeric, 2),
                            ROUND((ST_Area(v_unit_env::geography) * 0.88 / 0.85)::numeric, 2),
                            ROUND((ST_Area(v_unit_env::geography) * 0.88 / 0.85 / 0.85)::numeric, 2),
                            CASE WHEN v_unit_type LIKE '%bhk' OR v_unit_type = 'studio'
                                 THEN ROUND((ST_Area(v_unit_env::geography) * 0.05)::numeric, 2) ELSE 0 END,
                            ST_Centroid(v_unit_env),
                            v_unit_env,
                            ((i * 37 + j * 53) % 360),
                            (ARRAY['vacant','occupied','rented'])[1 + (abs(i + j + fl + k) % 3)],
                            CASE WHEN abs(i + j + fl + k) % 5 = 0 THEN 'rented'
                                 WHEN abs(i + j + fl + k) % 7 = 0 THEN 'under_registration'
                                 ELSE 'owned' END,
                            'active'
                        )
                        RETURNING unit_id INTO v_unit_id;

                        ----------------------------------------------------------------
                        -- ROOMS within this unit
                        ----------------------------------------------------------------
                        v_room_types := CASE v_unit_type
                            WHEN 'studio'    THEN ARRAY['bedroom','kitchen','bathroom']
                            WHEN '1bhk'      THEN ARRAY['bedroom','living_room','kitchen','bathroom']
                            WHEN '2bhk'      THEN ARRAY['bedroom','bedroom','living_room','kitchen','bathroom']
                            WHEN '3bhk'      THEN ARRAY['bedroom','bedroom','bedroom','living_room','kitchen','bathroom']
                            WHEN '4bhk'      THEN ARRAY['bedroom','bedroom','bedroom','bedroom','living_room','dining','kitchen','bathroom']
                            WHEN 'office'    THEN ARRAY['hall','study','bathroom']
                            WHEN 'shop'      THEN ARRAY['hall','storage']
                            WHEN 'warehouse' THEN ARRAY['storage','storage','hall']
                            ELSE ARRAY['hall']
                        END;
                        v_num_rooms := array_length(v_room_types, 1);

                        FOR m IN 1..v_num_rooms LOOP
                            v_room_type := v_room_types[m];
                            v_room_env  := geocad.fn_grid_cell(
                                ST_XMin(v_unit_env), ST_YMin(v_unit_env),
                                ST_XMax(v_unit_env), ST_YMax(v_unit_env),
                                1, v_num_rooms, 0, m - 1, 0.10
                            );
                            v_length_m := ST_Distance(
                                ST_SetSRID(ST_MakePoint(ST_XMin(v_room_env), ST_YMin(v_room_env)), 4326)::geography,
                                ST_SetSRID(ST_MakePoint(ST_XMax(v_room_env), ST_YMin(v_room_env)), 4326)::geography
                            );
                            v_width_m := ST_Distance(
                                ST_SetSRID(ST_MakePoint(ST_XMin(v_room_env), ST_YMin(v_room_env)), 4326)::geography,
                                ST_SetSRID(ST_MakePoint(ST_XMin(v_room_env), ST_YMax(v_room_env)), 4326)::geography
                            );

                            INSERT INTO geocad.rooms (
                                room_code, unit_id, room_number, room_type, area_sq_m,
                                length_m, width_m, height_m, perimeter_m,
                                floor_elevation_m, ceiling_height_m, centroid, geometry,
                                polygon_vertices, door_count, window_count, usage_status
                            ) VALUES (
                                v_unit_code || '-R' || lpad(m::text, 2, '0'),
                                v_unit_id, lpad(m::text, 2, '0'), v_room_type,
                                ROUND((v_length_m * v_width_m)::numeric, 2),
                                ROUND(v_length_m::numeric, 2), ROUND(v_width_m::numeric, 2),
                                v_floor_height, ROUND((2 * (v_length_m + v_width_m))::numeric, 2),
                                v_floor_elev, ROUND((v_floor_height - 0.30)::numeric, 2),
                                ST_Centroid(v_room_env), v_room_env,
                                (ST_AsGeoJSON(v_room_env)::jsonb -> 'coordinates'),
                                CASE WHEN v_room_type IN ('hall','living_room') THEN 2 ELSE 1 END,
                                CASE WHEN v_room_type IN ('bedroom','living_room','study','hall') THEN 1 ELSE 0 END,
                                'in_use'
                            );
                        END LOOP; -- rooms

                        -- Sale deed for owned/rented/registration units (not common 'other' spaces)
                        IF v_unit_type <> 'other' THEN
                            INSERT INTO geocad.documents (document_code, property_type, property_id, document_type,
                                                           document_number, issue_date, registration_date, document_url, verification_status)
                            VALUES (
                                'DOC-' || v_unit_code || '-SD', 'unit', v_unit_id, 'sale_deed',
                                'SD-' || v_unit_code, DATE '2021-03-01' + (abs(i+j+fl+k) % 700),
                                DATE '2021-03-15' + (abs(i+j+fl+k) % 700),
                                'https://demo.geocad3d.example/docs/' || lower(v_unit_code) || '-sd.pdf',
                                CASE WHEN abs(i+j+fl+k) % 6 = 0 THEN 'pending' ELSE 'verified' END
                            );
                        END IF;

                    END LOOP; -- units

                    UPDATE geocad.floors SET unit_count = v_num_units WHERE floor_id = v_floor_id;

                END LOOP; -- floors
            END LOOP; -- buildings
        END LOOP; -- parcels
    END LOOP; -- zones

    ----------------------------------------------------------------
    -- 9. OWNERS (fictional demo persons & companies only)
    ----------------------------------------------------------------
    INSERT INTO geocad.owners (owner_code, full_name, owner_type, contact_email, contact_phone, is_synthetic)
    SELECT
        'OWN-' || lpad(gs::text, 4, '0'),
        (ARRAY['Aarav','Vivaan','Aditya','Ishaan','Kabir','Ananya','Diya','Meera','Sara','Zara',
               'Rohan','Nikhil','Priya','Kavya','Arjun','Rahul','Neha','Pooja','Sanjay','Anita',
               'Devika','Manav','Tara','Yash','Riya','Kunal','Simran','Aryan','Naina','Vikram'])[1 + (gs % 30)]
        || ' ' ||
        (ARRAY['Mehta','Shah','Kapoor','Verma','Nair','Iyer','Reddy','Joshi','Malhotra','Chatterjee',
               'Bose','Sinha','Rao','Kulkarni','Desai','Agarwal','Bhatt','Menon','Pillai','Kaur'])[1 + (gs % 20)],
        'individual',
        'demo.owner' || gs || '@example-mail.test',
        '+00-000-000-' || lpad((1000 + gs)::text, 4, '0'),
        TRUE
    FROM generate_series(1, 40) gs;

    INSERT INTO geocad.owners (owner_code, full_name, owner_type, contact_email, contact_phone, is_synthetic)
    SELECT
        'OWN-' || lpad((40 + gs)::text, 4, '0'),
        (ARRAY['Veda Realty Pvt Ltd','NorthGate Ventures LLP','Zenith Commercial Holdings',
               'BluePeak Properties Ltd','Skyline Trust Co','Meridian Estates Pvt Ltd',
               'Fictional Capital Holdings','Newveda Business Park Ltd'])[gs],
        'company',
        'demo.corp' || gs || '@example-mail.test',
        '+00-000-100-' || lpad((1000 + gs)::text, 4, '0'),
        TRUE
    FROM generate_series(1, 8) gs;

    SELECT array_agg(owner_id) INTO v_owner_ids FROM geocad.owners WHERE owner_type = 'individual';
    SELECT array_agg(owner_id) INTO v_company_ids FROM geocad.owners WHERE owner_type = 'company';

    ----------------------------------------------------------------
    -- 10. OWNERSHIPS — assign owners to eligible units
    ----------------------------------------------------------------
    FOR v_unit_id, v_unit_code, v_unit_type IN
        SELECT unit_id, unit_code, unit_type FROM geocad.units WHERE unit_type <> 'other'
    LOOP
        v_rand := random();
        v_reg_date := DATE '2020-01-01' + (floor(random() * 1500))::int;

        IF v_unit_type IN ('office','shop','warehouse') THEN
            v_owner_id := v_company_ids[1 + floor(random() * array_length(v_company_ids,1))::int];
            INSERT INTO geocad.ownerships (ownership_code, unit_id, owner_id, ownership_type,
                                            share_percentage, registration_date, valid_from, status)
            VALUES ('OWNS-' || v_unit_code, v_unit_id, v_owner_id, 'sole', 100.00, v_reg_date, v_reg_date, 'active');
        ELSIF v_rand < 0.25 THEN
            -- joint ownership: two individuals, 60/40 split
            v_owner_id  := v_owner_ids[1 + floor(random() * array_length(v_owner_ids,1))::int];
            v_owner_id2 := v_owner_ids[1 + floor(random() * array_length(v_owner_ids,1))::int];
            INSERT INTO geocad.ownerships (ownership_code, unit_id, owner_id, ownership_type,
                                            share_percentage, registration_date, valid_from, status)
            VALUES ('OWNS-' || v_unit_code || '-A', v_unit_id, v_owner_id, 'joint', 60.00, v_reg_date, v_reg_date, 'active');
            IF v_owner_id2 <> v_owner_id THEN
                INSERT INTO geocad.ownerships (ownership_code, unit_id, owner_id, ownership_type,
                                                share_percentage, registration_date, valid_from, status)
                VALUES ('OWNS-' || v_unit_code || '-B', v_unit_id, v_owner_id2, 'joint', 40.00, v_reg_date, v_reg_date, 'active');
            END IF;
        ELSE
            v_owner_id := v_owner_ids[1 + floor(random() * array_length(v_owner_ids,1))::int];
            INSERT INTO geocad.ownerships (ownership_code, unit_id, owner_id, ownership_type,
                                            share_percentage, registration_date, valid_from, status)
            VALUES ('OWNS-' || v_unit_code, v_unit_id, v_owner_id, 'sole', 100.00, v_reg_date, v_reg_date, 'active');
        END IF;
    END LOOP;

END;
$seed$;

COMMIT;

-- ---------------------------------------------------------------------
-- To wipe and re-seed from scratch, run (in this order) and re-run
-- 002_seed.sql:
--
-- TRUNCATE TABLE geocad.documents, geocad.ownerships, geocad.owners,
--   geocad.rooms, geocad.units, geocad.floor_plans, geocad.floors,
--   geocad.buildings, geocad.parcels, geocad.zones, geocad.cities
--   RESTART IDENTITY CASCADE;
-- ---------------------------------------------------------------------
