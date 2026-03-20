import XLSX from 'xlsx';
import { scoreProperty } from './scoring';
import type { Property, UserConfig } from '../shared/schema';

// Column name mapping - handles various possible column names from Zola exports
const COLUMN_MAP: Record<string, string> = {
  'borough': 'borough',
  'block': 'block',
  'lot': 'lot',
  'zipcode': 'zipcode',
  'zip': 'zipcode',
  'address': 'address',
  'zonedist1': 'zoneDist1',
  'zone_dist_1': 'zoneDist1',
  'zonedist2': 'zoneDist2',
  'zonedist3': 'zoneDist3',
  'zonedist4': 'zoneDist4',
  'overlay1': 'overlay1',
  'overlay2': 'overlay2',
  'owner type': 'ownerType',
  'ownertype': 'ownerType',
  'owner_type': 'ownerType',
  'owner name': 'ownerName',
  'ownername': 'ownerName',
  'owner_name': 'ownerName',
  'lotarea': 'lotarea',
  'lot_area': 'lotarea',
  'bldgarea': 'bldgarea',
  'bldg_area': 'bldgarea',
  'comarea': 'comarea',
  'resarea': 'resarea',
  'numfloors': 'numfloors',
  'num_floors': 'numfloors',
  'unitsres': 'unitsres',
  'units_res': 'unitsres',
  'unitstotal': 'unitstotal',
  'units_total': 'unitstotal',
  'lotfront': 'lotfront',
  'lotdepth': 'lotdepth',
  'bldgfront': 'bldgfront',
  'bldgdepth': 'bldgdepth',
  'yearbuilt': 'yearbuilt',
  'year_built': 'yearbuilt',
  'yearalter1': 'yearalter1',
  'yearalter2': 'yearalter2',
  'histdist': 'histdist',
  'hist_dist': 'histdist',
  'landmark': 'landmark',
  'builtfar': 'builtfar',
  'built_far': 'builtfar',
  'residfar': 'residfar',
  'resid_far': 'residfar',
  'actual lot area': 'actualLotArea',
  'actual_lot_area': 'actualLotArea',
  'building area': 'buildingArea',
  'building_area': 'buildingArea',
  'lot coverage %': 'lotCoverage',
  'lot_coverage': 'lotCoverage',
  'built far %': 'builtFarPct',
  'built_far_pct': 'builtFarPct',
  'efficiency': 'efficiency',
  'potential units': 'potentialUnits',
  'potential_units': 'potentialUnits',
  'deal signal': 'dealSignal',
  'deal_signal': 'dealSignal',
};

function normalizeColumnName(col: string): string {
  const lower = col.toLowerCase().trim();
  return COLUMN_MAP[lower] || lower;
}

/**
 * Parse the Excel file and score every property using the given config.
 */
export function parseExcelFile(filePath: string, config: UserConfig): Property[] {
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rawData = XLSX.utils.sheet_to_json(sheet, { defval: null });

  const properties: Property[] = [];
  let id = 1;

  for (const rawRow of rawData) {
    const row = rawRow as Record<string, any>;

    // Map columns
    const mapped: Record<string, any> = {};
    for (const [key, value] of Object.entries(row)) {
      const normalizedKey = normalizeColumnName(key);
      mapped[normalizedKey] = value;
    }

    // Skip rows where borough is empty (blank padding rows)
    if (!mapped.borough) continue;

    // Build property object
    const prop: any = {
      id: id++,
      borough: mapped.borough || null,
      block: mapped.block ?? null,
      lot: mapped.lot ?? null,
      zipcode: mapped.zipcode ?? null,
      address: mapped.address || null,
      zoneDist1: mapped.zoneDist1 || null,
      zoneDist2: mapped.zoneDist2 || null,
      zoneDist3: mapped.zoneDist3 || null,
      zoneDist4: mapped.zoneDist4 || null,
      overlay1: mapped.overlay1 || null,
      overlay2: mapped.overlay2 || null,
      ownerType: mapped.ownerType || null,
      ownerName: mapped.ownerName || null,
      lotarea: mapped.lotarea ?? null,
      bldgarea: mapped.bldgarea ?? null,
      comarea: mapped.comarea ?? null,
      resarea: mapped.resarea ?? null,
      numfloors: mapped.numfloors ?? null,
      unitsres: mapped.unitsres ?? null,
      unitstotal: mapped.unitstotal ?? null,
      lotfront: mapped.lotfront ?? null,
      lotdepth: mapped.lotdepth ?? null,
      bldgfront: mapped.bldgfront ?? null,
      bldgdepth: mapped.bldgdepth ?? null,
      yearbuilt: mapped.yearbuilt ?? null,
      yearalter1: mapped.yearalter1 ?? null,
      yearalter2: mapped.yearalter2 ?? null,
      histdist: mapped.histdist || null,
      landmark: mapped.landmark || null,
      builtfar: mapped.builtfar ?? null,
      residfar: mapped.residfar ?? null,
      actualLotArea: mapped.actualLotArea ?? null,
      buildingArea: mapped.buildingArea ?? null,
      lotCoverage: mapped.lotCoverage ?? null,
      builtFarPct: mapped.builtFarPct ?? null,
      efficiency: mapped.efficiency ?? null,
      potentialUnits: mapped.potentialUnits ?? null,
      dealSignal: mapped.dealSignal || null,
    };

    // Run scoring engine with user config
    const scores = scoreProperty(prop, config);
    Object.assign(prop, scores);

    properties.push(prop as Property);
  }

  return properties;
}

/**
 * Re-score an existing property array with a new config.
 * Preserves all raw property data — only re-computes the scoring/financial fields.
 */
export function rescoreAll(properties: Property[], config: UserConfig): Property[] {
  return properties.map(prop => {
    const scores = scoreProperty(prop, config);
    return { ...prop, ...scores };
  });
}
