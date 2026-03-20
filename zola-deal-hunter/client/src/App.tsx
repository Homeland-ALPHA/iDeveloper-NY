import { Switch, Route, Router, Link, useLocation } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { PerplexityAttribution } from "@/components/PerplexityAttribution";
import Dashboard from "@/pages/dashboard";
import Explorer from "@/pages/explorer";
import PropertyDetail from "@/pages/property-detail";
import CapitalPlanner from "@/pages/capital-planner";
import MapView from "@/pages/map-view";
import Settings from "@/pages/settings";
import NotFound from "@/pages/not-found";
import {
  LayoutDashboard,
  Search,
  DollarSign,
  Map,
  Building2,
  Upload,
  Settings as SettingsIcon,
} from "lucide-react";
import { useState, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "./lib/queryClient";

function AppLayout() {
  const [location] = useLocation();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const nav = [
    { path: "/", label: "Dashboard", icon: LayoutDashboard },
    { path: "/explorer", label: "Deal Explorer", icon: Search },
    { path: "/map", label: "Map View", icon: Map },
    { path: "/capital", label: "Capital Planner", icon: DollarSign },
    { path: "/settings", label: "Settings", icon: SettingsIcon },
  ];

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const buffer = await file.arrayBuffer();
      await apiRequest("POST", "/api/upload", buffer);
      toast({ title: "File uploaded", description: "Data refreshed successfully" });
      queryClient.invalidateQueries();
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="flex h-screen overflow-hidden" data-testid="app-layout">
      {/* Sidebar */}
      <aside className="w-[220px] flex-shrink-0 border-r border-border bg-card/50 flex flex-col">
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
              <Building2 className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h1 className="text-sm font-semibold tracking-tight">Zola Deal Hunter</h1>
              <p className="text-[10px] text-muted-foreground">NYC Development Tool</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-2 space-y-0.5">
          {nav.map((item) => {
            const isActive = location === item.path || (item.path !== "/" && location.startsWith(item.path));
            return (
              <Link key={item.path} href={item.path}>
                <div
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-sm cursor-pointer transition-colors ${
                    isActive
                      ? "bg-primary/15 text-primary font-medium"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent"
                  }`}
                  data-testid={`nav-${item.label.toLowerCase().replace(/\s/g, '-')}`}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-border">
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleUpload}
            className="hidden"
            data-testid="input-file-upload"
          />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-md text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors disabled:opacity-50"
            data-testid="button-upload"
          >
            <Upload className="w-3.5 h-3.5" />
            {uploading ? "Processing..." : "Upload New Data"}
          </button>
          <p className="text-[10px] text-muted-foreground mt-1.5 text-center">
            Drop any Zola Excel export
          </p>
        </div>

        <div className="p-3 border-t border-border">
          <PerplexityAttribution />
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <Switch>
          <Route path="/" component={Dashboard} />
          <Route path="/explorer" component={Explorer} />
          <Route path="/property/:id" component={PropertyDetail} />
          <Route path="/map" component={MapView} />
          <Route path="/capital" component={CapitalPlanner} />
          <Route path="/settings" component={Settings} />
          <Route component={NotFound} />
        </Switch>
      </main>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router hook={useHashLocation}>
        <AppLayout />
      </Router>
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
