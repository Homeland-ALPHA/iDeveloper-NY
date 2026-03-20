// Batch geocoder using NYC Planning Labs PLUTO data
// Gets lot centroids and polygon boundaries for each property

const CARTO_API = "https://planninglabs.carto.com/api/v2/sql";
const BOROUGH_CODES: Record<string, number> = {
  'Manhattan': 1, 'Bronx': 2, 'Brooklyn': 3, 'Queens': 4, 'Staten Island': 5,
  'MN': 1, 'BX': 2, 'BK': 3, 'QN': 4, 'SI': 5,
};

export interface LotGeometry {
  id: number;
  centroid: [number, number]; // [lng, lat]
  polygon: number[][][] | null; // GeoJSON polygon coordinates
}

// Batch fetch geometries for a list of block/lot pairs
export async function batchGeocode(
  properties: Array<{ id: number; borough: string | null; block: number | null; lot: number | null }>
): Promise<Map<number, LotGeometry>> {
  const results = new Map<number, LotGeometry>();
  
  // Filter to valid properties with block/lot
  const valid = properties.filter(p => p.borough && p.block != null && p.lot != null);
  if (valid.length === 0) return results;
  
  const boroCode = BOROUGH_CODES[valid[0].borough || 'Bronx'] || 2;
  
  // Use smaller batches of 50 to avoid URL length limits and truncated responses
  const BATCH_SIZE = 50;
  const CONCURRENCY = 3; // Run 3 batches in parallel
  
  for (let i = 0; i < valid.length; i += BATCH_SIZE * CONCURRENCY) {
    const batchPromises: Promise<void>[] = [];
    
    for (let j = 0; j < CONCURRENCY; j++) {
      const startIdx = i + j * BATCH_SIZE;
      if (startIdx >= valid.length) break;
      
      const batch = valid.slice(startIdx, startIdx + BATCH_SIZE);
      
      batchPromises.push((async () => {
        // Build SQL WHERE clause for this batch
        const conditions = batch.map(p => `(block=${p.block} AND lot=${p.lot})`).join(' OR ');
        
        const sql = `SELECT block, lot, 
          ST_AsGeoJSON(ST_Centroid(the_geom)) as centroid,
          ST_AsGeoJSON(the_geom) as geom
          FROM dcp_mappluto 
          WHERE borocode=${boroCode} AND (${conditions})`;
        
        try {
          const url = `${CARTO_API}?q=${encodeURIComponent(sql)}&format=json`;
          const response = await fetch(url, {
            signal: AbortSignal.timeout(30000), // 30s timeout per batch
          });
          
          if (!response.ok) {
            console.error(`Geocode batch ${startIdx} HTTP ${response.status}`);
            return;
          }
          
          const text = await response.text();
          let data: any;
          try {
            data = JSON.parse(text);
          } catch {
            console.error(`Geocode batch ${startIdx} invalid JSON (${text.length} chars)`);
            return;
          }
          
          if (data.rows) {
            for (const row of data.rows) {
              // Find matching property
              const prop = batch.find(p => p.block === row.block && p.lot === row.lot);
              if (!prop) continue;
              
              try {
                const centroid = JSON.parse(row.centroid);
                const geom = row.geom ? JSON.parse(row.geom) : null;
                
                let polygon: number[][][] | null = null;
                if (geom) {
                  if (geom.type === 'MultiPolygon') {
                    // Take the first polygon from the multipolygon
                    polygon = geom.coordinates[0];
                  } else if (geom.type === 'Polygon') {
                    polygon = geom.coordinates;
                  }
                }
                
                results.set(prop.id, {
                  id: prop.id,
                  centroid: centroid.coordinates as [number, number],
                  polygon,
                });
              } catch (e) {
                // Skip malformed geometry
              }
            }
          }
        } catch (err: any) {
          if (err.name === 'TimeoutError' || err.name === 'AbortError') {
            console.error(`Geocode batch ${startIdx} timed out`);
          } else {
            console.error(`Geocode batch ${startIdx} failed:`, err.message || err);
          }
        }
      })());
    }
    
    await Promise.all(batchPromises);
  }
  
  console.log(`Geocoded ${results.size}/${valid.length} properties`);
  return results;
}

// Fallback: estimate centroid from address using NYC geosearch
export async function geocodeAddress(address: string, borough: string): Promise<[number, number] | null> {
  try {
    const query = encodeURIComponent(`${address}, ${borough}, NY`);
    const resp = await fetch(`https://geosearch.planninglabs.nyc/v2/search?text=${query}&size=1`);
    const data = await resp.json() as any;
    if (data.features?.[0]) {
      return data.features[0].geometry.coordinates as [number, number];
    }
  } catch (e) {
    // silent fail
  }
  return null;
}
