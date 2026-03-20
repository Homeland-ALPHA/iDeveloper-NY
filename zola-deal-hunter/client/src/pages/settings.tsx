import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect, useCallback } from "react";
import {
  Settings as SettingsIcon,
  Save,
  RotateCcw,
  Calculator,
  Target,
  Sliders,
  MapPin,
  Loader2,
  Plus,
  Trash2,
  RefreshCw,
} from "lucide-react";

interface UserConfig {
  constructionCostPerSF: number;
  demolitionCostPerSF: number;
  gdvPerSFResidential: number;
  gdvPerSFCommercial: number;
  defaultLandCostPerSF: number;
  landCostOverrides: { zone: string; costPerSF: number }[];
  scoringWeights: {
    farUtilization: number;
    unitPotential: number;
    lotSize: number;
    buildingAge: number;
    ownerType: number;
    zoningPremium: number;
  };
  dealCriteria: {
    minScore: number;
    minROI: number;
    minFarGap: number;
    minPotentialUnits: number;
    minLotArea: number;
    maxLotArea: number;
    maxProjectCost: number;
    excludeProtected: boolean;
    ownerTypes: string[];
  };
  lotSizeSweetSpotMin: number;
  lotSizeSweetSpotMax: number;
  premiumZones: string[];
}

function NumberInput({
  label,
  value,
  onChange,
  prefix,
  suffix,
  min,
  max,
  step,
  hint,
  testId,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  prefix?: string;
  suffix?: string;
  min?: number;
  max?: number;
  step?: number;
  hint?: string;
  testId?: string;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="flex items-center gap-1">
        {prefix && <span className="text-xs text-muted-foreground">{prefix}</span>}
        <Input
          type="number"
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          min={min}
          max={max}
          step={step || 1}
          className="h-8 text-xs tabular-nums"
          data-testid={testId}
        />
        {suffix && <span className="text-xs text-muted-foreground whitespace-nowrap">{suffix}</span>}
      </div>
      {hint && <p className="text-[10px] text-muted-foreground/70">{hint}</p>}
    </div>
  );
}

function WeightSlider({
  label,
  value,
  onChange,
  testId,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  testId?: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-muted-foreground w-[110px] flex-shrink-0">{label}</span>
      <Slider
        value={[value * 100]}
        onValueChange={([v]) => onChange(v / 100)}
        min={0}
        max={100}
        step={5}
        className="flex-1"
        data-testid={testId}
      />
      <span className="text-xs font-semibold tabular-nums w-[40px] text-right">
        {Math.round(value * 100)}%
      </span>
    </div>
  );
}

export default function Settings() {
  const { toast } = useToast();
  const [config, setConfig] = useState<UserConfig | null>(null);
  const [dirty, setDirty] = useState(false);
  const [newZone, setNewZone] = useState("");
  const [newCost, setNewCost] = useState("");
  const [newPremium, setNewPremium] = useState("");

  const { data: serverConfig, isLoading } = useQuery<UserConfig>({
    queryKey: ["/api/config"],
  });

  useEffect(() => {
    if (serverConfig && !config) {
      setConfig(JSON.parse(JSON.stringify(serverConfig)));
    }
  }, [serverConfig, config]);

  const saveMutation = useMutation({
    mutationFn: async (cfg: UserConfig) => {
      await apiRequest("PUT", "/api/config", cfg);
      await apiRequest("POST", "/api/rescore");
    },
    onSuccess: () => {
      setDirty(false);
      queryClient.invalidateQueries();
      toast({ title: "Settings saved", description: "All properties have been re-scored with your new parameters." });
    },
    onError: (err: Error) => {
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
    },
  });

  const update = useCallback(<K extends keyof UserConfig>(key: K, value: UserConfig[K]) => {
    setConfig((prev) => prev ? { ...prev, [key]: value } : prev);
    setDirty(true);
  }, []);

  const updateWeight = useCallback((key: keyof UserConfig["scoringWeights"], value: number) => {
    setConfig((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        scoringWeights: { ...prev.scoringWeights, [key]: value },
      };
    });
    setDirty(true);
  }, []);

  const updateCriteria = useCallback(<K extends keyof UserConfig["dealCriteria"]>(key: K, value: UserConfig["dealCriteria"][K]) => {
    setConfig((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        dealCriteria: { ...prev.dealCriteria, [key]: value },
      };
    });
    setDirty(true);
  }, []);

  function addLandOverride() {
    if (!newZone.trim() || !newCost) return;
    setConfig((prev) => {
      if (!prev) return prev;
      const existing = prev.landCostOverrides.filter((o) => o.zone !== newZone.trim());
      return {
        ...prev,
        landCostOverrides: [...existing, { zone: newZone.trim(), costPerSF: Number(newCost) }],
      };
    });
    setNewZone("");
    setNewCost("");
    setDirty(true);
  }

  function removeLandOverride(zone: string) {
    setConfig((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        landCostOverrides: prev.landCostOverrides.filter((o) => o.zone !== zone),
      };
    });
    setDirty(true);
  }

  function addPremiumZone() {
    if (!newPremium.trim()) return;
    setConfig((prev) => {
      if (!prev) return prev;
      const zones = new Set(prev.premiumZones);
      zones.add(newPremium.trim());
      return { ...prev, premiumZones: [...zones] };
    });
    setNewPremium("");
    setDirty(true);
  }

  function removePremiumZone(zone: string) {
    setConfig((prev) => {
      if (!prev) return prev;
      return { ...prev, premiumZones: prev.premiumZones.filter((z) => z !== zone) };
    });
    setDirty(true);
  }

  function resetToDefaults() {
    if (serverConfig) {
      // Fetch the default config from the original
      fetch("/api/config")
        .then((r) => r.json())
        .then(() => {
          // We reset to the server default — on first deploy this is DEFAULT_CONFIG
          setConfig(JSON.parse(JSON.stringify(serverConfig)));
          setDirty(false);
        });
    }
  }

  if (isLoading || !config) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const weightsTotal = Object.values(config.scoringWeights).reduce((a, b) => a + b, 0);
  const weightsValid = Math.abs(weightsTotal - 1) < 0.01;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6 pb-24" data-testid="settings-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight flex items-center gap-2">
            <SettingsIcon className="w-5 h-5 text-primary" />
            Scoring Configuration
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Customize financial assumptions, scoring weights, and deal criteria. Changes re-score all properties.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={resetToDefaults}
            className="text-xs"
            data-testid="button-reset-defaults"
          >
            <RotateCcw className="w-3 h-3 mr-1.5" />
            Reset
          </Button>
          <Button
            size="sm"
            onClick={() => config && saveMutation.mutate(config)}
            disabled={!dirty || saveMutation.isPending || !weightsValid}
            className="text-xs"
            data-testid="button-save-config"
          >
            {saveMutation.isPending ? (
              <><Loader2 className="w-3 h-3 mr-1.5 animate-spin" /> Saving...</>
            ) : (
              <><Save className="w-3 h-3 mr-1.5" /> Save & Re-Score</>
            )}
          </Button>
        </div>
      </div>

      {dirty && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg px-4 py-2 text-xs text-amber-400 flex items-center gap-2">
          <RefreshCw className="w-3 h-3" />
          You have unsaved changes. Click "Save & Re-Score" to apply.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Financial Assumptions */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Calculator className="w-4 h-4 text-primary" />
              Financial Assumptions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <NumberInput
                label="Construction Cost"
                value={config.constructionCostPerSF}
                onChange={(v) => update("constructionCostPerSF", v)}
                prefix="$"
                suffix="/SF"
                testId="input-construction-cost"
              />
              <NumberInput
                label="Demolition Cost"
                value={config.demolitionCostPerSF}
                onChange={(v) => update("demolitionCostPerSF", v)}
                prefix="$"
                suffix="/SF"
                testId="input-demolition-cost"
              />
              <NumberInput
                label="GDV Residential"
                value={config.gdvPerSFResidential}
                onChange={(v) => update("gdvPerSFResidential", v)}
                prefix="$"
                suffix="/SF"
                testId="input-gdv-residential"
              />
              <NumberInput
                label="GDV Commercial"
                value={config.gdvPerSFCommercial}
                onChange={(v) => update("gdvPerSFCommercial", v)}
                prefix="$"
                suffix="/SF"
                testId="input-gdv-commercial"
              />
              <NumberInput
                label="Default Land Cost"
                value={config.defaultLandCostPerSF}
                onChange={(v) => update("defaultLandCostPerSF", v)}
                prefix="$"
                suffix="/SF"
                hint="Fallback when zone has no override"
                testId="input-default-land-cost"
              />
            </div>
          </CardContent>
        </Card>

        {/* Scoring Weights */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Sliders className="w-4 h-4 text-primary" />
              Scoring Weights
              {!weightsValid && (
                <Badge variant="destructive" className="text-[10px] ml-2">
                  Must total 100%
                </Badge>
              )}
              <Badge
                variant={weightsValid ? "outline" : "destructive"}
                className="text-[10px] ml-auto tabular-nums"
              >
                Total: {Math.round(weightsTotal * 100)}%
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <WeightSlider label="FAR Utilization" value={config.scoringWeights.farUtilization} onChange={(v) => updateWeight("farUtilization", v)} testId="slider-far" />
            <WeightSlider label="Unit Potential" value={config.scoringWeights.unitPotential} onChange={(v) => updateWeight("unitPotential", v)} testId="slider-units" />
            <WeightSlider label="Lot Size" value={config.scoringWeights.lotSize} onChange={(v) => updateWeight("lotSize", v)} testId="slider-lot" />
            <WeightSlider label="Building Age" value={config.scoringWeights.buildingAge} onChange={(v) => updateWeight("buildingAge", v)} testId="slider-age" />
            <WeightSlider label="Owner Type" value={config.scoringWeights.ownerType} onChange={(v) => updateWeight("ownerType", v)} testId="slider-owner" />
            <WeightSlider label="Zoning Premium" value={config.scoringWeights.zoningPremium} onChange={(v) => updateWeight("zoningPremium", v)} testId="slider-zoning" />
          </CardContent>
        </Card>

        {/* Deal Criteria */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Target className="w-4 h-4 text-primary" />
              Deal Criteria
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <NumberInput label="Min Score" value={config.dealCriteria.minScore} onChange={(v) => updateCriteria("minScore", v)} min={0} max={100} testId="input-min-score" />
              <NumberInput label="Min ROI (%)" value={config.dealCriteria.minROI} onChange={(v) => updateCriteria("minROI", v)} suffix="%" testId="input-min-roi" />
              <NumberInput label="Min FAR Gap" value={config.dealCriteria.minFarGap} onChange={(v) => updateCriteria("minFarGap", v)} step={0.1} testId="input-min-far-gap" />
              <NumberInput label="Min Potential Units" value={config.dealCriteria.minPotentialUnits} onChange={(v) => updateCriteria("minPotentialUnits", v)} testId="input-min-units" />
              <NumberInput label="Min Lot Area (SF)" value={config.dealCriteria.minLotArea} onChange={(v) => updateCriteria("minLotArea", v)} testId="input-min-lot" />
              <NumberInput label="Max Lot Area (SF)" value={config.dealCriteria.maxLotArea} onChange={(v) => updateCriteria("maxLotArea", v)} testId="input-max-lot" />
              <NumberInput
                label="Max Project Cost"
                value={config.dealCriteria.maxProjectCost}
                onChange={(v) => updateCriteria("maxProjectCost", v)}
                prefix="$"
                testId="input-max-cost"
              />
            </div>
            <div className="flex items-center justify-between pt-2">
              <Label className="text-xs text-muted-foreground">Exclude Landmarked / Historic</Label>
              <Switch
                checked={config.dealCriteria.excludeProtected}
                onCheckedChange={(v) => updateCriteria("excludeProtected", v)}
                data-testid="switch-exclude-protected"
              />
            </div>
          </CardContent>
        </Card>

        {/* Lot Size Sweet Spot */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary" />
              Lot Size Sweet Spot
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <NumberInput
                label="Min Sweet Spot"
                value={config.lotSizeSweetSpotMin}
                onChange={(v) => update("lotSizeSweetSpotMin", v)}
                suffix="SF"
                testId="input-ss-min"
              />
              <NumberInput
                label="Max Sweet Spot"
                value={config.lotSizeSweetSpotMax}
                onChange={(v) => update("lotSizeSweetSpotMax", v)}
                suffix="SF"
                testId="input-ss-max"
              />
            </div>
            <p className="text-[10px] text-muted-foreground">
              Lots within this range get the maximum lot-size score (100). Lots outside ramp down.
            </p>
          </CardContent>
        </Card>

        {/* Land Cost Overrides */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              Land Cost Overrides by Zone
              <Badge variant="outline" className="text-[10px] ml-2 tabular-nums">
                {config.landCostOverrides.length} zones
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1.5 mb-4">
              {config.landCostOverrides
                .sort((a, b) => a.zone.localeCompare(b.zone))
                .map((o) => (
                  <Badge
                    key={o.zone}
                    variant="secondary"
                    className="text-[10px] tabular-nums cursor-pointer hover:bg-destructive/20 group"
                    onClick={() => removeLandOverride(o.zone)}
                  >
                    {o.zone}: ${o.costPerSF}/SF
                    <Trash2 className="w-2.5 h-2.5 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Badge>
                ))}
            </div>
            <div className="flex items-end gap-2">
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">Zone</Label>
                <Input
                  value={newZone}
                  onChange={(e) => setNewZone(e.target.value)}
                  placeholder="e.g. R7-1"
                  className="h-7 text-xs w-[90px]"
                  data-testid="input-new-zone"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">$/SF</Label>
                <Input
                  type="number"
                  value={newCost}
                  onChange={(e) => setNewCost(e.target.value)}
                  placeholder="100"
                  className="h-7 text-xs w-[70px]"
                  data-testid="input-new-cost"
                />
              </div>
              <Button variant="outline" size="sm" onClick={addLandOverride} className="h-7 text-xs" data-testid="button-add-override">
                <Plus className="w-3 h-3 mr-1" /> Add
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Premium Zones */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              Premium Zones
              <Badge variant="outline" className="text-[10px] ml-2 tabular-nums">
                {config.premiumZones.length} zones
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-[10px] text-muted-foreground mb-3">
              Properties in these zones get the maximum zoning premium score (100).
            </p>
            <div className="flex flex-wrap gap-1.5 mb-4">
              {config.premiumZones.sort().map((z) => (
                <Badge
                  key={z}
                  variant="secondary"
                  className="text-[10px] cursor-pointer hover:bg-destructive/20 group"
                  onClick={() => removePremiumZone(z)}
                >
                  {z}
                  <Trash2 className="w-2.5 h-2.5 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                </Badge>
              ))}
            </div>
            <div className="flex items-end gap-2">
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">Zone District</Label>
                <Input
                  value={newPremium}
                  onChange={(e) => setNewPremium(e.target.value)}
                  placeholder="e.g. R9"
                  className="h-7 text-xs w-[100px]"
                  data-testid="input-new-premium"
                  onKeyDown={(e) => e.key === "Enter" && addPremiumZone()}
                />
              </div>
              <Button variant="outline" size="sm" onClick={addPremiumZone} className="h-7 text-xs" data-testid="button-add-premium">
                <Plus className="w-3 h-3 mr-1" /> Add
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
