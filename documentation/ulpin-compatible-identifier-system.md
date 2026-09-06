# GEOCAD ULPIN-Compatible Spatial Identifier System

## Overview
GEOCAD implements a structured, ULPIN-compatible (Unique Land Parcel Identification Number) spatial identification system. This system allows hierarchical spatial objects (Buildings, Wings, Floors, Units, Parking, Basements) to be uniquely identified using a human-readable, tokenized string format validated by an ISO standard check character.

**Important Privacy Rule**: The identifier is designed to be purely spatial. It encodes geographical and architectural boundaries but *never* encodes ownership or sensitive information.

## Schema Architecture
The GEOCAD database retains its permanent identity structure (UUIDs) to maintain relationships even during full building reconstructions. The ULPIN layer is added non-destructively:
- `Building.displayIdentifier`
- `Building.parcelBase`
- `Floor.displayIdentifier`
- `Unit.displayIdentifier`
- `Parking.displayIdentifier`
- `Basement.displayIdentifier`

### Identifier History
Identifiers are designed to be retired if spatial geometries change (e.g., merging two units). An `IdentifierHistory` table tracks:
- `permanentRecordId`: The unchanging UUID.
- `displayIdentifier`: The retired or active ULPIN string.
- `status`: `ACTIVE` or `RETIRED`.
- `supersededBy`: Points to the new identifier if a space was merged/split.

## Syntax Rules
Format: `[Parcel Base]-[Modifiers]-[Check Character]`
Tokens are separated by hyphens (`-`). 

- **Base Token**: The government-issued ULPIN or parcel identifier (e.g., `CS707P`). GEOCAD adds extensions after this base.
- **Modifiers**:
  - `W`, `T`, `BLK`: Wing, Tower, or Block (e.g., `WA`, `T1`, `BLK3`).
  - `S`, `B`, `P`, `M`, `R`, `G`: Storey identifiers (Storey, Basement, Podium, Mezzanine, Roof, Ground). Example: `S21` (21st Floor), `B02` (Basement 2).
  - `U`: Unit / Room (e.g., `U03`, `U101`).
  - `K`: Parking Space (e.g., `K147`).
  - Space Types (Optional 3-letter codes): `PRV` (Private), `COM` (Common), `RTL` (Retail), `PRK` (Parking).
  - Rights Levels: `UTL` (Utility), `AIR` (Air Rights).

- **Check Character**: The final token is a single character calculated using the **ISO 7064 MOD 37,36** algorithm.

## Resolution API
**Endpoint**: `GET /api/resolve/:displayIdentifier`
- Accepts an identifier string.
- Validates the ISO 7064 MOD 37,36 check character.
- Parses the semantic meaning of the tokens.
- Searches GEOCAD spatial tables (Building, Floor, Unit, Basement, Parking).
- Returns spatial hierarchy metadata without ownership details.
- Returns HTTP 410 if the identifier exists in `IdentifierHistory` as `RETIRED`.
