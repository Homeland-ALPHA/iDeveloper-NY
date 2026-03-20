// Developer Deal Scoring Engine
// Scores properties on how attractive they are for acquisition + demolish + rebuild
// All constants are now driven by UserConfig — no hardcoded values

import type { UserConfig, DealCriteria } from "../shared/schema";

interface RawProperty {
  borough?: string | null;
  block?: number | null;
  lot?: number | null;
  zipcode?: number | null;
  address?: string | null;
  zoneDist1?: string | null;
  zoneDist2?: string | null;
  zoneDist3?: string | null;
  zoneDist4?: string | null;
  overlay1?: string | null;
  overlay2?: string | null;
  ownerType?: string | null;
  ownerName?: string | null;
  lotarea?: number | null;
  bldgarea?: number | null;
  comarea?: number | null;
  resarea?: number | null;
  numfloors?: number | null;
  unitsres?: number | null;
  unitstotal?: number | null;
  lotfront?: number | null;
  lotdepth?: number | null;
  bldgfront?: number | null;
  bldgdepth?: number | null;
  yearbuilt?: number | null;
  yearalter1?: number | null;
  yearalter2?: number | null;
  histdist?: string | null;
  landmark?: string | null;
  builtfar?: number | null;
  residfar?: number | null;
  actualLotArea?: number | null;
  buildingArea?: number | null;
  lotCoverage?: number | null;
  builtFarPct?: number | null;
  efficiency?: number | null;
  potentialUnits?: number | null;
  dealSignal?: string | null;
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

function normalize(val: number, min: number, max: number): number {
  if (max === min) return 0.5;
  return clamp((val - min) / (max - min), 0, 1);
}

/**
 * Score a property using the user's config — all financial assumptions,
 * scoring weights, premium zones, and lot sweet-spot come from `config`.
 */
export function scoreProperty(prop: RawProperty, config: UserConfig) {
  const lotarea = prop.lotarea || prop.actualLotArea || 0;
  const bldgarea = prop.bldgarea || 0;
  const builtfar = prop.builtfar || 0;
  const residfar = prop.residfar || 0;
  const potentialUnits = prop.potentialUnits || 0;
  const yearbuilt = prop.yearbuilt || 0;
  const ownerType = prop.ownerType || '';
  const zone = prop.zoneDist1 || '';
  const landmark = prop.landmark;
  const histdist = prop.histdist;

  const isProtected = !!(landmark || histdist);

  // Build premium-zone Set from config
  const premiumZones = new Set(config.premiumZones);

  // Build land-cost lookup from config
  const landCostMap: Record<string, number> = {};
  for (const o of config.landCostOverrides) {
    landCostMap[o.zone] = o.costPerSF;
  }

  // === SCORING COMPONENTS (each 0–100) ===

  // 1. FAR Utilization Gap
  let farUtilization = 0;
  if (residfar > 0) {
    const farPctUsed = builtfar / residfar;
    farUtilization = normalize(1 - farPctUsed, 0, 1) * 100;
  }

  // 2. Unit Potential
  let unitPotential = 0;
  if (potentialUnits > 0) {
    unitPotential = normalize(Math.log10(potentialUnits + 1), 0, Math.log10(200)) * 100;
  }

  // 3. Lot Size Sweet Spot (from config)
  const ssMin = config.lotSizeSweetSpotMin;
  const ssMax = config.lotSizeSweetSpotMax;
  let lotSizeScore = 0;
  if (lotarea > 0) {
    if (lotarea >= ssMin && lotarea <= ssMax) {
      lotSizeScore = 100;
    } else if (lotarea >= ssMin / 2 && lotarea < ssMin) {
      lotSizeScore = normalize(lotarea, ssMin / 2, ssMin) * 100;
    } else if (lotarea > ssMax && lotarea <= ssMax * 2) {
      lotSizeScore = normalize(ssMax * 2 - lotarea, 0, ssMax) * 100;
    } else if (lotarea < ssMin / 2) {
      lotSizeScore = normalize(lotarea, 0, ssMin / 2) * 50;
    } else {
      lotSizeScore = 20;
    }
  }

  // 4. Building Age
  let buildingAge = 0;
  if (yearbuilt > 0 && yearbuilt < 2020) {
    const age = 2026 - yearbuilt;
    buildingAge = normalize(age, 0, 100) * 100;
  } else if (yearbuilt === 0 || !yearbuilt) {
    buildingAge = 100;
  }

  // 5. Owner Type
  let ownerTypeScore = 0;
  switch (ownerType) {
    case '': case null: case undefined:
      ownerTypeScore = 80; break;
    case 'P':
      ownerTypeScore = 90; break;
    case 'C':
      ownerTypeScore = 30; break;
    case 'O':
      ownerTypeScore = 40; break;
    case 'X':
      ownerTypeScore = 25; break;
    case 'M':
      ownerTypeScore = 50; break;
    default:
      ownerTypeScore = 60;
  }

  // 6. Zoning Premium
  let zoningPremium = 0;
  if (premiumZones.has(zone)) {
    zoningPremium = 100;
  } else if (residfar >= 2.0) {
    zoningPremium = 70;
  } else if (residfar >= 1.0) {
    zoningPremium = 40;
  } else if (residfar > 0) {
    zoningPremium = 20;
  }

  // Penalties
  if (isProtected) {
    farUtilization *= 0.3;
    zoningPremium *= 0.5;
  }

  // === COMPOSITE SCORE (weights from config) ===
  const w = config.scoringWeights;
  const developerScore = Math.round(
    farUtilization * w.farUtilization +
    unitPotential * w.unitPotential +
    lotSizeScore * w.lotSize +
    buildingAge * w.buildingAge +
    ownerTypeScore * w.ownerType +
    zoningPremium * w.zoningPremium
  );

  // === FINANCIAL ESTIMATES (all from config) ===
  const farGap = residfar > 0 ? residfar - builtfar : 0;
  const maxBuildableSF = lotarea * (residfar || 0);
  const additionalSF = Math.max(0, maxBuildableSF - bldgarea);

  const landRate = landCostMap[zone] || config.defaultLandCostPerSF;
  const estAcquisitionCost = lotarea * landRate;

  const demoCost = bldgarea > 0 ? bldgarea * config.demolitionCostPerSF : 0;
  const newConstructionCost = maxBuildableSF * config.constructionCostPerSF;
  const estConstructionCost = demoCost + newConstructionCost;

  const estTotalProjectCost = estAcquisitionCost + estConstructionCost;

  const estGDV = maxBuildableSF * config.gdvPerSFResidential;

  const estProfit = estGDV - estTotalProjectCost;
  const estROI = estTotalProjectCost > 0 ? (estProfit / estTotalProjectCost) * 100 : 0;

  // === DEAL CRITERIA CHECK ===
  const dc = config.dealCriteria;
  const meetsUserCriteria = checkCriteria(
    {
      score: clamp(developerScore, 0, 100),
      roi: estROI,
      farGap,
      potentialUnits,
      lotarea,
      projectCost: estTotalProjectCost,
      isProtected,
      ownerType,
    },
    dc,
  );

  return {
    developerScore: clamp(developerScore, 0, 100),
    farGap: Math.round(farGap * 100) / 100,
    maxBuildableSF: Math.round(maxBuildableSF),
    additionalSF: Math.round(additionalSF),
    estAcquisitionCost: Math.round(estAcquisitionCost),
    estConstructionCost: Math.round(estConstructionCost),
    estTotalProjectCost: Math.round(estTotalProjectCost),
    estGDV: Math.round(estGDV),
    estProfit: Math.round(estProfit),
    estROI: Math.round(estROI * 10) / 10,
    meetsUserCriteria,
    scoreBreakdown: {
      farUtilization: Math.round(farUtilization),
      unitPotential: Math.round(unitPotential),
      lotSizeScore: Math.round(lotSizeScore),
      buildingAge: Math.round(buildingAge),
      ownerTypeScore: Math.round(ownerTypeScore),
      zoningPremium: Math.round(zoningPremium),
    },
  };
}

function checkCriteria(
  p: {
    score: number;
    roi: number;
    farGap: number;
    potentialUnits: number;
    lotarea: number;
    projectCost: number;
    isProtected: boolean;
    ownerType: string;
  },
  dc: DealCriteria,
): boolean {
  if (p.score < dc.minScore) return false;
  if (p.roi < dc.minROI) return false;
  if (p.farGap < dc.minFarGap) return false;
  if (p.potentialUnits < dc.minPotentialUnits) return false;
  if (p.lotarea < dc.minLotArea) return false;
  if (p.lotarea > dc.maxLotArea) return false;
  if (p.projectCost > dc.maxProjectCost) return false;
  if (dc.excludeProtected && p.isProtected) return false;
  if (dc.ownerTypes.length > 0 && !dc.ownerTypes.includes(p.ownerType || '')) return false;
  return true;
}

export function getScoreLabel(score: number): string {
  if (score >= 80) return 'A+ DEAL';
  if (score >= 65) return 'STRONG';
  if (score >= 50) return 'MODERATE';
  if (score >= 35) return 'BELOW AVG';
  return 'PASS';
}

export function getScoreColor(score: number): string {
  if (score >= 80) return '#10b981';
  if (score >= 65) return '#3b82f6';
  if (score >= 50) return '#f59e0b';
  if (score >= 35) return '#f97316';
  return '#ef4444';
}
