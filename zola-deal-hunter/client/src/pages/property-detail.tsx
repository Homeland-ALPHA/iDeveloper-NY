import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useRoute, Link } from "wouter";
import {
  formatCurrency,
  formatNumber,
  formatSF,
  getScoreLabel,
  getScoreBgClass,
  getDealSignalColor,
  getOwnerTypeLabel,
  getScoreColorClass,
} from "@/lib/utils";
import {
  ArrowLeft,
  Building2,
  MapPin,
  Ruler,
  Calendar,
  User,
  DollarSign,
  TrendingUp,
  Layers,
  Target,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  BarChart3,
} from "lucide-react";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  ResponsiveContainer,
} from "recharts";

export default function PropertyDetail() {
  const [, params] = useRoute("/property/:id");
  const id = params?.id;

  const { data: prop, isLoading } = useQuery({
    queryKey: ["/api/properties", id],
    queryFn: () => apiRequest("GET", `/api/properties/${id}`).then(r => r.json()),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <div className="h-8 w-48 bg-muted/30 rounded animate-pulse" />
        <div className="grid grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-40 bg-card rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!prop) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Property not found</p>
        <Link href="/explorer">
          <Button variant="outline" size="sm" className="mt-4" data-testid="button-back">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Explorer
          </Button>
        </Link>
      </div>
    );
  }

  const radarData = prop.scoreBreakdown ? [
    { metric: 'FAR Gap', value: prop.scoreBreakdown.farUtilization, fullMark: 100 },
    { metric: 'Units', value: prop.scoreBreakdown.unitPotential, fullMark: 100 },
    { metric: 'Lot Size', value: prop.scoreBreakdown.lotSizeScore, fullMark: 100 },
    { metric: 'Bldg Age', value: prop.scoreBreakdown.buildingAge, fullMark: 100 },
    { metric: 'Owner', value: prop.scoreBreakdown.ownerTypeScore, fullMark: 100 },
    { metric: 'Zoning', value: prop.scoreBreakdown.zoningPremium, fullMark: 100 },
  ] : [];

  const profitPositive = (prop.estProfit || 0) > 0;

  return (
    <div className="p-6 space-y-6" data-testid="property-detail-page">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Link href="/explorer">
            <Button variant="ghost" size="sm" className="mt-0.5" data-testid="button-back">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-lg font-semibold tracking-tight" data-testid="text-address">
                {prop.address || 'No Address'}
              </h2>
              <Badge variant="outline" className={`text-xs tabular-nums font-semibold ${getScoreBgClass(prop.developerScore)}`}>
                {prop.developerScore} — {getScoreLabel(prop.developerScore)}
              </Badge>
              <Badge variant="outline" className={`text-xs ${getDealSignalColor(prop.dealSignal)}`}>
                {prop.dealSignal}
              </Badge>
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {prop.borough} · {prop.zipcode}</span>
              <span className="flex items-center gap-1"><Building2 className="w-3 h-3" /> Block {prop.block}, Lot {prop.lot}</span>
              <span className="flex items-center gap-1"><Layers className="w-3 h-3" /> {prop.zoneDist1}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Top KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { label: 'Est. Total Cost', value: formatCurrency(prop.estTotalProjectCost || 0), icon: DollarSign, color: 'text-blue-400' },
          { label: 'Est. GDV', value: formatCurrency(prop.estGDV || 0), icon: TrendingUp, color: 'text-emerald-400' },
          { label: 'Est. Profit', value: formatCurrency(prop.estProfit || 0), icon: profitPositive ? CheckCircle2 : XCircle, color: profitPositive ? 'text-emerald-400' : 'text-red-400' },
          { label: 'Est. ROI', value: `${prop.estROI || 0}%`, icon: Target, color: (prop.estROI || 0) > 0 ? 'text-emerald-400' : 'text-red-400' },
          { label: 'Potential Units', value: formatNumber(Math.round(prop.potentialUnits || 0)), icon: Building2, color: 'text-purple-400' },
        ].map((kpi) => (
          <Card key={kpi.label} className="bg-card border-border">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <kpi.icon className={`w-3.5 h-3.5 ${kpi.color}`} />
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{kpi.label}</span>
              </div>
              <p className={`text-xl font-bold tabular-nums ${kpi.color}`}>{kpi.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Score Breakdown Radar */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-muted-foreground" />
              Score Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData}>
                  <PolarGrid stroke="hsl(var(--border))" />
                  <PolarAngleAxis dataKey="metric" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                  <Radar
                    name="Score"
                    dataKey="value"
                    stroke="hsl(var(--primary))"
                    fill="hsl(var(--primary))"
                    fillOpacity={0.2}
                    strokeWidth={2}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
            {prop.scoreBreakdown && (
              <div className="space-y-1.5 mt-2">
                {radarData.map(item => (
                  <div key={item.metric} className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{item.metric}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full"
                          style={{ width: `${item.value}%` }}
                        />
                      </div>
                      <span className="tabular-nums font-medium w-8 text-right">{item.value}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Property Details */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Building2 className="w-4 h-4 text-muted-foreground" />
              Property Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { label: 'Owner', value: prop.ownerName || 'Unknown' },
                { label: 'Owner Type', value: getOwnerTypeLabel(prop.ownerType) },
                { label: 'Lot Area', value: prop.lotarea ? formatSF(prop.lotarea) : '—' },
                { label: 'Building Area', value: prop.bldgarea ? formatSF(prop.bldgarea) : '—' },
                { label: 'Lot Dimensions', value: prop.lotfront && prop.lotdepth ? `${prop.lotfront}' x ${prop.lotdepth}'` : '—' },
                { label: 'Floors', value: prop.numfloors || '—' },
                { label: 'Existing Units', value: prop.unitstotal || '—' },
                { label: 'Year Built', value: prop.yearbuilt || 'Vacant Lot' },
                { label: 'Zoning', value: [prop.zoneDist1, prop.zoneDist2, prop.zoneDist3].filter(Boolean).join(' / ') || '—' },
                { label: 'Overlay', value: [prop.overlay1, prop.overlay2].filter(Boolean).join(' / ') || 'None' },
                { label: 'Historic District', value: prop.histdist || 'No' },
                { label: 'Landmark', value: prop.landmark || 'No' },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between text-xs border-b border-border/50 pb-1.5">
                  <span className="text-muted-foreground">{item.label}</span>
                  <span className="font-medium text-right max-w-[180px] truncate">{item.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Financial Analysis */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-muted-foreground" />
              Financial Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Zoning Capacity</div>
              {[
                { label: 'Allowed FAR', value: prop.residfar?.toFixed(2) || '—' },
                { label: 'Built FAR', value: prop.builtfar?.toFixed(2) || '—' },
                { label: 'FAR Gap', value: prop.farGap?.toFixed(2) || '—', highlight: true },
                { label: 'Max Buildable SF', value: prop.maxBuildableSF ? formatSF(prop.maxBuildableSF) : '—' },
                { label: 'Additional SF Available', value: prop.additionalSF ? formatSF(prop.additionalSF) : '—', highlight: true },
              ].map(item => (
                <div key={item.label} className={`flex items-center justify-between text-xs border-b border-border/50 pb-1.5 ${item.highlight ? 'text-primary font-semibold' : ''}`}>
                  <span className={item.highlight ? '' : 'text-muted-foreground'}>{item.label}</span>
                  <span className="tabular-nums">{item.value}</span>
                </div>
              ))}

              <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 mt-4">Cost Estimates</div>
              {[
                { label: 'Land Acquisition', value: formatCurrency(prop.estAcquisitionCost || 0) },
                { label: 'Construction + Demo', value: formatCurrency(prop.estConstructionCost || 0) },
                { label: 'Total Project Cost', value: formatCurrency(prop.estTotalProjectCost || 0), bold: true },
              ].map(item => (
                <div key={item.label} className={`flex items-center justify-between text-xs border-b border-border/50 pb-1.5 ${item.bold ? 'font-semibold' : ''}`}>
                  <span className={item.bold ? '' : 'text-muted-foreground'}>{item.label}</span>
                  <span className="tabular-nums">{item.value}</span>
                </div>
              ))}

              <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 mt-4">Returns</div>
              {[
                { label: 'Gross Dev. Value', value: formatCurrency(prop.estGDV || 0) },
                { label: 'Est. Profit', value: formatCurrency(prop.estProfit || 0), color: profitPositive ? 'text-emerald-400' : 'text-red-400' },
                { label: 'Est. ROI', value: `${prop.estROI || 0}%`, color: (prop.estROI || 0) > 0 ? 'text-emerald-400' : 'text-red-400' },
              ].map(item => (
                <div key={item.label} className={`flex items-center justify-between text-xs border-b border-border/50 pb-1.5`}>
                  <span className="text-muted-foreground">{item.label}</span>
                  <span className={`tabular-nums font-semibold ${item.color || ''}`}>{item.value}</span>
                </div>
              ))}
            </div>

            <div className="mt-4 p-3 bg-muted/30 rounded-lg">
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                Estimates based on Bronx avg construction costs ($350/SF), land values by zone, and $450/SF residential GDV. Actual figures vary by condition, location, and market timing. Consult your team before making offers.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
