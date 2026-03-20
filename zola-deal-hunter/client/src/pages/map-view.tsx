import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Link } from "wouter";
import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  formatCurrency,
  formatNumber,
  getScoreLabel,
  getScoreBgClass,
  getDealSignalColor,
  getOwnerTypeLabel,
} from "@/lib/utils";
import {
  MapPin,
  Loader2,
  X,
  ExternalLink,
  SlidersHorizontal,
  Layers,
  Target,
} from "lucide-react";

// Leaflet imports
import { MapContainer, TileLayer, GeoJSON, Popup, useMap, Marker, CircleMarker } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix leaflet default icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

function getScoreColor(score: number): string {
  if (score >= 80) return "#10b981";
  if (score >= 65) return "#3b82f6";
  if (score >= 50) return "#f59e0b";
  if (score >= 35) return "#f97316";
  return "#ef4444";
}

function getScoreFillOpacity(score: number): number {
  if (score >= 80) return 0.45;
  if (score >= 65) return 0.35;
  if (score >= 50) return 0.25;
  return 0.15;
}

// Debounce hook for text inputs
function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const h = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(h);
  }, [value, delay]);
  return debounced;
}

// Component to fit map bounds to data
function FitBounds({ geojson }: { geojson: any }) {
  const map = useMap();
  useEffect(() => {
    if (geojson?.features?.length > 0) {
      try {
        const layer = L.geoJSON(geojson);
        const bounds = layer.getBounds();
        if (bounds.isValid()) {
          map.fitBounds(bounds, { padding: [30, 30], maxZoom: 16 });
        }
      } catch (e) {
        // fallback to Bronx center
        map.setView([40.8448, -73.8648], 12);
      }
    }
  }, [geojson, map]);
  return null;
}

interface SelectedProperty {
  id: number;
  address: string;
  zipcode: number;
  zoneDist1: string;
  dealSignal: string;
  developerScore: number;
  potentialUnits: number;
  lotarea: number;
  estTotalProjectCost: number;
  estProfit: number;
  estROI: number;
  ownerName: string;
  ownerType: string;
  builtfar: number;
  residfar: number;
  yearbuilt: number;
  farGap: number;
  meetsUserCriteria: boolean;
}

export default function MapView() {
  // Filter states
  const [dealSignal, setDealSignal] = useState("ALL");
  const [zoneDist, setZoneDist] = useState("ALL");
  const [ownerType, setOwnerType] = useState("ALL");
  const [zipcode, setZipcode] = useState("ALL");
  const [minScore, setMinScore] = useState("40");
  const [maxBudget, setMaxBudget] = useState("");
  const [minROI, setMinROI] = useState("");
  const [minFarGap, setMinFarGap] = useState("");
  const [minPotentialUnits, setMinPotentialUnits] = useState("");
  const [meetsCriteria, setMeetsCriteria] = useState(false);
  const [showFilters, setShowFilters] = useState(true);
  const [selected, setSelected] = useState<SelectedProperty | null>(null);
  const [colorBy, setColorBy] = useState<"score" | "signal">("score");

  // Debounce numeric inputs
  const dMinScore = useDebounce(minScore, 400);
  const dMaxBudget = useDebounce(maxBudget, 400);
  const dMinROI = useDebounce(minROI, 400);
  const dMinFarGap = useDebounce(minFarGap, 400);
  const dMinPotentialUnits = useDebounce(minPotentialUnits, 400);

  const { data: filters } = useQuery({
    queryKey: ["/api/filters"],
  });

  const queryParams = useMemo(() => {
    const params = new URLSearchParams();
    if (dealSignal !== "ALL") params.set("dealSignal", dealSignal);
    if (zoneDist !== "ALL") params.set("zoneDist", zoneDist);
    if (ownerType !== "ALL") params.set("ownerType", ownerType);
    if (zipcode !== "ALL") params.set("zipcode", zipcode);
    if (dMinScore) params.set("minScore", dMinScore);
    if (dMaxBudget) params.set("maxBudget", dMaxBudget);
    if (dMinROI) params.set("minROI", dMinROI);
    if (dMinFarGap) params.set("minFarGap", dMinFarGap);
    if (dMinPotentialUnits) params.set("minPotentialUnits", dMinPotentialUnits);
    if (meetsCriteria) params.set("meetsCriteria", "true");
    return params.toString();
  }, [dealSignal, zoneDist, ownerType, zipcode, dMinScore, dMaxBudget, dMinROI, dMinFarGap, dMinPotentialUnits, meetsCriteria]);

  const { data: mapData, isLoading } = useQuery({
    queryKey: ["/api/map-data", queryParams],
    queryFn: () => apiRequest("GET", `/api/map-data?${queryParams}`).then(r => r.json()),
  });

  // Split GeoJSON into polygons and points
  const { polygonFeatures, pointFeatures } = useMemo(() => {
    if (!mapData?.features) return { polygonFeatures: { type: "FeatureCollection", features: [] }, pointFeatures: [] };

    const polys: any[] = [];
    const pts: any[] = [];

    for (const f of mapData.features) {
      if (f.geometry.type === "Polygon") {
        polys.push(f);
      } else {
        pts.push(f);
      }
    }

    return {
      polygonFeatures: { type: "FeatureCollection" as const, features: polys },
      pointFeatures: pts,
    };
  }, [mapData]);

  const getPolygonStyle = useCallback((feature: any) => {
    const score = feature?.properties?.developerScore || 0;
    const signal = feature?.properties?.dealSignal;

    let color: string;
    if (colorBy === "signal") {
      color = signal === "STRONG" ? "#10b981" : signal === "UNATTAINABLE" ? "#f59e0b" : "#ef4444";
    } else {
      color = getScoreColor(score);
    }

    return {
      color,
      weight: 2,
      opacity: 0.85,
      fillColor: color,
      fillOpacity: getScoreFillOpacity(score),
    };
  }, [colorBy]);

  const onEachFeature = useCallback((feature: any, layer: L.Layer) => {
    layer.on({
      click: () => {
        setSelected(feature.properties);
      },
      mouseover: (e: any) => {
        const l = e.target;
        l.setStyle({
          weight: 3,
          fillOpacity: 0.6,
        });
        l.bringToFront();
      },
      mouseout: (e: any) => {
        const l = e.target;
        const score = feature.properties?.developerScore || 0;
        l.setStyle({
          weight: 2,
          fillOpacity: getScoreFillOpacity(score),
        });
      },
    });

    const p = feature.properties;
    layer.bindTooltip(
      `<div style="font-size:11px;line-height:1.4">
        <strong>${p.address || "No Address"}</strong><br/>
        Score: <strong>${p.developerScore}</strong> · ${p.dealSignal}<br/>
        Units: ${Math.round(p.potentialUnits || 0)} · ${p.zoneDist1}
      </div>`,
      { sticky: true, direction: "top", offset: [0, -10] }
    );
  }, []);

  // Use a unique key that includes queryParams + colorBy to force GeoJSON re-render
  const geoJsonKey = useMemo(() => `${queryParams}-${colorBy}-${mapData?.features?.length || 0}`, [queryParams, colorBy, mapData]);

  const hasActiveFilters = dealSignal !== "ALL" || zoneDist !== "ALL" || ownerType !== "ALL" || zipcode !== "ALL" || minScore !== "40" || maxBudget || minROI || minFarGap || minPotentialUnits || meetsCriteria;

  function clearFilters() {
    setDealSignal("ALL");
    setZoneDist("ALL");
    setOwnerType("ALL");
    setZipcode("ALL");
    setMinScore("40");
    setMaxBudget("");
    setMinROI("");
    setMinFarGap("");
    setMinPotentialUnits("");
    setMeetsCriteria(false);
  }

  return (
    <div className="h-full flex flex-col" data-testid="map-view-page">
      {/* Header Bar */}
      <div className="px-4 py-3 border-b border-border flex items-center justify-between flex-shrink-0 bg-card/50">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-semibold tracking-tight flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary" />
            Property Map
          </h2>
          <span className="text-xs text-muted-foreground">
            {isLoading ? (
              <span className="flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Loading map data...</span>
            ) : (
              `${mapData?.geocoded || 0} of ${mapData?.total || 0} properties mapped`
            )}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Select value={colorBy} onValueChange={(v: "score" | "signal") => setColorBy(v)}>
            <SelectTrigger className="h-7 text-xs w-[130px]" data-testid="select-color-by">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="score">Color by Score</SelectItem>
              <SelectItem value="signal">Color by Signal</SelectItem>
            </SelectContent>
          </Select>

          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs h-7" data-testid="button-clear-map-filters">
              <X className="w-3 h-3 mr-1" /> Clear
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="text-xs h-7"
            data-testid="button-toggle-map-filters"
          >
            <SlidersHorizontal className="w-3 h-3 mr-1" />
            Filters
          </Button>
        </div>
      </div>

      {/* Filters Row */}
      {showFilters && (
        <div className="px-4 py-2.5 border-b border-border bg-card/30 flex-shrink-0">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Signal</span>
              <Select value={dealSignal} onValueChange={v => setDealSignal(v)}>
                <SelectTrigger className="h-7 text-xs w-[110px]" data-testid="select-map-signal">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All</SelectItem>
                  {(filters?.dealSignals || []).map((s: string) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Zone</span>
              <Select value={zoneDist} onValueChange={v => setZoneDist(v)}>
                <SelectTrigger className="h-7 text-xs w-[90px]" data-testid="select-map-zone">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All</SelectItem>
                  {(filters?.zones || []).map((z: string) => (
                    <SelectItem key={z} value={z}>{z}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Zip</span>
              <Select value={zipcode} onValueChange={v => setZipcode(v)}>
                <SelectTrigger className="h-7 text-xs w-[90px]" data-testid="select-map-zip">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All</SelectItem>
                  {(filters?.zipcodes || []).map((z: number) => (
                    <SelectItem key={z} value={String(z)}>{z}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Owner</span>
              <Select value={ownerType} onValueChange={v => setOwnerType(v)}>
                <SelectTrigger className="h-7 text-xs w-[100px]" data-testid="select-map-owner">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All</SelectItem>
                  <SelectItem value="PRIVATE">Private</SelectItem>
                  <SelectItem value="C">City</SelectItem>
                  <SelectItem value="X">Tax-Exempt</SelectItem>
                  <SelectItem value="O">Other Gov</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Min Score</span>
              <Input
                type="number"
                value={minScore}
                onChange={e => setMinScore(e.target.value)}
                className="h-7 text-xs w-[60px]"
                data-testid="input-map-min-score"
              />
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Max Budget</span>
              <Input
                type="number"
                placeholder="No limit"
                value={maxBudget}
                onChange={e => setMaxBudget(e.target.value)}
                className="h-7 text-xs w-[100px]"
                data-testid="input-map-budget"
              />
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Min ROI</span>
              <Input
                type="number"
                placeholder="%"
                value={minROI}
                onChange={e => setMinROI(e.target.value)}
                className="h-7 text-xs w-[60px]"
                data-testid="input-map-min-roi"
              />
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Min FAR Gap</span>
              <Input
                type="number"
                placeholder="0"
                value={minFarGap}
                onChange={e => setMinFarGap(e.target.value)}
                className="h-7 text-xs w-[60px]"
                step="0.1"
                data-testid="input-map-min-far"
              />
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Min Units</span>
              <Input
                type="number"
                placeholder="0"
                value={minPotentialUnits}
                onChange={e => setMinPotentialUnits(e.target.value)}
                className="h-7 text-xs w-[60px]"
                data-testid="input-map-min-units"
              />
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Meets Criteria</span>
              <Switch
                checked={meetsCriteria}
                onCheckedChange={setMeetsCriteria}
                data-testid="switch-map-meets-criteria"
              />
            </div>
          </div>
        </div>
      )}

      {/* Map + Detail Panel */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Map */}
        <div className="flex-1 relative">
          {isLoading && (
            <div className="absolute inset-0 bg-background/80 z-[1000] flex items-center justify-center">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-5 h-5 animate-spin" />
                Fetching lot geometries from NYC PLUTO...
              </div>
            </div>
          )}
          <MapContainer
            center={[40.8448, -73.8648]}
            zoom={12}
            style={{ height: "100%", width: "100%" }}
            zoomControl={true}
          >
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>'
            />

            {/* Polygon lots */}
            {polygonFeatures.features.length > 0 && (
              <GeoJSON
                key={geoJsonKey}
                data={polygonFeatures as any}
                style={getPolygonStyle}
                onEachFeature={onEachFeature}
              />
            )}

            {/* Point markers for properties without polygon */}
            {pointFeatures.map((f: any) => (
              <CircleMarker
                key={f.properties.id}
                center={[f.geometry.coordinates[1], f.geometry.coordinates[0]]}
                radius={6}
                pathOptions={{
                  color: getScoreColor(f.properties.developerScore),
                  fillColor: getScoreColor(f.properties.developerScore),
                  fillOpacity: 0.7,
                  weight: 2,
                }}
                eventHandlers={{
                  click: () => setSelected(f.properties),
                }}
              >
                <Popup>
                  <div style={{ fontSize: 11 }}>
                    <strong>{f.properties.address}</strong><br />
                    Score: {f.properties.developerScore}
                  </div>
                </Popup>
              </CircleMarker>
            ))}

            <FitBounds geojson={mapData} />
          </MapContainer>

          {/* Legend */}
          <div className="absolute bottom-4 left-4 z-[1000] bg-card/95 backdrop-blur border border-border rounded-lg p-3 text-xs space-y-1.5">
            <p className="font-medium text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
              {colorBy === "score" ? "Developer Score" : "Deal Signal"}
            </p>
            {colorBy === "score" ? (
              <>
                {[
                  { color: "#10b981", label: "80-100 (A+ Deal)" },
                  { color: "#3b82f6", label: "65-79 (Strong)" },
                  { color: "#f59e0b", label: "50-64 (Moderate)" },
                  { color: "#f97316", label: "35-49 (Below Avg)" },
                  { color: "#ef4444", label: "0-34 (Pass)" },
                ].map(item => (
                  <div key={item.label} className="flex items-center gap-2">
                    <div className="w-4 h-3 rounded-sm" style={{ backgroundColor: item.color, opacity: 0.7 }} />
                    <span>{item.label}</span>
                  </div>
                ))}
              </>
            ) : (
              <>
                {[
                  { color: "#10b981", label: "STRONG" },
                  { color: "#f59e0b", label: "UNATTAINABLE" },
                  { color: "#ef4444", label: "WEAK" },
                ].map(item => (
                  <div key={item.label} className="flex items-center gap-2">
                    <div className="w-4 h-3 rounded-sm" style={{ backgroundColor: item.color, opacity: 0.7 }} />
                    <span>{item.label}</span>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>

        {/* Property Detail Side Panel */}
        {selected && (
          <div className="w-[320px] border-l border-border bg-card overflow-y-auto flex-shrink-0">
            <div className="p-4 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-semibold leading-tight" data-testid="text-selected-address">
                    {selected.address || "No Address"}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {selected.zoneDist1} · {selected.zipcode}
                  </p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setSelected(null)} className="h-6 w-6 p-0">
                  <X className="w-3 h-3" />
                </Button>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className={`text-xs tabular-nums font-semibold ${getScoreBgClass(selected.developerScore)}`}>
                  {selected.developerScore} — {getScoreLabel(selected.developerScore)}
                </Badge>
                <Badge variant="outline" className={`text-[10px] ${getDealSignalColor(selected.dealSignal)}`}>
                  {selected.dealSignal}
                </Badge>
                {selected.meetsUserCriteria && (
                  <Badge variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-400 bg-emerald-500/10">
                    Meets Criteria
                  </Badge>
                )}
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "Potential Units", value: Math.round(selected.potentialUnits || 0) },
                  { label: "Lot Area", value: `${formatNumber(selected.lotarea || 0)} SF` },
                  { label: "Built FAR", value: selected.builtfar?.toFixed(2) || "0" },
                  { label: "Allowed FAR", value: selected.residfar?.toFixed(2) || "0" },
                  { label: "FAR Gap", value: (selected.farGap || 0).toFixed(2) },
                  { label: "Year Built", value: selected.yearbuilt || "Vacant" },
                  { label: "Owner Type", value: getOwnerTypeLabel(selected.ownerType) },
                ].map(stat => (
                  <div key={stat.label} className="bg-muted/30 rounded-md p-2">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{stat.label}</p>
                    <p className="text-sm font-semibold tabular-nums">{stat.value}</p>
                  </div>
                ))}
              </div>

              {/* Financial */}
              <div className="space-y-2">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Financials</p>
                {[
                  { label: "Total Project Cost", value: formatCurrency(selected.estTotalProjectCost || 0) },
                  { label: "Est. Profit", value: formatCurrency(selected.estProfit || 0), color: (selected.estProfit || 0) > 0 ? "text-emerald-400" : "text-red-400" },
                  { label: "Est. ROI", value: `${selected.estROI || 0}%`, color: (selected.estROI || 0) > 0 ? "text-emerald-400" : "text-red-400" },
                ].map(item => (
                  <div key={item.label} className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{item.label}</span>
                    <span className={`font-semibold tabular-nums ${item.color || ""}`}>{item.value}</span>
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Owner</p>
                <p className="text-xs font-medium">{selected.ownerName || "Unknown"}</p>
              </div>

              <Link href={`/property/${selected.id}`}>
                <Button variant="outline" size="sm" className="w-full text-xs mt-2" data-testid="button-view-full-detail">
                  <ExternalLink className="w-3 h-3 mr-1.5" />
                  View Full Analysis
                </Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
