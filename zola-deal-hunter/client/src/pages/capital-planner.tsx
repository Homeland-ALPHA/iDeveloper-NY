import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Link } from "wouter";
import { useState } from "react";
import {
  formatCurrency,
  formatNumber,
  getScoreLabel,
  getScoreBgClass,
  getOwnerTypeLabel,
} from "@/lib/utils";
import {
  DollarSign,
  Building2,
  TrendingUp,
  Target,
  PiggyBank,
  ArrowRight,
  Banknote,
  BarChart3,
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
} from "recharts";

export default function CapitalPlanner() {
  const [budget, setBudget] = useState(5000000);
  const [inputValue, setInputValue] = useState("5000000");

  const { data, isLoading } = useQuery({
    queryKey: ["/api/capital-analysis", budget],
    queryFn: () => apiRequest("GET", `/api/capital-analysis?budget=${budget}`).then(r => r.json()),
  });

  function handleBudgetChange(val: number[]) {
    setBudget(val[0]);
    setInputValue(String(val[0]));
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    setInputValue(e.target.value);
    const num = Number(e.target.value);
    if (num > 0) setBudget(num);
  }

  const bracketColors = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#f97316', '#ef4444'];

  return (
    <div className="p-6 space-y-6" data-testid="capital-planner-page">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold tracking-tight">Capital Planner</h2>
        <p className="text-sm text-muted-foreground">
          Set your capital size to see which deals fit your budget
        </p>
      </div>

      {/* Budget Input */}
      <Card className="bg-card border-border">
        <CardContent className="p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center">
              <PiggyBank className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium">Your Available Capital</p>
              <p className="text-xs text-muted-foreground">Total budget for land + construction + demolition</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-xs">
              <DollarSign className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
              <Input
                type="number"
                value={inputValue}
                onChange={handleInputChange}
                className="pl-8 text-lg font-semibold tabular-nums"
                data-testid="input-budget"
              />
            </div>
            <span className="text-lg font-bold text-primary tabular-nums">{formatCurrency(budget)}</span>
          </div>
          <div className="mt-4">
            <Slider
              value={[budget]}
              onValueChange={handleBudgetChange}
              min={100000}
              max={100000000}
              step={100000}
              className="w-full"
              data-testid="slider-budget"
            />
            <div className="flex justify-between mt-1">
              <span className="text-[10px] text-muted-foreground">$100K</span>
              <span className="text-[10px] text-muted-foreground">$100M</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results KPIs */}
      {!isLoading && data && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-card border-border">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-500/15 flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold tabular-nums" data-testid="text-affordable-count">
                      {formatNumber(data.totalAffordable)}
                    </p>
                    <p className="text-xs text-muted-foreground">Deals in Budget</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-500/15 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold tabular-nums" data-testid="text-avg-roi">
                      {data.avgROI}%
                    </p>
                    <p className="text-xs text-muted-foreground">Avg ROI</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-purple-500/15 flex items-center justify-center">
                    <Target className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <p className="text-xl font-bold tabular-nums truncate" data-testid="text-best-roi">
                      {data.bestROI ? `${data.bestROI.estROI}%` : '—'}
                    </p>
                    <p className="text-xs text-muted-foreground">Best ROI Deal</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-amber-500/15 flex items-center justify-center">
                    <Banknote className="w-5 h-5 text-amber-400" />
                  </div>
                  <div>
                    <p className="text-xl font-bold tabular-nums truncate" data-testid="text-best-profit">
                      {data.bestProfit ? formatCurrency(data.bestProfit.estProfit) : '—'}
                    </p>
                    <p className="text-xs text-muted-foreground">Highest Profit Deal</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Budget Distribution + Top by ROI */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Budget Brackets */}
            <Card className="bg-card border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-muted-foreground" />
                  Deals by Budget Bracket
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[260px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.bracketCounts || []} barSize={32}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="label" tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} angle={-20} textAnchor="end" height={50} />
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
                        {(data.bracketCounts || []).map((_: any, i: number) => (
                          <Cell key={i} fill={bracketColors[i % bracketColors.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Top Deals by ROI within budget */}
            <Card className="bg-card border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Target className="w-4 h-4 text-muted-foreground" />
                  Top Deals Within Your Budget (by ROI)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1.5 max-h-[280px] overflow-y-auto">
                  {(data.topByROI || []).length === 0 ? (
                    <p className="text-sm text-muted-foreground py-8 text-center">
                      No deals found within this budget. Try increasing your capital.
                    </p>
                  ) : (
                    (data.topByROI || []).map((deal: any, i: number) => (
                      <Link key={deal.id} href={`/property/${deal.id}`}>
                        <div className="flex items-center justify-between p-2.5 rounded-md hover:bg-accent/50 cursor-pointer transition-colors" data-testid={`capital-deal-${deal.id}`}>
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <span className="text-xs text-muted-foreground w-5 tabular-nums">{i + 1}</span>
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">{deal.address || 'No Address'}</p>
                              <p className="text-xs text-muted-foreground">
                                {deal.zoneDist1} · {deal.zipcode} · {getOwnerTypeLabel(deal.ownerType)}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 flex-shrink-0">
                            <div className="text-right">
                              <p className="text-xs font-medium tabular-nums">{formatCurrency(deal.estTotalProjectCost)}</p>
                              <p className={`text-xs tabular-nums font-semibold ${(deal.estROI || 0) > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                {deal.estROI}% ROI
                              </p>
                            </div>
                            <Badge variant="outline" className={`text-xs tabular-nums ${getScoreBgClass(deal.developerScore)}`}>
                              {deal.developerScore}
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
        </>
      )}

      {isLoading && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 rounded-lg bg-card animate-pulse" />
          ))}
        </div>
      )}
    </div>
  );
}
