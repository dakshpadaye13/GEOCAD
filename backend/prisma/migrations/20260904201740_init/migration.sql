-- CreateTable
CREATE TABLE "Building" (
    "id" TEXT NOT NULL,
    "buildingId" TEXT NOT NULL,
    "buildingName" TEXT NOT NULL,
    "assetType" TEXT NOT NULL DEFAULT 'building',
    "status" TEXT NOT NULL DEFAULT 'EXISTING',
    "currentVersionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Building_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BuildingVersion" (
    "id" TEXT NOT NULL,
    "buildingId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'EXISTING',
    "totalFloors" INTEGER,
    "totalBasements" INTEGER,
    "description" TEXT,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveTo" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BuildingVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Floor" (
    "id" TEXT NOT NULL,
    "floorId" TEXT NOT NULL,
    "buildingVersionId" TEXT NOT NULL,
    "floorNumber" INTEGER NOT NULL,
    "floorName" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'EXISTING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Floor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Unit" (
    "id" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "floorId" TEXT NOT NULL,
    "unitNumber" TEXT NOT NULL,
    "unitType" TEXT,
    "bhk" DOUBLE PRECISION,
    "areaSqFt" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT 'EXISTING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Unit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Parking" (
    "id" TEXT NOT NULL,
    "parkingId" TEXT NOT NULL,
    "buildingVersionId" TEXT NOT NULL,
    "parkingNumber" TEXT NOT NULL,
    "parkingType" TEXT,
    "floorNumber" INTEGER,
    "areaSqFt" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT 'EXISTING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Parking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Basement" (
    "id" TEXT NOT NULL,
    "basementId" TEXT NOT NULL,
    "buildingVersionId" TEXT NOT NULL,
    "basementNumber" INTEGER NOT NULL,
    "basementName" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'EXISTING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Basement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Building_buildingId_key" ON "Building"("buildingId");

-- CreateIndex
CREATE UNIQUE INDEX "Building_currentVersionId_key" ON "Building"("currentVersionId");

-- CreateIndex
CREATE INDEX "Building_buildingId_idx" ON "Building"("buildingId");

-- CreateIndex
CREATE INDEX "Building_status_idx" ON "Building"("status");

-- CreateIndex
CREATE INDEX "BuildingVersion_buildingId_idx" ON "BuildingVersion"("buildingId");

-- CreateIndex
CREATE INDEX "BuildingVersion_status_idx" ON "BuildingVersion"("status");

-- CreateIndex
CREATE UNIQUE INDEX "BuildingVersion_buildingId_versionNumber_key" ON "BuildingVersion"("buildingId", "versionNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Floor_floorId_key" ON "Floor"("floorId");

-- CreateIndex
CREATE INDEX "Floor_floorId_idx" ON "Floor"("floorId");

-- CreateIndex
CREATE INDEX "Floor_buildingVersionId_idx" ON "Floor"("buildingVersionId");

-- CreateIndex
CREATE UNIQUE INDEX "Unit_unitId_key" ON "Unit"("unitId");

-- CreateIndex
CREATE INDEX "Unit_unitId_idx" ON "Unit"("unitId");

-- CreateIndex
CREATE INDEX "Unit_floorId_idx" ON "Unit"("floorId");

-- CreateIndex
CREATE UNIQUE INDEX "Parking_parkingId_key" ON "Parking"("parkingId");

-- CreateIndex
CREATE INDEX "Parking_parkingId_idx" ON "Parking"("parkingId");

-- CreateIndex
CREATE INDEX "Parking_buildingVersionId_idx" ON "Parking"("buildingVersionId");

-- CreateIndex
CREATE UNIQUE INDEX "Basement_basementId_key" ON "Basement"("basementId");

-- CreateIndex
CREATE INDEX "Basement_basementId_idx" ON "Basement"("basementId");

-- CreateIndex
CREATE INDEX "Basement_buildingVersionId_idx" ON "Basement"("buildingVersionId");

-- AddForeignKey
ALTER TABLE "Building" ADD CONSTRAINT "Building_currentVersionId_fkey" FOREIGN KEY ("currentVersionId") REFERENCES "BuildingVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuildingVersion" ADD CONSTRAINT "BuildingVersion_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "Building"("buildingId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Floor" ADD CONSTRAINT "Floor_buildingVersionId_fkey" FOREIGN KEY ("buildingVersionId") REFERENCES "BuildingVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Unit" ADD CONSTRAINT "Unit_floorId_fkey" FOREIGN KEY ("floorId") REFERENCES "Floor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Parking" ADD CONSTRAINT "Parking_buildingVersionId_fkey" FOREIGN KEY ("buildingVersionId") REFERENCES "BuildingVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Basement" ADD CONSTRAINT "Basement_buildingVersionId_fkey" FOREIGN KEY ("buildingVersionId") REFERENCES "BuildingVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
