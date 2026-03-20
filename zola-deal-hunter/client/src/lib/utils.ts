import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number): string {
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value.toFixed(0)}`;
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(Math.round(value));
}

export function formatSF(value: number): string {
  return `${formatNumber(value)} SF`;
}

export function getScoreLabel(score: number): string {
  if (score >= 80) return 'A+ DEAL';
  if (score >= 65) return 'STRONG';
  if (score >= 50) return 'MODERATE';
  if (score >= 35) return 'BELOW AVG';
  return 'PASS';
}

export function getScoreColorClass(score: number): string {
  if (score >= 80) return 'text-emerald-400';
  if (score >= 65) return 'text-blue-400';
  if (score >= 50) return 'text-amber-400';
  if (score >= 35) return 'text-orange-400';
  return 'text-red-400';
}

export function getScoreBgClass(score: number): string {
  if (score >= 80) return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
  if (score >= 65) return 'bg-blue-500/15 text-blue-400 border-blue-500/30';
  if (score >= 50) return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
  if (score >= 35) return 'bg-orange-500/15 text-orange-400 border-orange-500/30';
  return 'bg-red-500/15 text-red-400 border-red-500/30';
}

export function getDealSignalColor(signal: string): string {
  switch (signal) {
    case 'STRONG': return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
    case 'WEAK': return 'bg-red-500/15 text-red-400 border-red-500/30';
    case 'UNATTAINABLE': return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
    default: return 'bg-muted text-muted-foreground';
  }
}

export function getOwnerTypeLabel(type: string | null): string {
  switch (type) {
    case 'P': return 'Private';
    case 'C': return 'City';
    case 'O': return 'Other Gov';
    case 'X': return 'Tax-Exempt';
    case 'M': return 'Mixed';
    default: return 'Private (Likely)';
  }
}
