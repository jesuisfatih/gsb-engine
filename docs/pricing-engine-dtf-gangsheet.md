# Pricing Engine – DTF & Gang Sheet Overview

This note captures the sector-specific considerations that drive the new pricing engine used by `/api/pricing/quote`.

## Terminology

| Term | Notes |
| ---- | ----- |
| **DTF (Direct-to-Film)** | Prints on a PET film roll. Cost mainly driven by total printed area, film/ink usage, and white-underbase coverage. |
| **Gang Sheet** | Predefined sheet (e.g. 22" × 24"). Merchants place multiple jobs on one sheet. Price is per sheet plus waste surcharge if coverage is low. |
| **Coverage Ratio** | `printedArea / availableArea`. Impacts ink usage and sheet utilisation. |
| **White Underbase** | Adds 5–15% ink cost on dark substrates. |
| **Quantity Breaks** | Many shops provide multiplier discounts when the same layout is ordered in bulk. |

## Configuration Model

Stored in `printTechnique.rules` JSON (or tenant `pricingRules`) and cast into the following discriminated union:

```ts
type DtfConfig = {
  kind: "DTF";
  currency: string;
  baseSetup: number;            // flat setup per job
  squareCmRate: number;         // cost per cm²
  minCharge: number;            // minimum invoice total
  whiteUnderbaseMarkup?: number; // percentage (e.g. 0.12 -> +12%)
  coverageAdjustments?: Array<{
    maxCoverage: number;        // 0.0 – 1.0
    multiplier: number;         // e.g. 1.15 for low coverage
  }>;
  quantityBreaks?: Array<{
    minQty: number;
    multiplier: number;         // 0.92 => 8% discount
  }>;
};

type GangSheetConfig = {
  kind: "GANG_SHEET";
  currency: string;
  sheetWidthCm: number;
  sheetHeightCm: number;
  sheetCost: number;           // base cost per full sheet
  minCoverage?: number;        // coverage below this triggers surcharge
  lowCoverageSurcharge?: number;
  wasteMultiplier?: number;    // multiplier applied if coverage < minCoverage
  quantityBreaks?: Array<{
    minSheets: number;
    sheetCost: number;         // override sheet cost
  }>;
};
```

Tenant-level `PricingRule` entries can layer on top for campaigns or surcharges (e.g. rush orders, colour palette restrictions).

## Calculation Flow

1. **Fetch context**: product, surface dimensions, technique config (`PrintTechnique.rules`), and active tenant `PricingRule`s.
2. **Baseline area**: `areaSquareCm * quantity`. For gang sheet we consider `sheetArea = sheetWidthCm × sheetHeightCm`.
3. **Technique-specific**:
   - **DTF**:
     - `base = baseSetup`.
     - `areaCost = squareCmRate × totalArea`.
     - Optional `coverageMultiplier` chosen from `coverageAdjustments`.
     - Apply white-underbase markup if requested.
     - Apply best `quantityBreak` multiplier.
     - Enforce `minCharge`.
   - **Gang Sheet**:
     - `sheetArea` and `sheetsNeeded = ceil((totalArea / coverageTarget) / sheetArea)`.
     - Determine applicable sheetCost from quantity breaks.
     - If coverage per sheet < `minCoverage`, add `lowCoverageSurcharge` or multiply with `wasteMultiplier`.
4. **Tenant rules**: iterate `PricingRule`s, apply formula (percentage/flat adjustments). Engine exposes simple `TECHNIQUE_MULTIPLIER`, `FLAT_FEE`, `RUSH_PERCENTAGE`, etc.
5. **Breakdown output**: currency, totals, unit cost, coverage %, sheets used, adjustments applied, rule audit trail.

## Why it fits the sector

- **Area-driven** pricing is standard for DTF roll media (charged per sq ft/cm). Low coverage wastes roll feed, hence multipliers.
- **Sheet-based** pricing mirrors gang sheet shops that charge per sheet and penalise under-filled sheets (waste & setup time).
- **White underbase** is a real consumable increase on dark garments.
- **Quantity breaks** and tenant rules let merchants model day-by-day promotions without redeploying code.

The service is implemented in `server/src/services/pricingEngine.ts` and consumed by `POST /api/pricing/quote`.
