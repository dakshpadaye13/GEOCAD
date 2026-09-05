-- =====================================================================
-- GEOCAD 3D — New Veda City
-- 003_example_queries.sql — sample queries the application can reuse
-- =====================================================================
SET search_path TO geocad, public;

-- 1. Full drill-down: city -> zone -> parcel -> building -> floor -> unit -> room
--    (counts, useful for a dashboard)
SELECT
    ci.city_name,
    count(DISTINCT z.zone_id)  AS zones,
    count(DISTINCT p.parcel_id) AS parcels,
    count(DISTINCT b.building_id) AS buildings,
    count(DISTINCT f.floor_id) AS floors,
    count(DISTINCT u.unit_id) AS units,
    count(DISTINCT r.room_id) AS rooms
FROM geocad.cities ci
LEFT JOIN geocad.zones z ON z.city_id = ci.city_id
LEFT JOIN geocad.parcels p ON p.zone_id = z.zone_id
LEFT JOIN geocad.buildings b ON b.parcel_id = p.parcel_id
LEFT JOIN geocad.floors f ON f.building_id = b.building_id
LEFT JOIN geocad.units u ON u.floor_id = f.floor_id
LEFT JOIN geocad.rooms r ON r.unit_id = u.unit_id
GROUP BY ci.city_name;

-- 2. Look up a parcel (and everything built on it) by ULPIN
SELECT p.ulpin, p.parcel_code, b.building_code, b.building_name,
       b.number_of_floors, b.status
FROM geocad.parcels p
LEFT JOIN geocad.buildings b ON b.parcel_id = p.parcel_id
WHERE p.ulpin = (SELECT ulpin FROM geocad.parcels LIMIT 1);

-- 3. Export a building and all its floors/units/rooms as GeoJSON
--    (feed directly into a 3D web viewer / CesiumJS / deck.gl)
SELECT jsonb_build_object(
    'type', 'FeatureCollection',
    'features', jsonb_agg(feature)
) AS geojson
FROM (
    SELECT jsonb_build_object(
        'type', 'Feature',
        'geometry', ST_AsGeoJSON(r.geometry)::jsonb,
        'properties', jsonb_build_object(
            'room_id', r.room_id, 'room_type', r.room_type,
            'unit_code', u.unit_code, 'floor_label', f.floor_label,
            'building_code', b.building_code
        )
    ) AS feature
    FROM geocad.rooms r
    JOIN geocad.units u ON u.unit_id = r.unit_id
    JOIN geocad.floors f ON f.floor_id = u.floor_id
    JOIN geocad.buildings b ON b.building_id = f.building_id
    WHERE b.building_code = (SELECT building_code FROM geocad.buildings LIMIT 1)
) sub;

-- 4. Current owners of every unit in a given building
SELECT * FROM geocad.vw_current_ownership
WHERE building_name = (SELECT building_name FROM geocad.buildings LIMIT 1);

-- 5. Units with no verified sale deed (compliance / follow-up worklist)
SELECT u.unit_code, u.unit_type, u.ownership_status
FROM geocad.units u
LEFT JOIN geocad.documents d
       ON d.property_type = 'unit' AND d.property_id = u.unit_id
      AND d.document_type = 'sale_deed' AND d.verification_status = 'verified'
WHERE u.unit_type <> 'other' AND d.document_id IS NULL;

-- 6. Vacant units by zone (occupancy dashboard)
SELECT z.zone_name, count(*) AS vacant_units
FROM geocad.units u
JOIN geocad.buildings b ON b.building_id = u.building_id
JOIN geocad.parcels p ON p.parcel_id = b.parcel_id
JOIN geocad.zones z ON z.zone_id = p.zone_id
WHERE u.occupancy_status = 'vacant'
GROUP BY z.zone_name
ORDER BY vacant_units DESC;

-- 7. All floors of a building ordered bottom (basement) to top, with plan links
SELECT f.floor_label, f.elevation_m, f.status, fp.plan_image
FROM geocad.floors f
JOIN geocad.floor_plans fp ON fp.floor_id = f.floor_id AND fp.is_current
WHERE f.building_id = (SELECT building_id FROM geocad.buildings LIMIT 1)
ORDER BY f.floor_number;

-- 8. ML feature export: one row per unit with structural + ownership features
SELECT
    u.unit_id, u.unit_type, u.carpet_area_sq_m, u.built_up_area_sq_m,
    u.super_built_up_area_sq_m, u.occupancy_status, u.ownership_status,
    b.building_type, b.construction_year, b.total_height_m,
    f.floor_number, z.zone_type,
    ST_Y(u.entrance_coordinates) AS lat, ST_X(u.entrance_coordinates) AS lon,
    (SELECT count(*) FROM geocad.rooms r WHERE r.unit_id = u.unit_id) AS room_count,
    (SELECT count(*) FROM geocad.ownerships os WHERE os.unit_id = u.unit_id AND os.status = 'active') AS active_owners
FROM geocad.units u
JOIN geocad.buildings b ON b.building_id = u.building_id
JOIN geocad.floors f ON f.floor_id = u.floor_id
JOIN geocad.parcels p ON p.parcel_id = b.parcel_id
JOIN geocad.zones z ON z.zone_id = p.zone_id;
