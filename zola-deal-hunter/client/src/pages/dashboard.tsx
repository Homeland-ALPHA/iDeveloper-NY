import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import {
  formatCurrency,
  formatNumber,
  getScoreLabel,
  getScoreColorClass,
  getScoreBgClass,
  getDealSignalColor,
  getOwnerTypeLabel,
} from "@/lib/utils";
import {
  Building2,
  TrendingUp,
  Target,
  MapPin,
  ArrowRight,
  Layers,
  BarChart3,
  AlertTriangle,
  Zap,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
} from "recharts";

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/stats"],
  });

  const { data: topDeals, isLoading: dealsLoading } = useQuery({
    queryKey: ["/api/top-deals", 10],
    queryFn: () => apiRequest("GET", "/api/top-deals?limit=10").then(r => r.json()),
  });

  if (statsLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 rounded-lg bg-card animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-72 rounded-lg bg-card animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const scoreColors = ['#ef4444', '#f97316', '#f59e0b', '#3b82f6', '#10b981'];
  const dealSignalData = [
    { name: 'STRONG', value: stats?.strongDeals || 0, color: '#10b981' },
    { name: 'WEAK', value: stats?.weakDeals || 0, color: '#ef4444' },
    { name: 'UNATTAINABLE', value: stats?.unattainableDeals || 0, color: '#f59e0b' },
  ].filter(d => d.value > 0);

  return (
    <div className="p-6 space-y-6" data-testid="dashboard-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Deal Dashboard</h2>
          <p className="text-sm text-muted-foreground">
            {formatNumber(stats?.totalProperties || 0)} properties analyzed
          </p>
        </div>
        <Link href="/explorer">
          <span className="flex items-center gap-1.5 text-sm text-primary hover:underline cursor-pointer" data-testid="link-explore-all">
            Explore all deals <ArrowRight className="w-3.5 h-3.5" />
          </span>
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/15 flex items-center justify-center">
                <Target className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-2xl font-bold tabular-nums" data-testid="text-strong-deals">
                  {formatNumber(stats?.strongDeals || 0)}
                </p>
                <p className="text-xs text-muted-foreground">Strong Deals</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-500/15 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-bold tabular-nums" data-testid="text-unattainable">
                  {formatNumber(stats?.unattainableDeals || 0)}
                </p>
                <p className="text-xs text-muted-foreground">Unattainable</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/15 flex items-center justify-center">
                <Layers className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold tabular-nums" data-testid="text-avg-units">
                  {stats?.avgPotentialUnits?.toFixed(0) || 0}
                </p>
                <p className="text-xs text-muted-foreground">Avg Potential Units</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-500/15 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold tabular-nums" data-testid="text-avg-far-gap">
                  {stats?.avgFarGap?.toFixed(2) || 0}
                </p>
                <p className="text-xs text-muted-foreground">Avg FAR Gap</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Score Distribution */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-muted-foreground" />
              Developer Score Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats?.scoreDistribution || []} barSize={36}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="range" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {(stats?.scoreDistribution || []).map((_: any, i: number) => (
                      <Cell key={i} fill={scoreColors[i]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Deal Signal Breakdown */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Zap className="w-4 h-4 text-muted-foreground" />
              Deal Signal Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              <div className="h-[220px] w-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={dealSignalData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {dealSignalData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-3 flex-1">
                {dealSignalData.map((d) => (
                  <div key={d.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }} />
                      <span className="text-sm">{d.name}</span>
                    </div>
                    <span className="text-sm font-semibold tabular-nums">{formatNumber(d.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row: Top Zipcodes + Top Deals */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top Zipcodes */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <MapPin className="w-4 h-4 text-muted-foreground" />
              Top Zipcodes by Developer Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
              {(stats?.topZipcodes || []).map((z: any, i: number) => (
                <Link key={z.zipcode} href={`/explorer?zipcode=${z.zipcode}`}>
                  <div className="flex items-center justify-between p-2 rounded-md hover:bg-accent/50 cursor-pointer transition-colors" data-testid={`zipcode-row-${z.zipcode}`}>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground w-5 tabular-nums">{i + 1}</span>
                      <span className="text-sm font-medium tabular-nums">{z.zipcode}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <span className="text-xs text-muted-foreground">{z.count} deals</span>
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-muted-foreground">~{z.avgPotentialUnits} units</span>
                      </div>
                      <Badge variant="outline" className={`text-xs tabular-nums ${getScoreBgClass(z.avgScore)}`}>
                        {z.avgScore}
                      </Badge>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Deals */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Target className="w-4 h-4 text-muted-foreground" />
              Top 10 Opportunities
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
              {dealsLoading ? (
                [...Array(5)].map((_, i) => (
                  <div key={i} className="h-12 rounded-md bg-muted/30 animate-pulse" />
                ))
              ) : (
                (topDeals || []).map((deal: any, i: number) => (
                  <Link key={deal.id} href={`/property/${deal.id}`}>
                    <div className="flex items-center justify-between p-2 rounded-md hover:bg-accent/50 cursor-pointer transition-colors" data-testid={`top-deal-${deal.id}`}>
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <span className="text-xs text-muted-foreground w-5 tabular-nums">{i + 1}</span>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{deal.address || 'No Address'}</p>
                          <p className="text-xs text-muted-foreground">
                            {deal.zoneDist1} · {deal.zipcode} · {formatNumber(deal.potentialUnits || 0)} units
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <span className="text-xs text-muted-foreground">{formatCurrency(deal.estTotalProjectCost || 0)}</span>
                        <Badge variant="outline" className={`text-xs tabular-nums ${getScoreBgClass(deal.developerScore)}`}>
                          {deal.developerScore} — {getScoreLabel(deal.developerScore)}
                        </Badge>
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Zoning Summary */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Building2 className="w-4 h-4 text-muted-foreground" />
            Zoning District Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={(stats?.zoningSummary || []).slice(0, 12)} barSize={28}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="zone" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} angle={-30} textAnchor="end" height={50} />
                <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} label={{ value: 'Avg Score', angle: -90, position: 'insideLeft', style: { fontSize: 11, fill: 'hsl(var(--muted-foreground))' } }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                  formatter={(value: any) => [value, 'Avg Score']}
                />
                <Bar dataKey="avgScore" radius={[4, 4, 0, 0]}>
                  {(stats?.zoningSummary || []).slice(0, 12).map((_: any, i: number) => (
                    <Cell key={i} fill={`hsl(160, 84%, ${30 + i * 3}%)`} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
