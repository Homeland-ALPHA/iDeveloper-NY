import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Link } from "wouter";
import { useState, useMemo } from "react";
import {
  formatCurrency,
  formatNumber,
  getScoreLabel,
  getScoreBgClass,
  getDealSignalColor,
  getOwnerTypeLabel,
} from "@/lib/utils";
import {
  Search,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  ExternalLink,
  X,
} from "lucide-react";

export default function Explorer() {
  const [search, setSearch] = useState("");
  const [dealSignal, setDealSignal] = useState("ALL");
  const [zoneDist, setZoneDist] = useState("ALL");
  const [ownerType, setOwnerType] = useState("ALL");
  const [zipcode, setZipcode] = useState("ALL");
  const [sortBy, setSortBy] = useState("developerScore");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [minScore, setMinScore] = useState("");
  const [maxBudget, setMaxBudget] = useState("");
  const [showFilters, setShowFilters] = useState(true);

  // Read zipcode from URL params if present
  const urlParams = new URLSearchParams(window.location.hash.split('?')[1] || '');
  const urlZipcode = urlParams.get('zipcode');

  useState(() => {
    if (urlZipcode) setZipcode(urlZipcode);
  });

  const { data: filters } = useQuery({
    queryKey: ["/api/filters"],
  });

  const queryParams = useMemo(() => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (dealSignal !== "ALL") params.set("dealSignal", dealSignal);
    if (zoneDist !== "ALL") params.set("zoneDist", zoneDist);
    if (ownerType !== "ALL") params.set("ownerType", ownerType);
    if (zipcode !== "ALL") params.set("zipcode", zipcode);
    if (minScore) params.set("minScore", minScore);
    if (maxBudget) params.set("maxBudget", maxBudget);
    params.set("sortBy", sortBy);
    params.set("sortDir", sortDir);
    params.set("page", String(page));
    params.set("limit", "50");
    return params.toString();
  }, [search, dealSignal, zoneDist, ownerType, zipcode, sortBy, sortDir, page, minScore, maxBudget]);

  const { data: result, isLoading } = useQuery({
    queryKey: ["/api/properties", queryParams],
    queryFn: () => apiRequest("GET", `/api/properties?${queryParams}`).then(r => r.json()),
  });

  function toggleSort(col: string) {
    if (sortBy === col) {
      setSortDir(d => d === "desc" ? "asc" : "desc");
    } else {
      setSortBy(col);
      setSortDir("desc");
    }
    setPage(1);
  }

  function clearFilters() {
    setSearch("");
    setDealSignal("ALL");
    setZoneDist("ALL");
    setOwnerType("ALL");
    setZipcode("ALL");
    setMinScore("");
    setMaxBudget("");
    setPage(1);
  }

  const hasActiveFilters = dealSignal !== "ALL" || zoneDist !== "ALL" || ownerType !== "ALL" || zipcode !== "ALL" || minScore || maxBudget || search;

  const columns = [
    { key: "developerScore", label: "Score", width: "w-[70px]" },
    { key: "address", label: "Address", width: "flex-1 min-w-[180px]" },
    { key: "zoneDist1", label: "Zone", width: "w-[80px]" },
    { key: "zipcode", label: "Zip", width: "w-[65px]" },
    { key: "dealSignal", label: "Signal", width: "w-[100px]" },
    { key: "potentialUnits", label: "Units", width: "w-[65px]" },
    { key: "lotarea", label: "Lot SF", width: "w-[80px]" },
    { key: "builtFarPct", label: "FAR Used", width: "w-[75px]" },
    { key: "estTotalProjectCost", label: "Est. Cost", width: "w-[90px]" },
    { key: "estROI", label: "ROI", width: "w-[60px]" },
    { key: "ownerType", label: "Owner", width: "w-[80px]" },
  ];

  return (
    <div className="p-6 space-y-4" data-testid="explorer-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Deal Explorer</h2>
          <p className="text-sm text-muted-foreground">
            {result ? `${formatNumber(result.total)} matching properties` : "Loading..."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs" data-testid="button-clear-filters">
              <X className="w-3 h-3 mr-1" /> Clear filters
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="text-xs"
            data-testid="button-toggle-filters"
          >
            <SlidersHorizontal className="w-3 h-3 mr-1" />
            {showFilters ? "Hide" : "Show"} Filters
          </Button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
              {/* Search */}
              <div className="col-span-2">
                <label className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 block">Search</label>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
                  <Input
                    placeholder="Address, owner, zone..."
                    value={search}
                    onChange={e => { setSearch(e.target.value); setPage(1); }}
                    className="pl-8 h-9 text-sm"
                    data-testid="input-search"
                  />
                </div>
              </div>

              {/* Deal Signal */}
              <div>
                <label className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 block">Signal</label>
                <Select value={dealSignal} onValueChange={v => { setDealSignal(v); setPage(1); }}>
                  <SelectTrigger className="h-9 text-sm" data-testid="select-deal-signal">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Signals</SelectItem>
                    {(filters?.dealSignals || []).map((s: string) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Zone */}
              <div>
                <label className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 block">Zone</label>
                <Select value={zoneDist} onValueChange={v => { setZoneDist(v); setPage(1); }}>
                  <SelectTrigger className="h-9 text-sm" data-testid="select-zone">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Zones</SelectItem>
                    {(filters?.zones || []).map((z: string) => (
                      <SelectItem key={z} value={z}>{z}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Zipcode */}
              <div>
                <label className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 block">Zipcode</label>
                <Select value={zipcode} onValueChange={v => { setZipcode(v); setPage(1); }}>
                  <SelectTrigger className="h-9 text-sm" data-testid="select-zipcode">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Zips</SelectItem>
                    {(filters?.zipcodes || []).map((z: number) => (
                      <SelectItem key={z} value={String(z)}>{z}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Owner Type */}
              <div>
                <label className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 block">Owner</label>
                <Select value={ownerType} onValueChange={v => { setOwnerType(v); setPage(1); }}>
                  <SelectTrigger className="h-9 text-sm" data-testid="select-owner">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Owners</SelectItem>
                    <SelectItem value="PRIVATE">Private</SelectItem>
                    <SelectItem value="C">City-Owned</SelectItem>
                    <SelectItem value="X">Tax-Exempt</SelectItem>
                    <SelectItem value="O">Other Gov</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Min Score */}
              <div>
                <label className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 block">Min Score</label>
                <Input
                  type="number"
                  placeholder="0"
                  value={minScore}
                  onChange={e => { setMinScore(e.target.value); setPage(1); }}
                  className="h-9 text-sm"
                  data-testid="input-min-score"
                />
              </div>

              {/* Max Budget */}
              <div>
                <label className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 block">Max Budget ($)</label>
                <Input
                  type="number"
                  placeholder="No limit"
                  value={maxBudget}
                  onChange={e => { setMaxBudget(e.target.value); setPage(1); }}
                  className="h-9 text-sm"
                  data-testid="input-max-budget"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      <Card className="bg-card border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                {columns.map(col => (
                  <th
                    key={col.key}
                    className={`px-3 py-2.5 text-left text-[10px] uppercase tracking-wider text-muted-foreground font-medium cursor-pointer hover:text-foreground transition-colors ${col.width}`}
                    onClick={() => toggleSort(col.key)}
                  >
                    <div className="flex items-center gap-1">
                      {col.label}
                      {sortBy === col.key && (
                        <ArrowUpDown className="w-3 h-3 text-primary" />
                      )}
                    </div>
                  </th>
                ))}
                <th className="w-[40px]" />
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                [...Array(10)].map((_, i) => (
                  <tr key={i} className="border-b border-border/50">
                    {columns.map(col => (
                      <td key={col.key} className="px-3 py-3">
                        <div className="h-4 bg-muted/30 rounded animate-pulse" />
                      </td>
                    ))}
                    <td />
                  </tr>
                ))
              ) : (
                (result?.data || []).map((prop: any) => (
                  <tr
                    key={prop.id}
                    className="border-b border-border/50 hover:bg-accent/30 transition-colors"
                    data-testid={`row-property-${prop.id}`}
                  >
                    <td className="px-3 py-2.5">
                      <Badge variant="outline" className={`text-xs tabular-nums font-semibold ${getScoreBgClass(prop.developerScore)}`}>
                        {prop.developerScore}
                      </Badge>
                    </td>
                    <td className="px-3 py-2.5">
                      <Link href={`/property/${prop.id}`}>
                        <span className="text-sm font-medium hover:text-primary cursor-pointer transition-colors">
                          {prop.address || 'No Address'}
                        </span>
                      </Link>
                    </td>
                    <td className="px-3 py-2.5 text-xs tabular-nums text-muted-foreground">{prop.zoneDist1}</td>
                    <td className="px-3 py-2.5 text-xs tabular-nums text-muted-foreground">{prop.zipcode}</td>
                    <td className="px-3 py-2.5">
                      <Badge variant="outline" className={`text-[10px] ${getDealSignalColor(prop.dealSignal)}`}>
                        {prop.dealSignal}
                      </Badge>
                    </td>
                    <td className="px-3 py-2.5 text-xs tabular-nums font-medium">
                      {prop.potentialUnits ? Math.round(prop.potentialUnits) : '—'}
                    </td>
                    <td className="px-3 py-2.5 text-xs tabular-nums text-muted-foreground">
                      {prop.lotarea ? formatNumber(prop.lotarea) : '—'}
                    </td>
                    <td className="px-3 py-2.5 text-xs tabular-nums text-muted-foreground">
                      {prop.builtFarPct != null ? `${(prop.builtFarPct * 100).toFixed(0)}%` : '—'}
                    </td>
                    <td className="px-3 py-2.5 text-xs tabular-nums font-medium">
                      {prop.estTotalProjectCost ? formatCurrency(prop.estTotalProjectCost) : '—'}
                    </td>
                    <td className={`px-3 py-2.5 text-xs tabular-nums font-medium ${(prop.estROI || 0) > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {prop.estROI != null ? `${prop.estROI}%` : '—'}
                    </td>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground">
                      {getOwnerTypeLabel(prop.ownerType)}
                    </td>
                    <td className="px-3 py-2.5">
                      <Link href={`/property/${prop.id}`}>
                        <ExternalLink className="w-3.5 h-3.5 text-muted-foreground hover:text-primary cursor-pointer" />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {result && result.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <p className="text-xs text-muted-foreground">
              Page {result.page} of {result.totalPages} ({formatNumber(result.total)} total)
            </p>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}
                data-testid="button-prev-page"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                disabled={page >= result.totalPages}
                onClick={() => setPage(p => p + 1)}
                data-testid="button-next-page"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
