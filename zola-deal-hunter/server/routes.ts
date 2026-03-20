import type { Express } from "express";
import type { Server } from "http";
import { parseExcelFile, rescoreAll } from "./excel-parser";
import { getScoreLabel } from "./scoring";
import { DEFAULT_CONFIG, userConfigSchema } from "../shared/schema";
import type { Property, FilterParams, UserConfig } from "../shared/schema";
import path from "path";
import fs from "fs";
import { batchGeocode, type LotGeometry } from "./geocoder";

let properties: Property[] = [];
let userConfig: UserConfig = { ...DEFAULT_CONFIG };
let geoCache: Map<number, LotGeometry> = new Map();
let geoLoading = false;
let geoLoaded = false;

const CONFIG_PATH = path.join(process.cwd(), "user-config.json");

function loadSavedConfig(): UserConfig {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const raw = fs.readFileSync(CONFIG_PATH, "utf-8");
      const parsed = userConfigSchema.parse(JSON.parse(raw));
      return parsed;
    }
  } catch (e) {
    console.warn("Failed to load saved config, using defaults:", e);
  }
  return { ...DEFAULT_CONFIG };
}

function saveConfig(config: UserConfig) {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
}

function loadDefaultData() {
  const defaultFile = path.join(process.cwd(), "server", "Bronx-Sheet-Zola.xlsx");
  if (fs.existsSync(defaultFile)) {
    properties = parseExcelFile(defaultFile, userConfig);
    console.log(`Loaded ${properties.length} properties from default file`);
    return;
  }
  console.log("No default Excel file found");
}

/**
 * Apply all filter params to a property array.
 * Shared by /api/properties and /api/map-data.
 */
function applyFilters(list: Property[], q: Record<string, string>): Property[] {
  let filtered = [...list];

  if (q.dealSignal && q.dealSignal !== "ALL") {
    filtered = filtered.filter(p => p.dealSignal === q.dealSignal);
  }
  if (q.minScore) {
    filtered = filtered.filter(p => (p.developerScore || 0) >= Number(q.minScore));
  }
  if (q.maxScore) {
    filtered = filtered.filter(p => (p.developerScore || 0) <= Number(q.maxScore));
  }
  if (q.zipcode && q.zipcode !== "ALL") {
    filtered = filtered.filter(p => p.zipcode === Number(q.zipcode));
  }
  if (q.zoneDist && q.zoneDist !== "ALL") {
    filtered = filtered.filter(p => p.zoneDist1 === q.zoneDist);
  }
  if (q.ownerType && q.ownerType !== "ALL") {
    if (q.ownerType === "PRIVATE") {
      filtered = filtered.filter(p => !p.ownerType || p.ownerType === "P" || p.ownerType === "");
    } else {
      filtered = filtered.filter(p => p.ownerType === q.ownerType);
    }
  }
  if (q.minPotentialUnits) {
    filtered = filtered.filter(p => (p.potentialUnits || 0) >= Number(q.minPotentialUnits));
  }
  if (q.maxPotentialUnits) {
    filtered = filtered.filter(p => (p.potentialUnits || 0) <= Number(q.maxPotentialUnits));
  }
  if (q.minLotArea) {
    filtered = filtered.filter(p => (p.lotarea || 0) >= Number(q.minLotArea));
  }
  if (q.maxLotArea) {
    filtered = filtered.filter(p => (p.lotarea || 0) <= Number(q.maxLotArea));
  }
  if (q.maxBudget) {
    filtered = filtered.filter(p => (p.estTotalProjectCost || 0) <= Number(q.maxBudget));
  }
  // NEW filter params
  if (q.minROI) {
    filtered = filtered.filter(p => (p.estROI || 0) >= Number(q.minROI));
  }
  if (q.minFarGap) {
    filtered = filtered.filter(p => (p.farGap || 0) >= Number(q.minFarGap));
  }
  if (q.meetsCriteria === "true") {
    filtered = filtered.filter(p => p.meetsUserCriteria === true);
  }
  if (q.search) {
    const s = q.search.toLowerCase();
    filtered = filtered.filter(p =>
      (p.address && p.address.toLowerCase().includes(s)) ||
      (p.ownerName && p.ownerName.toLowerCase().includes(s)) ||
      (p.zoneDist1 && p.zoneDist1.toLowerCase().includes(s))
    );
  }
  return filtered;
}

export function registerRoutes(server: Server, app: Express) {
  // Load saved config, then load data with that config
  userConfig = loadSavedConfig();
  loadDefaultData();

  // ═══════════════════════════════════════════════
  // CONFIG ENDPOINTS
  // ═══════════════════════════════════════════════

  app.get("/api/config", (_req, res) => {
    res.json(userConfig);
  });

  app.put("/api/config", (req, res) => {
    try {
      const parsed = userConfigSchema.parse(req.body);
      userConfig = parsed;
      saveConfig(userConfig);
      res.json({ success: true, config: userConfig });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Re-score all properties with current (or newly saved) config
  app.post("/api/rescore", (_req, res) => {
    try {
      properties = rescoreAll(properties, userConfig);
      console.log(`Re-scored ${properties.length} properties with updated config`);
      res.json({ success: true, count: properties.length });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ═══════════════════════════════════════════════
  // UPLOAD
  // ═══════════════════════════════════════════════

  app.post("/api/upload", async (req, res) => {
    try {
      const chunks: Buffer[] = [];
      req.on("data", (chunk: Buffer) => chunks.push(chunk));
      req.on("end", () => {
        const buffer = Buffer.concat(chunks);
        const tmpFile = path.join(process.cwd(), "tmp_upload.xlsx");
        fs.writeFileSync(tmpFile, buffer);
        properties = parseExcelFile(tmpFile, userConfig);
        fs.unlinkSync(tmpFile);
        // Reset geocache because property IDs changed
        geoCache = new Map();
        geoLoaded = false;
        res.json({ success: true, count: properties.length });
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ═══════════════════════════════════════════════
  // DASHBOARD STATS
  // ═══════════════════════════════════════════════

  app.get("/api/stats", (_req, res) => {
    const total = properties.length;
    if (total === 0) {
      return res.json({
        totalProperties: 0, strongDeals: 0, weakDeals: 0, unattainableDeals: 0,
        meetsCriteria: 0, avgPotentialUnits: 0, avgFarGap: 0,
        topZipcodes: [], zoningSummary: [], scoreDistribution: [],
      });
    }

    const strongDeals = properties.filter(p => p.dealSignal === "STRONG").length;
    const weakDeals = properties.filter(p => p.dealSignal === "WEAK").length;
    const unattainableDeals = properties.filter(p => p.dealSignal === "UNATTAINABLE").length;
    const meetsCriteria = properties.filter(p => p.meetsUserCriteria === true).length;

    const avgPotentialUnits = properties.reduce((s, p) => s + (p.potentialUnits || 0), 0) / total;
    const avgFarGap = properties.reduce((s, p) => s + (p.farGap || 0), 0) / total;

    const zipMap = new Map<number, { scores: number[]; units: number[] }>();
    for (const p of properties) {
      if (!p.zipcode) continue;
      if (!zipMap.has(p.zipcode)) zipMap.set(p.zipcode, { scores: [], units: [] });
      const z = zipMap.get(p.zipcode)!;
      z.scores.push(p.developerScore || 0);
      z.units.push(p.potentialUnits || 0);
    }
    const topZipcodes = Array.from(zipMap.entries())
      .map(([zipcode, data]) => ({
        zipcode,
        count: data.scores.length,
        avgScore: Math.round(data.scores.reduce((a, b) => a + b, 0) / data.scores.length),
        avgPotentialUnits: Math.round(data.units.reduce((a, b) => a + b, 0) / data.units.length),
      }))
      .sort((a, b) => b.avgScore - a.avgScore)
      .slice(0, 15);

    const zoneMap = new Map<string, number[]>();
    for (const p of properties) {
      if (!p.zoneDist1) continue;
      if (!zoneMap.has(p.zoneDist1)) zoneMap.set(p.zoneDist1, []);
      zoneMap.get(p.zoneDist1)!.push(p.developerScore || 0);
    }
    const zoningSummary = Array.from(zoneMap.entries())
      .map(([zone, scores]) => ({
        zone, count: scores.length,
        avgScore: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
      }))
      .sort((a, b) => b.avgScore - a.avgScore)
      .slice(0, 15);

    const ranges = [
      { range: '0-20', min: 0, max: 20 },
      { range: '21-40', min: 21, max: 40 },
      { range: '41-60', min: 41, max: 60 },
      { range: '61-80', min: 61, max: 80 },
      { range: '81-100', min: 81, max: 100 },
    ];
    const scoreDistribution = ranges.map(r => ({
      range: r.range,
      count: properties.filter(p => (p.developerScore || 0) >= r.min && (p.developerScore || 0) <= r.max).length,
    }));

    res.json({
      totalProperties: total, strongDeals, weakDeals, unattainableDeals,
      meetsCriteria,
      avgPotentialUnits: Math.round(avgPotentialUnits * 10) / 10,
      avgFarGap: Math.round(avgFarGap * 100) / 100,
      topZipcodes, zoningSummary, scoreDistribution,
    });
  });

  // ═══════════════════════════════════════════════
  // PROPERTIES LIST (filtered, sorted, paginated)
  // ═══════════════════════════════════════════════

  app.get("/api/properties", (req, res) => {
    const q = req.query as Record<string, string>;
    let filtered = applyFilters(properties, q);

    // Sort
    const sortBy = q.sortBy || "developerScore";
    const sortDir = q.sortDir === "asc" ? 1 : -1;
    filtered.sort((a: any, b: any) => {
      const aVal = a[sortBy] ?? 0;
      const bVal = b[sortBy] ?? 0;
      if (typeof aVal === "string" && typeof bVal === "string") {
        return aVal.localeCompare(bVal) * sortDir;
      }
      return ((aVal as number) - (bVal as number)) * sortDir;
    });

    const page = Number(q.page) || 1;
    const limit = Number(q.limit) || 50;
    const start = (page - 1) * limit;
    const paged = filtered.slice(start, start + limit);

    res.json({
      data: paged,
      total: filtered.length,
      page, limit,
      totalPages: Math.ceil(filtered.length / limit),
    });
  });

  // === SINGLE PROPERTY DETAIL ===
  app.get("/api/properties/:id", (req, res) => {
    const id = Number(req.params.id);
    const prop = properties.find(p => p.id === id);
    if (!prop) return res.status(404).json({ error: "Property not found" });
    res.json(prop);
  });

  // === FILTER OPTIONS ===
  app.get("/api/filters", (_req, res) => {
    const zipcodes = [...new Set(properties.map(p => p.zipcode).filter(Boolean))].sort() as number[];
    const zones = [...new Set(properties.map(p => p.zoneDist1).filter(Boolean))].sort() as string[];
    const ownerTypes = [...new Set(properties.map(p => p.ownerType).filter(Boolean))].sort() as string[];
    const dealSignals = [...new Set(properties.map(p => p.dealSignal).filter(Boolean))].sort() as string[];
    res.json({ zipcodes, zones, ownerTypes, dealSignals });
  });

  // === TOP DEALS ===
  app.get("/api/top-deals", (req, res) => {
    const limit = Number(req.query.limit) || 10;
    const maxBudget = req.query.maxBudget ? Number(req.query.maxBudget) : undefined;

    let candidates = properties.filter(p => (p.developerScore || 0) >= (userConfig.dealCriteria.minScore || 40));
    if (maxBudget) {
      candidates = candidates.filter(p => (p.estTotalProjectCost || 0) <= maxBudget);
    }

    const topDeals = candidates
      .sort((a, b) => (b.developerScore || 0) - (a.developerScore || 0))
      .slice(0, limit);

    res.json(topDeals);
  });

  // === CAPITAL ANALYSIS ===
  app.get("/api/capital-analysis", (req, res) => {
    const budget = Number(req.query.budget) || 5000000;

    const affordable = properties
      .filter(p => (p.estTotalProjectCost || 0) <= budget && (p.estTotalProjectCost || 0) > 0)
      .sort((a, b) => (b.estROI || 0) - (a.estROI || 0));

    const totalAffordable = affordable.length;
    const avgROI = totalAffordable > 0
      ? affordable.reduce((s, p) => s + (p.estROI || 0), 0) / totalAffordable
      : 0;
    const bestROI = affordable[0] || null;
    const bestProfit = [...affordable].sort((a, b) => (b.estProfit || 0) - (a.estProfit || 0))[0] || null;

    const brackets = [
      { label: 'Under $1M', min: 0, max: 1000000 },
      { label: '$1M - $5M', min: 1000000, max: 5000000 },
      { label: '$5M - $10M', min: 5000000, max: 10000000 },
      { label: '$10M - $25M', min: 10000000, max: 25000000 },
      { label: '$25M - $50M', min: 25000000, max: 50000000 },
      { label: 'Over $50M', min: 50000000, max: Infinity },
    ];

    const bracketCounts = brackets.map(b => ({
      label: b.label,
      count: properties.filter(p => {
        const cost = p.estTotalProjectCost || 0;
        return cost >= b.min && cost < b.max && cost > 0;
      }).length,
    }));

    res.json({
      budget, totalAffordable,
      avgROI: Math.round(avgROI * 10) / 10,
      bestROI, bestProfit,
      topByROI: affordable.slice(0, 10),
      bracketCounts,
    });
  });

  // ═══════════════════════════════════════════════
  // MAP DATA
  // ═══════════════════════════════════════════════

  app.get("/api/map-data", async (req, res) => {
    // Lazy-load geocoding on first map request
    if (!geoLoaded && !geoLoading) {
      geoLoading = true;
      try {
        geoCache = await batchGeocode(
          properties.map(p => ({
            id: p.id,
            borough: p.borough,
            block: p.block,
            lot: p.lot,
          }))
        );
        geoLoaded = true;
      } catch (err) {
        console.error('Geocoding failed:', err);
      } finally {
        geoLoading = false;
      }
    }

    // Wait if another request triggered loading
    if (geoLoading) {
      const waitStart = Date.now();
      while (geoLoading && Date.now() - waitStart < 120000) {
        await new Promise(r => setTimeout(r, 500));
      }
    }

    const q = req.query as Record<string, string>;
    let filtered = applyFilters(properties, q);

    // Build GeoJSON features
    const features = filtered
      .filter(p => geoCache.has(p.id))
      .map(p => {
        const geo = geoCache.get(p.id)!;
        return {
          type: "Feature" as const,
          geometry: geo.polygon
            ? { type: "Polygon" as const, coordinates: geo.polygon }
            : { type: "Point" as const, coordinates: geo.centroid },
          properties: {
            id: p.id,
            address: p.address,
            zipcode: p.zipcode,
            zoneDist1: p.zoneDist1,
            dealSignal: p.dealSignal,
            developerScore: p.developerScore,
            potentialUnits: p.potentialUnits,
            lotarea: p.lotarea,
            estTotalProjectCost: p.estTotalProjectCost,
            estProfit: p.estProfit,
            estROI: p.estROI,
            ownerName: p.ownerName,
            ownerType: p.ownerType,
            builtfar: p.builtfar,
            residfar: p.residfar,
            yearbuilt: p.yearbuilt,
            farGap: p.farGap,
            meetsUserCriteria: p.meetsUserCriteria,
            centroid: geo.centroid,
            hasPolygon: !!geo.polygon,
          },
        };
      });

    res.json({
      type: "FeatureCollection",
      features,
      total: filtered.length,
      geocoded: features.length,
      loading: geoLoading,
    });
  });
}
