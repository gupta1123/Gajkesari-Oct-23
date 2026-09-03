"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { AlertCircle, Calendar, ChevronRight, Home, LocateFixed, MapPin, Maximize2, RefreshCw, RotateCcw, Search, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Heading } from "@/components/ui/typography";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { employeeLocationAge, type EmployeeMapMarker } from "@/lib/employee-map";

const LeafletMap = dynamic(() => import("@/components/leaflet-map"), { ssr: false });

const getNumericId = (value: unknown): number | null => {
  if (typeof value === "number" && !Number.isNaN(value)) return value;
  if (typeof value === "string" && value.trim() !== "" && !Number.isNaN(Number(value))) {
    return Number(value);
  }
  return null;
};

export interface OverviewSectionProps {
  kpis: { totalVisits: number; activeEmployees: number; liveLocations: number };
  states: Array<{ id: number; name: string; employeeCount: number; color?: string }>;
  onStateSelect: (state: { id: number; name: string; employeeCount: number; color?: string }) => void;
  markers: EmployeeMapMarker[];
  highlightedEmployee: Record<string, unknown> | null;
  selectedEmployeeMarkers: EmployeeMapMarker[];
  onResetView: () => void;
  mapCenter: [number, number];
  mapZoom: number;
  onMarkerClick: (marker: EmployeeMapMarker) => void;
  onEmployeeSelect: (employee: Record<string, unknown>) => void;
  employeeList: Record<string, unknown>[];
  journeyLoading?: boolean;
  journeyError?: string | null;
  locationsLoading?: boolean;
  locationsError?: string | null;
  locationsSyncedAt: number | null;
  onRefreshLocations: () => void;
  periodLabel: string;
}

export default function OverviewSection({
  kpis,
  states,
  onStateSelect,
  markers,
  highlightedEmployee,
  selectedEmployeeMarkers,
  onResetView,
  mapCenter,
  mapZoom,
  onMarkerClick,
  onEmployeeSelect,
  employeeList,
  journeyLoading,
  journeyError,
  locationsLoading,
  locationsError,
  locationsSyncedAt,
  onRefreshLocations,
  periodLabel,
}: OverviewSectionProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [city, setCity] = useState("all");
  const [freshness, setFreshness] = useState("all");
  const [mobileView, setMobileView] = useState<"map" | "list">("map");
  const [mapResetKey, setMapResetKey] = useState(0);
  const [showAllLocations, setShowAllLocations] = useState(false);
  const [now, setNow] = useState(Date.now);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const cities = useMemo(() => [...new Set(employeeList
    .map((employee) => String(employee.location || "").split(",")[0].trim()).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b)), [employeeList]);

  const filteredEmployeeList = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    return employeeList.filter((employee) => {
      const recent = employee.hasLocation && employeeLocationAge(employee.locationTimestamp as number | null, now).fresh;
      return [employee.name, employee.location, employee.position].some((value) => String(value || "").toLowerCase().includes(query))
        && (city === "all" || String(employee.location || "").split(",")[0].trim() === city)
        && (freshness === "all" || (freshness === "recent" ? recent : freshness === "missing" ? !employee.hasLocation : employee.hasLocation && !recent));
    }).sort((a, b) => Number(Boolean(b.hasLocation)) - Number(Boolean(a.hasLocation))
      || (Number(b.locationTimestamp) || 0) - (Number(a.locationTimestamp) || 0)
      || String(a.name).localeCompare(String(b.name)));
  }, [employeeList, searchQuery, city, freshness, now]);

  const visibleIds = useMemo(() => new Set(filteredEmployeeList.map((employee) => getNumericId(employee.id))), [filteredEmployeeList]);
  const overviewMarkerId = getNumericId(filteredEmployeeList.find((employee) => employee.hasLocation)?.id);

  const highlightedEmployeeId = highlightedEmployee == null
    ? null
    : getNumericId(highlightedEmployee.id) ??
      getNumericId(highlightedEmployee.listId) ??
      getNumericId(highlightedEmployee.employeeId);

  useEffect(() => {
    if (highlightedEmployeeId != null && !visibleIds.has(highlightedEmployeeId)) onResetView();
  }, [highlightedEmployeeId, visibleIds, onResetView]);

  useEffect(() => {
    const row = listRef.current?.querySelector<HTMLButtonElement>(`[data-employee-id="${highlightedEmployeeId}"]`);
    if (row && listRef.current) listRef.current.scrollTop = Math.max(0, row.offsetTop - 8);
  }, [highlightedEmployeeId]);

  const activeMarkers = useMemo(() => markers.filter((marker) => {
    const id = getNumericId(marker.employeeId) ?? getNumericId(marker.id);
    return visibleIds.has(id) && (highlightedEmployeeId == null || id === highlightedEmployeeId);
  }), [markers, highlightedEmployeeId, visibleIds]);

  const combinedMarkers = useMemo(
    () => [...activeMarkers, ...(highlightedEmployeeId != null && visibleIds.has(highlightedEmployeeId) ? selectedEmployeeMarkers : [])],
    [activeMarkers, selectedEmployeeMarkers, highlightedEmployeeId, visibleIds],
  );
  const visitMarkerCount = selectedEmployeeMarkers.filter((marker) => marker.type === "visit").length;

  return (
    <>
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {[
          { label: 'Visits in period', value: kpis.totalVisits, icon: Calendar },
          { label: 'Employees with activity', value: kpis.activeEmployees, icon: Users },
          { label: 'Last-known locations', value: kpis.liveLocations, icon: MapPin },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-lg border bg-card px-3 py-3 sm:px-4">
            <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
              <span>{label}</span>
              <Icon className="hidden h-4 w-4 shrink-0 sm:block" />
            </div>
            {/* Keep KPI spacing independent of the global paragraph margins. */}
            <div className="mt-1 text-xl font-semibold tabular-nums text-foreground">{value}</div>
          </div>
        ))}
      </div>

      {states.length > 0 && (
        <div className="space-y-3">
          <Heading as="h2" size="lg" weight="semibold" className="text-base">
            State-wise Employee Distribution
          </Heading>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {states.map((state) => (
              <button
                key={state.id}
                type="button"
                onClick={() => onStateSelect(state)}
                className="inline-flex items-center gap-2 rounded-md border bg-card px-3 py-2 text-xs font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
              >
                <span>{state.name}</span>
                <span className="font-semibold tabular-nums text-foreground">{state.employeeCount}</span>
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            ))}
          </div>
        </div>
      )}

      <section className="space-y-3" aria-label="Employee locations">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="m-0 text-sm font-semibold">Employee locations</h2>
            <div className="mt-0.5 text-xs text-muted-foreground">Last-known positions · select an employee to see home and visits.</div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {locationsLoading ? "Refreshing…" : locationsError ? "Refresh failed" : locationsSyncedAt
                ? `Synced ${new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit' }).format(locationsSyncedAt)}` : "Not synced"}
            </span>
            <Button size="sm" variant="outline" onClick={onRefreshLocations} disabled={locationsLoading} aria-label="Refresh employee locations"><RefreshCw className="h-3.5 w-3.5" /></Button>
            <Button size="sm" variant="outline" aria-label="View all locations" onClick={() => { setShowAllLocations(true); setMapResetKey((key) => key + 1); onResetView(); }}>
              <Maximize2 className="mr-1.5 h-3.5 w-3.5" />View all
            </Button>
            <Button size="sm" variant="outline" onClick={() => { setShowAllLocations(false); setMapResetKey((key) => key + 1); onResetView(); }}>
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" />Reset view
            </Button>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[180px] flex-1 sm:max-w-xs">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input type="search" aria-label="Search employees" placeholder="Search employees…" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} className="h-9 pl-8 text-sm" />
          </div>
          <Select value={city} onValueChange={setCity}>
            <SelectTrigger aria-label="Assigned city" className="h-9 w-[160px]"><SelectValue placeholder="All assigned cities" /></SelectTrigger>
            <SelectContent><SelectItem value="all">All assigned cities</SelectItem>{cities.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={freshness} onValueChange={setFreshness}>
            <SelectTrigger aria-label="Location freshness" className="h-9 w-[170px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All locations</SelectItem><SelectItem value="recent">Updated &lt;15 min</SelectItem>
              <SelectItem value="older">Older updates</SelectItem><SelectItem value="missing">No location</SelectItem>
            </SelectContent>
          </Select>
          <span className="ml-auto text-xs text-muted-foreground">{filteredEmployeeList.length} of {employeeList.length} employees</span>
        </div>
        {locationsError && <div role="alert" className="flex items-center gap-2 rounded-md border border-amber-300/50 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:bg-amber-950/30 dark:text-amber-200"><AlertCircle className="h-4 w-4 shrink-0" />{locationsError}</div>}
        <div className="flex gap-1 lg:hidden" aria-label="Location display">
          {(["map", "list"] as const).map((mode) => <Button key={mode} size="sm" variant={mobileView === mode ? "default" : "outline"} aria-pressed={mobileView === mode} onClick={() => setMobileView(mode)}>{mode === "map" ? "Map" : "Employees"}</Button>)}
        </div>
        <div className="grid min-w-0 gap-3 lg:grid-cols-[minmax(0,1fr)_300px] xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className={`${mobileView === "map" ? "flex" : "hidden"} min-w-0 flex-col overflow-hidden rounded-lg border bg-card lg:flex`}>
            <div className="flex min-h-10 shrink-0 flex-wrap items-center gap-x-4 gap-y-1 border-b px-3 py-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5"><LocateFixed className="h-3.5 w-3.5" />Last known</span>
              {highlightedEmployeeId != null && <><span className="inline-flex items-center gap-1.5"><Home className="h-3.5 w-3.5" />Home</span><span>1, 2, 3 · visits in order</span></>}
              <span className="ml-auto">{highlightedEmployeeId != null ? periodLabel : "Latest available updates"}</span>
            </div>
            <div className="relative isolate h-[55dvh] min-h-[360px] grow lg:h-[calc(100dvh-350px)]">
              <div className="absolute inset-0">
                <LeafletMap center={mapCenter} zoom={mapZoom} highlightedEmployee={highlightedEmployee} markers={combinedMarkers}
                  onMarkerClick={onMarkerClick} fitMarkers
                  overviewZoom={highlightedEmployeeId == null && !showAllLocations ? 11 : undefined}
                  overviewMarkerId={overviewMarkerId}
                  viewKey={`${highlightedEmployeeId ?? "all"}:${highlightedEmployeeId != null ? periodLabel : ""}:${searchQuery}:${city}:${freshness}:${showAllLocations}:${mapResetKey}`} />
              </div>
              {combinedMarkers.length === 0 && <div className="pointer-events-none absolute inset-0 z-[500] grid place-items-center p-6">
                <div role="status" className="max-w-sm rounded-lg border bg-card/95 px-4 py-3 text-center text-sm shadow-sm">
                  {locationsLoading || journeyLoading ? "Loading locations…" : highlightedEmployeeId != null
                    ? "No mapped locations for this employee in the selected period." : filteredEmployeeList.length
                      ? "No last-known positions for these employees." : "No employees match your filters."}
                </div>
              </div>}
            </div>
            {highlightedEmployeeId != null && <div className="shrink-0 border-t px-3 py-2.5 text-xs" aria-live="polite">
              <div className="flex flex-wrap items-center justify-between gap-1">
                <span className="font-medium">{String(highlightedEmployee?.name || "Employee")}</span>
                <span className="text-muted-foreground">{journeyLoading ? "Loading home and visits…" : `${visitMarkerCount} mapped ${visitMarkerCount === 1 ? "visit" : "visits"} · ${selectedEmployeeMarkers.some((marker) => marker.type === "house") ? "Home available" : "No saved home location"}`}</span>
              </div>
              {journeyError && <div role="alert" className="mt-1 flex items-center gap-2 text-destructive">{journeyError}<button type="button" className="underline" onClick={() => highlightedEmployee && onEmployeeSelect(highlightedEmployee)}>Retry</button></div>}
              <div className="mt-1 text-muted-foreground">Select a numbered group to explore nearby locations.</div>
            </div>}
          </div>
          <aside className={`${mobileView === "list" ? "flex" : "hidden"} min-h-0 flex-col overflow-hidden rounded-lg border bg-card lg:flex`} aria-label="Employee location list">
            <div className="flex min-h-10 items-center justify-between border-b px-3 py-2">
              <h3 className="m-0 text-sm font-medium">Employees</h3><span className="text-xs text-muted-foreground">{filteredEmployeeList.filter((employee) => employee.hasLocation).length} with GPS</span>
            </div>
            <div ref={listRef} className="relative max-h-[65dvh] flex-1 divide-y overflow-y-auto lg:max-h-[calc(100dvh-310px)]">
              {filteredEmployeeList.length === 0 ? <div className="p-5 text-center text-sm text-muted-foreground">{locationsLoading ? "Loading employee locations…" : "No employees match your filters."}</div> : filteredEmployeeList.map((employee) => {
                const id = getNumericId(employee.id);
                const name = String(employee.name || "Employee");
                const age = employeeLocationAge(employee.locationTimestamp as number | null, now);
                return <button key={String(employee.listId)} data-employee-id={id} type="button" aria-pressed={highlightedEmployeeId === id}
                  onClick={() => { onEmployeeSelect(employee); setMobileView("map"); }}
                  className={`block w-full border-l-2 px-3 py-3 text-left focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring ${highlightedEmployeeId === id ? "border-l-primary bg-accent" : "border-l-transparent hover:bg-muted/50"}`}>
                  <div className="flex items-start gap-2.5">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-muted text-[11px] font-medium" aria-hidden="true">{name.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]).join("")}</span>
                    <div className="min-w-0 flex-1"><div className="truncate text-[13px] font-medium leading-5" title={name}>{name}</div><div className="mt-0.5 text-xs text-muted-foreground">{String(employee.position || "")}</div></div>
                    <ChevronRight className="mt-1 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  </div>
                  <div className="mt-2 truncate text-xs text-muted-foreground" title="Assigned city, not a GPS-derived address">Assigned: {String(employee.location || "Not set")}</div>
                  <div className="mt-1.5 flex flex-wrap items-center justify-between gap-1 text-[11px] leading-5">
                    <span title={String(employee.formattedLastUpdated || "Time unavailable")} className={`inline-flex items-center gap-1.5 ${employee.hasLocation && age.fresh ? "text-emerald-700 dark:text-emerald-300" : "text-muted-foreground"}`}>
                      <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${employee.hasLocation && age.fresh ? "bg-emerald-500" : "bg-muted-foreground/50"}`} />{employee.hasLocation ? age.label : "No location available"}
                    </span>
                    <span className="text-muted-foreground">{Number(employee.visits || 0)} {Number(employee.visits) === 1 ? "visit" : "visits"}</span>
                  </div>
                </button>;
              })}
            </div>
            <div className="border-t px-3 py-2 text-[11px] leading-5 text-muted-foreground">Visit counts: {periodLabel}. GPS shows the latest available update.</div>
          </aside>
        </div>
      </section>
    </>
  );
}
