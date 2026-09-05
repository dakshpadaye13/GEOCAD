"""
GEOCAD 3D / New Veda City — SQLAlchemy ORM models.

Mirrors 001_schema.sql exactly (table names, columns, FKs). Uses
GeoAlchemy2 for geometry columns. Import Base.metadata into your
migration tool (Alembic) if you want to manage schema changes from
Python instead of raw SQL, or use these classes purely for querying
against a database already created by 001_schema.sql / 002_seed.sql.

Install:  pip install sqlalchemy geoalchemy2 psycopg2-binary --break-system-packages
"""
from __future__ import annotations

import uuid
from datetime import date, datetime

from geoalchemy2 import Geometry
from sqlalchemy import (
    CheckConstraint, Column, Date, DateTime, ForeignKey, Integer,
    Numeric, String, UniqueConstraint, func, text,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, relationship


class Base(DeclarativeBase):
    pass


def _uuid_pk():
    return Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))


def _timestamps():
    return {
        "created_at": Column(DateTime(timezone=True), nullable=False, server_default=func.now()),
        "updated_at": Column(DateTime(timezone=True), nullable=False, server_default=func.now()),
    }


class City(Base):
    __tablename__ = "cities"
    __table_args__ = {"schema": "geocad"}

    city_id = _uuid_pk()
    city_code = Column(String, nullable=False, unique=True)
    city_name = Column(String, nullable=False)
    state = Column(String, nullable=False)
    country = Column(String, nullable=False)
    boundary_geometry = Column(Geometry("MULTIPOLYGON", srid=4326))
    status = Column(String, nullable=False, server_default="active")
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())

    zones: Mapped[list["Zone"]] = relationship(back_populates="city")


class Zone(Base):
    __tablename__ = "zones"
    __table_args__ = {"schema": "geocad"}

    zone_id = _uuid_pk()
    zone_code = Column(String, nullable=False, unique=True)
    city_id = Column(UUID(as_uuid=True), ForeignKey("geocad.cities.city_id", ondelete="CASCADE"), nullable=False)
    zone_name = Column(String, nullable=False)
    zone_type = Column(String, nullable=False)
    land_use = Column(String)
    area_sq_m = Column(Numeric(16, 2))
    boundary_geometry = Column(Geometry("MULTIPOLYGON", srid=4326))
    status = Column(String, nullable=False, server_default="active")
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())

    city: Mapped[City] = relationship(back_populates="zones")
    parcels: Mapped[list["Parcel"]] = relationship(back_populates="zone")


class Parcel(Base):
    __tablename__ = "parcels"
    __table_args__ = {"schema": "geocad"}

    parcel_id = _uuid_pk()
    parcel_code = Column(String, nullable=False, unique=True)
    city_id = Column(UUID(as_uuid=True), ForeignKey("geocad.cities.city_id"), nullable=False)
    zone_id = Column(UUID(as_uuid=True), ForeignKey("geocad.zones.zone_id"), nullable=False)
    block_id = Column(String)
    survey_number = Column(String)
    ulpin = Column(String, nullable=False, unique=True)
    land_use = Column(String)
    area_sq_m = Column(Numeric(16, 2))
    perimeter_m = Column(Numeric(12, 2))
    ownership_type = Column(String)
    land_status = Column(String, nullable=False, server_default="vacant")
    centroid_lat = Column(Numeric(10, 7))
    centroid_lon = Column(Numeric(10, 7))
    boundary_geometry = Column(Geometry("POLYGON", srid=4326))
    vertex_coordinates = Column(JSONB)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())

    zone: Mapped[Zone] = relationship(back_populates="parcels")
    buildings: Mapped[list["Building"]] = relationship(back_populates="parcel")


class Building(Base):
    __tablename__ = "buildings"
    __table_args__ = {"schema": "geocad"}

    building_id = _uuid_pk()
    building_code = Column(String, nullable=False, unique=True)
    parcel_id = Column(UUID(as_uuid=True), ForeignKey("geocad.parcels.parcel_id"), nullable=False)
    building_name = Column(String, nullable=False)
    building_type = Column(String, nullable=False)
    status = Column(String, nullable=False, server_default="planned")
    number_of_floors = Column(Integer, nullable=False, server_default="0")
    basement_count = Column(Integer, nullable=False, server_default="0")
    ground_floor_height_m = Column(Numeric(5, 2))
    typical_floor_height_m = Column(Numeric(5, 2))
    total_height_m = Column(Numeric(7, 2))
    footprint_area_sq_m = Column(Numeric(14, 2))
    built_up_area_sq_m = Column(Numeric(14, 2))
    ground_elevation_m = Column(Numeric(8, 2))
    roof_height_m = Column(Numeric(7, 2))
    orientation_deg = Column(Numeric(5, 2))
    setback_front_m = Column(Numeric(5, 2), server_default="0")
    setback_rear_m = Column(Numeric(5, 2), server_default="0")
    setback_left_m = Column(Numeric(5, 2), server_default="0")
    setback_right_m = Column(Numeric(5, 2), server_default="0")
    construction_year = Column(Integer)
    occupancy_status = Column(String, nullable=False, server_default="vacant")
    building_geometry = Column(Geometry("POLYGONZ", srid=4326))
    centroid = Column(Geometry("POINTZ", srid=4326))
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())

    parcel: Mapped[Parcel] = relationship(back_populates="buildings")
    floors: Mapped[list["Floor"]] = relationship(back_populates="building")


class Floor(Base):
    __tablename__ = "floors"
    __table_args__ = (
        UniqueConstraint("building_id", "floor_number"),
        {"schema": "geocad"},
    )

    floor_id = _uuid_pk()
    floor_code = Column(String, nullable=False, unique=True)
    building_id = Column(UUID(as_uuid=True), ForeignKey("geocad.buildings.building_id", ondelete="CASCADE"), nullable=False)
    floor_number = Column(Integer, nullable=False)
    floor_label = Column(String, nullable=False)
    elevation_m = Column(Numeric(8, 2))
    floor_height_m = Column(Numeric(5, 2))
    gross_floor_area_sq_m = Column(Numeric(14, 2))
    usable_floor_area_sq_m = Column(Numeric(14, 2))
    floor_use = Column(String)
    unit_count = Column(Integer, nullable=False, server_default="0")
    status = Column(String, nullable=False, server_default="planned")
    geometry = Column(Geometry("POLYGONZ", srid=4326))
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())

    building: Mapped[Building] = relationship(back_populates="floors")
    floor_plans: Mapped[list["FloorPlan"]] = relationship(back_populates="floor")
    units: Mapped[list["Unit"]] = relationship(back_populates="floor")


class FloorPlan(Base):
    __tablename__ = "floor_plans"
    __table_args__ = (
        UniqueConstraint("floor_id", "plan_version"),
        {"schema": "geocad"},
    )

    floor_plan_id = _uuid_pk()
    floor_plan_code = Column(String, nullable=False, unique=True)
    floor_id = Column(UUID(as_uuid=True), ForeignKey("geocad.floors.floor_id", ondelete="CASCADE"), nullable=False)
    plan_version = Column(Integer, nullable=False)
    total_area_sq_m = Column(Numeric(14, 2))
    built_up_area_sq_m = Column(Numeric(14, 2))
    wall_geometry = Column(Geometry("MULTILINESTRING", srid=4326))
    door_geometry = Column(Geometry("MULTIPOINT", srid=4326))
    window_geometry = Column(Geometry("MULTIPOINT", srid=4326))
    stair_geometry = Column(Geometry("MULTIPOLYGON", srid=4326))
    lift_geometry = Column(Geometry("MULTIPOLYGON", srid=4326))
    corridor_geometry = Column(Geometry("MULTIPOLYGON", srid=4326))
    plan_file = Column(String)
    plan_image = Column(String)
    is_current = Column(Integer, nullable=False, server_default="1")  # boolean in DB
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())

    floor: Mapped[Floor] = relationship(back_populates="floor_plans")


class Unit(Base):
    __tablename__ = "units"
    __table_args__ = (
        UniqueConstraint("floor_id", "unit_number"),
        {"schema": "geocad"},
    )

    unit_id = _uuid_pk()
    unit_code = Column(String, nullable=False, unique=True)
    building_id = Column(UUID(as_uuid=True), ForeignKey("geocad.buildings.building_id"), nullable=False)
    floor_id = Column(UUID(as_uuid=True), ForeignKey("geocad.floors.floor_id"), nullable=False)
    unit_number = Column(String, nullable=False)
    unit_type = Column(String, nullable=False)
    carpet_area_sq_m = Column(Numeric(10, 2))
    built_up_area_sq_m = Column(Numeric(10, 2))
    super_built_up_area_sq_m = Column(Numeric(10, 2))
    balcony_area_sq_m = Column(Numeric(10, 2), server_default="0")
    entrance_coordinates = Column(Geometry("POINT", srid=4326))
    unit_geometry = Column(Geometry("POLYGON", srid=4326))
    orientation_deg = Column(Numeric(5, 2))
    occupancy_status = Column(String, nullable=False, server_default="vacant")
    ownership_status = Column(String, nullable=False, server_default="owned")
    property_status = Column(String, nullable=False, server_default="active")
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())

    floor: Mapped[Floor] = relationship(back_populates="units")
    rooms: Mapped[list["Room"]] = relationship(back_populates="unit")
    ownerships: Mapped[list["Ownership"]] = relationship(back_populates="unit")


class Room(Base):
    __tablename__ = "rooms"
    __table_args__ = (
        UniqueConstraint("unit_id", "room_number"),
        {"schema": "geocad"},
    )

    room_id = _uuid_pk()
    room_code = Column(String, nullable=False, unique=True)
    unit_id = Column(UUID(as_uuid=True), ForeignKey("geocad.units.unit_id", ondelete="CASCADE"), nullable=False)
    room_number = Column(String, nullable=False)
    room_type = Column(String, nullable=False)
    area_sq_m = Column(Numeric(8, 2))
    length_m = Column(Numeric(6, 2))
    width_m = Column(Numeric(6, 2))
    height_m = Column(Numeric(5, 2))
    perimeter_m = Column(Numeric(8, 2))
    floor_elevation_m = Column(Numeric(8, 2))
    ceiling_height_m = Column(Numeric(5, 2))
    centroid = Column(Geometry("POINT", srid=4326))
    geometry = Column(Geometry("POLYGON", srid=4326))
    polygon_vertices = Column(JSONB)
    door_count = Column(Integer, nullable=False, server_default="0")
    window_count = Column(Integer, nullable=False, server_default="0")
    usage_status = Column(String, nullable=False, server_default="in_use")
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())

    unit: Mapped[Unit] = relationship(back_populates="rooms")


class Owner(Base):
    __tablename__ = "owners"
    __table_args__ = {"schema": "geocad"}

    owner_id = _uuid_pk()
    owner_code = Column(String, nullable=False, unique=True)
    full_name = Column(String, nullable=False)   # fictional demo name
    owner_type = Column(String, nullable=False, server_default="individual")
    contact_email = Column(String)
    contact_phone = Column(String)
    is_synthetic = Column(Integer, nullable=False, server_default="1")  # always true in demo data
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())

    ownerships: Mapped[list["Ownership"]] = relationship(back_populates="owner")


class Ownership(Base):
    __tablename__ = "ownerships"
    __table_args__ = {"schema": "geocad"}

    ownership_id = _uuid_pk()
    ownership_code = Column(String, nullable=False, unique=True)
    unit_id = Column(UUID(as_uuid=True), ForeignKey("geocad.units.unit_id", ondelete="CASCADE"), nullable=False)
    owner_id = Column(UUID(as_uuid=True), ForeignKey("geocad.owners.owner_id"), nullable=False)
    ownership_type = Column(String, nullable=False, server_default="sole")
    share_percentage = Column(Numeric(5, 2), nullable=False, server_default="100.00")
    registration_date = Column(Date)
    valid_from = Column(Date, nullable=False, server_default=func.current_date())
    valid_to = Column(Date)
    status = Column(String, nullable=False, server_default="active")
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())

    unit: Mapped[Unit] = relationship(back_populates="ownerships")
    owner: Mapped[Owner] = relationship(back_populates="ownerships")


class Document(Base):
    """Polymorphic: property_type + property_id point at parcel / building / unit / room."""
    __tablename__ = "documents"
    __table_args__ = {"schema": "geocad"}

    document_id = _uuid_pk()
    document_code = Column(String, nullable=False, unique=True)
    property_type = Column(String, nullable=False)
    property_id = Column(UUID(as_uuid=True), nullable=False)
    document_type = Column(String, nullable=False)
    document_number = Column(String)
    issue_date = Column(Date)
    registration_date = Column(Date)
    document_url = Column(String)
    verification_status = Column(String, nullable=False, server_default="pending")
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
