import { z } from "zod";

// ═══════════════════════════════════════════════
// USER CONFIG — all editable assumptions & criteria
// ═══════════════════════════════════════════════

export const landCostOverrideSchema = z.object({
  zone: z.string(),
  costPerSF: z.number(),
});

export const scoringWeightsSchema = z.object({
  farUtilization: z.number().min(0).max(1),
  unitPotential: z.number().min(0).max(1),
  lotSize: z.number().min(0).max(1),
  buildingAge: z.number().min(0).max(1),
  ownerType: z.number().min(0).max(1),
  zoningPremium: z.number().min(0).max(1),
});

export const dealCriteriaSchema = z.object({
  minScore: z.number().min(0).max(100),
  minROI: z.number(),
  minFarGap: z.number(),
  minPotentialUnits: z.number(),
  minLotArea: z.number(),
  maxLotArea: z.number(),
  maxProjectCost: z.number(),
  excludeProtected: z.boolean(),
  ownerTypes: z.array(z.string()),  // empty = all, or ['P','C','X',...]
});

export const userConfigSchema = z.object({
  // Financial Assumptions
  constructionCostPerSF: z.number(),
  demolitionCostPerSF: z.number(),
  gdvPerSFResidential: z.number(),
  gdvPerSFCommercial: z.number(),
  defaultLandCostPerSF: z.number(),
  landCostOverrides: z.array(landCostOverrideSchema),

  // Scoring Weights (must sum to 1)
  scoringWeights: scoringWeightsSchema,

  // Deal Criteria
  dealCriteria: dealCriteriaSchema,

  // Lot Size Sweet Spot
  lotSizeSweetSpotMin: z.number(),
  lotSizeSweetSpotMax: z.number(),

  // Premium Zones (user can add/remove)
  premiumZones: z.array(z.string()),
});

export type UserConfig = z.infer<typeof userConfigSchema>;
export type LandCostOverride = z.infer<typeof landCostOverrideSchema>;
export type ScoringWeights = z.infer<typeof scoringWeightsSchema>;
export type DealCriteria = z.infer<typeof dealCriteriaSchema>;

// Default config
export const DEFAULT_CONFIG: UserConfig = {
  constructionCostPerSF: 350,
  demolitionCostPerSF: 25,
  gdvPerSFResidential: 450,
  gdvPerSFCommercial: 350,
  defaultLandCostPerSF: 75,
  landCostOverrides: [
    { zone: 'R3A', costPerSF: 40 }, { zone: 'R4', costPerSF: 50 },
    { zone: 'R4A', costPerSF: 50 }, { zone: 'R5', costPerSF: 65 },
    { zone: 'R6', costPerSF: 80 }, { zone: 'R6A', costPerSF: 85 },
    { zone: 'R7-1', costPerSF: 100 }, { zone: 'R7-2', costPerSF: 110 },
    { zone: 'R7A', costPerSF: 115 }, { zone: 'R7B', costPerSF: 105 },
    { zone: 'R7D', costPerSF: 110 }, { zone: 'R7X', costPerSF: 120 },
    { zone: 'R8', costPerSF: 130 }, { zone: 'R8A', costPerSF: 135 },
    { zone: 'R8X', costPerSF: 140 },
    { zone: 'C4-4', costPerSF: 100 }, { zone: 'C4-4D', costPerSF: 105 },
    { zone: 'C4-5X', costPerSF: 120 },
    { zone: 'M1-1', costPerSF: 45 }, { zone: 'M1-4', costPerSF: 70 },
  ],
  scoringWeights: {
    farUtilization: 0.40,
    unitPotential: 0.20,
    lotSize: 0.10,
    buildingAge: 0.10,
    ownerType: 0.10,
    zoningPremium: 0.10,
  },
  dealCriteria: {
    minScore: 40,
    minROI: 0,
    minFarGap: 0,
    minPotentialUnits: 0,
    minLotArea: 0,
    maxLotArea: 999999999,
    maxProjectCost: 999999999,
    excludeProtected: false,
    ownerTypes: [],
  },
  lotSizeSweetSpotMin: 5000,
  lotSizeSweetSpotMax: 50000,
  premiumZones: [
    'R7-1', 'R7-2', 'R7A', 'R7B', 'R7D', 'R7X',
    'R8', 'R8A', 'R8X', 'R9', 'R10',
    'C4-4', 'C4-4D', 'C4-5X', 'C4-6',
    'M1-4/R7A', 'M1-4/R7-2',
  ],
};

// ═══════════════════════════════════════════════
// PROPERTY SCHEMA
// ═══════════════════════════════════════════════

export const propertySchema = z.object({
  id: z.number(),
  borough: z.string().nullable(),
  block: z.number().nullable(),
  lot: z.number().nullable(),
  zipcode: z.number().nullable(),
  address: z.string().nullable(),
  zoneDist1: z.string().nullable(),
  zoneDist2: z.string().nullable(),
  zoneDist3: z.string().nullable(),
  zoneDist4: z.string().nullable(),
  overlay1: z.string().nullable(),
  overlay2: z.string().nullable(),
  ownerType: z.string().nullable(),
  ownerName: z.string().nullable(),
  lotarea: z.number().nullable(),
  bldgarea: z.number().nullable(),
  comarea: z.number().nullable(),
  resarea: z.number().nullable(),
  numfloors: z.number().nullable(),
  unitsres: z.number().nullable(),
  unitstotal: z.number().nullable(),
  lotfront: z.number().nullable(),
  lotdepth: z.number().nullable(),
  bldgfront: z.number().nullable(),
  bldgdepth: z.number().nullable(),
  yearbuilt: z.number().nullable(),
  yearalter1: z.number().nullable(),
  yearalter2: z.number().nullable(),
  histdist: z.string().nullable(),
  landmark: z.string().nullable(),
  builtfar: z.number().nullable(),
  residfar: z.number().nullable(),
  actualLotArea: z.number().nullable(),
  buildingArea: z.number().nullable(),
  lotCoverage: z.number().nullable(),
  builtFarPct: z.number().nullable(),
  efficiency: z.number().nullable(),
  potentialUnits: z.number().nullable(),
  dealSignal: z.string().nullable(),
  // Computed scoring fields
  developerScore: z.number().nullable(),
  farGap: z.number().nullable(),
  maxBuildableSF: z.number().nullable(),
  additionalSF: z.number().nullable(),
  estAcquisitionCost: z.number().nullable(),
  estConstructionCost: z.number().nullable(),
  estTotalProjectCost: z.number().nullable(),
  estGDV: z.number().nullable(),
  estProfit: z.number().nullable(),
  estROI: z.number().nullable(),
  // Whether it meets user's deal criteria
  meetsUserCriteria: z.boolean().nullable(),
  scoreBreakdown: z.object({
    farUtilization: z.number(),
    unitPotential: z.number(),
    lotSizeScore: z.number(),
    buildingAge: z.number(),
    ownerTypeScore: z.number(),
    zoningPremium: z.number(),
  }).nullable(),
});

export type Property = z.infer<typeof propertySchema>;

// Dashboard summary stats
export const dashboardStatsSchema = z.object({
  totalProperties: z.number(),
  strongDeals: z.number(),
  weakDeals: z.number(),
  unattainableDeals: z.number(),
  meetsCriteria: z.number(),
  avgPotentialUnits: z.number(),
  avgFarGap: z.number(),
  topZipcodes: z.array(z.object({
    zipcode: z.number(),
    count: z.number(),
    avgScore: z.number(),
    avgPotentialUnits: z.number(),
  })),
  zoningSummary: z.array(z.object({
    zone: z.string(),
    count: z.number(),
    avgScore: z.number(),
  })),
  scoreDistribution: z.array(z.object({
    range: z.string(),
    count: z.number(),
  })),
});

export type DashboardStats = z.infer<typeof dashboardStatsSchema>;

// Filter parameters
export const filterParamsSchema = z.object({
  dealSignal: z.string().optional(),
  minScore: z.number().optional(),
  maxScore: z.number().optional(),
  zipcode: z.number().optional(),
  zoneDist: z.string().optional(),
  ownerType: z.string().optional(),
  minPotentialUnits: z.number().optional(),
  maxPotentialUnits: z.number().optional(),
  minLotArea: z.number().optional(),
  maxLotArea: z.number().optional(),
  maxBudget: z.number().optional(),
  minROI: z.number().optional(),
  minFarGap: z.number().optional(),
  meetsCriteria: z.boolean().optional(),
  sortBy: z.string().optional(),
  sortDir: z.enum(["asc", "desc"]).optional(),
  page: z.number().optional(),
  limit: z.number().optional(),
  search: z.string().optional(),
});

export type FilterParams = z.infer<typeof filterParamsSchema>;
