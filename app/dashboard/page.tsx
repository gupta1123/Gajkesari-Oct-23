"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import {
  format,
  subDays,
  startOfWeek,
  startOfMonth,
} from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MapPin, Users, Calendar, Building, Loader2, CalendarIcon } from "lucide-react";
import OverviewSection from "@/components/dashboard/OverviewSection";
import StateSection from "@/components/dashboard/StateSection";
import EmployeeDetailSection from "@/components/dashboard/EmployeeDetailSection";
import { useDashboardHeader } from "@/components/dashboard-header-context";
import { API, type EmployeeUserDto, type AttendanceLogItem, type TeamDataDto, type CurrentUserDto } from "@/lib/api";
import { useAuth } from "@/components/auth-provider";
import { Skeleton } from "@/components/ui/skeleton";
import DailyPricingModal from "@/components/DailyPricingModal";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { SpacedCalendar } from "@/components/ui/spaced-calendar";
import { isManagerRoleValue, getCorrectedRoleFlags } from "@/lib/auth";
import { getUniqueFieldOfficersFromTeams } from "@/lib/team-access";
import { DateRangeError, isDateRangeInvalid } from "@/components/date-range-error";
import { INDIA_MAP_CENTER, INDIA_MAP_ZOOM } from "@/lib/map-region";
import { latestEmployeeLocations, mapCoordinates, mapTimestamp, journeyMapMarkers } from "@/lib/employee-map";

const DEFAULT_MAP_CENTER: [number, number] = [20.5937, 78.9629];
const DEFAULT_MAP_ZOOM = 5;
const DATE_FILTER_STATE_KEY = "dashboard.dateFilter.v1";

const normalizeCityName = (city?: string | null): string => {
  if (!city) return "";
  return city
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

const colorPalette = [
  "bg-blue-500",
  "bg-green-500",
  "bg-yellow-500",
  "bg-red-500",
  "bg-purple-500",
  "bg-pink-500",
  "bg-indigo-500",
  "bg-teal-500",
];

// Data fetched from APIs; no hardcoded mocks

type Employee = {
  id: number;
  name: string;
  position: string;
  avatar: string;
  lastUpdated: string;
  status: string;
  location: string;
};
type ExtendedEmployee = Employee & {
  listId: string;
  visits: number;
  formattedLastUpdated: string;
  hasLocation: boolean;
  locationTimestamp: number | null;
};

type MapMarker = {
  id: number | string;
  name?: string;
  lat: number;
  lng: number;
  subtitle?: string;
  type?: "live" | "house" | "visit";
  tooltipLines?: string[];
  employeeId?: number;
  order?: number;
  updatedAt?: number | null;
};

type StateItem = { id: number; name: string; employeeCount: number; color: string };
type SelectedState = StateItem | null;
type ViewType = "dashboard" | "state" | "employeeDetail";
type ViewHistoryState = {
  view: ViewType;
  selectedState?: SelectedState;
  selectedEmployee?: Employee | null;
};

type DateRangeValue = {
  start: Date;
  end: Date;
};

const dateRanges = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "thisWeek", label: "This Week" },
  { value: "thisMonth", label: "This Month" },
  { value: "custom", label: "Custom Range" },
] as const;
type DateRangeOption = typeof dateRanges[number]["value"];

const StateSectionSkeleton = () => (
  <div className="space-y-6">
    <Skeleton className="h-8 w-56" />
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, idx) => (
        <Card key={idx} className="gap-0 border border-border/70 shadow-sm bg-card py-0">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-xl" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
            <div className="space-y-2 pt-1 border-t">
              <Skeleton className="h-3.5 w-2/3" />
              <Skeleton className="h-3.5 w-1/2" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  </div>
);

export default function DashboardPage() {
  const { userRole, userData, currentUser, token, teamId, correctedRoleFlags } = useAuth();
  const [selectedDateRange, setSelectedDateRange] = useState<DateRangeOption>("today");
  const [customStartDate, setCustomStartDate] = useState<Date | undefined>(undefined);
  const [customEndDate, setCustomEndDate] = useState<Date | undefined>(undefined);
  const customDateRangeInvalid = isDateRangeInvalid(customStartDate, customEndDate);
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false);
  const [isStartDatePopoverOpen, setIsStartDatePopoverOpen] = useState(false);
  const [isEndDatePopoverOpen, setIsEndDatePopoverOpen] = useState(false);
  const [view, setView] = useState<ViewType>("dashboard");
  const [selectedState, setSelectedState] = useState<SelectedState>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>(DEFAULT_MAP_CENTER);
  const [mapZoom, setMapZoom] = useState(DEFAULT_MAP_ZOOM);
  const [highlightedEmployee, setHighlightedEmployee] =
    useState<ExtendedEmployee | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [teamMembers, setTeamMembers] = useState<Employee[]>([]);
  const [states, setStates] = useState<StateItem[]>([]);
  const [kpis, setKpis] = useState({ totalVisits: 0, activeEmployees: 0, liveLocations: 0 });
  const [countsByEmployee, setCountsByEmployee] = useState<Map<number, number>>(new Map());
  const [markers, setMarkers] = useState<MapMarker[]>([]);
  const [selectedEmployeeMarkers, setSelectedEmployeeMarkers] = useState<MapMarker[]>([]);
  const journeyRequestRef = useRef(0);
  const [journeyLoading, setJourneyLoading] = useState(false);
  const [journeyError, setJourneyError] = useState<string | null>(null);
  const [locationsLoading, setLocationsLoading] = useState(true);
  const [locationsError, setLocationsError] = useState<string | null>(null);
  const [locationsSyncedAt, setLocationsSyncedAt] = useState<number | null>(null);
  const [locationRefreshKey, setLocationRefreshKey] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isManager, setIsManager] = useState(false);
  const [isRoleDetermined, setIsRoleDetermined] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDateRangeLoading, setIsDateRangeLoading] = useState(false);
  const [isPricingModalOpen, setIsPricingModalOpen] = useState(false);
  const [hasCheckedPricing, setHasCheckedPricing] = useState(false);
  const [isPricingDismissed, setIsPricingDismissed] = useState(false);
  const [hasHydratedViewState, setHasHydratedViewState] = useState(false);
  const VIEW_STATE_KEY = 'dashboard.view.state.v1';
  const PRICING_MODAL_DISMISS_KEY = 'pricingModalDismissed';
  const [hasHydratedDateFilter, setHasHydratedDateFilter] = useState(false);
  const [isStateSectionLoading, setIsStateSectionLoading] = useState(false);
  const stateSkeletonTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevViewRef = useRef<"dashboard" | "state" | "employeeDetail">(view);
  const isHandlingPopRef = useRef(false);
  const pushHistoryState = useCallback((state: ViewHistoryState) => {
    if (typeof window === "undefined" || isHandlingPopRef.current) return;
    try {
      window.history.pushState(state, "");
    } catch {}
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handlePopState = (event: PopStateEvent) => {
      const historyState = (event.state as ViewHistoryState) ?? { view: "dashboard" };
      isHandlingPopRef.current = true;
      try {
        if (historyState.view === "state") {
          setView("state");
          setSelectedState(historyState.selectedState ?? null);
          setSelectedEmployee(null);
          setIsStateSectionLoading(true);
        } else if (historyState.view === "employeeDetail") {
          setView("employeeDetail");
          if (historyState.selectedState) {
            setSelectedState(historyState.selectedState);
          }
          setSelectedEmployee(historyState.selectedEmployee ?? null);
        } else {
          setView("dashboard");
          setSelectedState(null);
          setSelectedEmployee(null);
          setHighlightedEmployee(null);
          setSelectedEmployeeMarkers([]);
          setMapCenter(DEFAULT_MAP_CENTER);
          setMapZoom(DEFAULT_MAP_ZOOM);
        }
      } finally {
        isHandlingPopRef.current = false;
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // Hydrate date filters if user navigates away (e.g. visit detail) and comes back
  useEffect(() => {
    if (typeof window === "undefined") {
      setHasHydratedDateFilter(true);
      return;
    }
    try {
      const raw = sessionStorage.getItem(DATE_FILTER_STATE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as {
          selectedDateRange?: string;
          customStartDate?: string | null;
          customEndDate?: string | null;
        };
        const isValidRange = saved?.selectedDateRange && dateRanges.some((range) => range.value === saved.selectedDateRange);
        if (isValidRange && typeof saved.selectedDateRange === "string") {
          const persistedRange = saved.selectedDateRange as DateRangeOption;
          setSelectedDateRange(persistedRange);
          setShowCustomDatePicker(persistedRange === "custom");
        }
        if (saved?.customStartDate) {
          setCustomStartDate(new Date(saved.customStartDate));
        }
        if (saved?.customEndDate) {
          setCustomEndDate(new Date(saved.customEndDate));
        }
      }
    } catch (error) {
      console.error("Failed to hydrate dashboard date filters:", error);
    } finally {
      setHasHydratedDateFilter(true);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !hasHydratedDateFilter) return;
    try {
      sessionStorage.setItem(
        DATE_FILTER_STATE_KEY,
        JSON.stringify({
          selectedDateRange,
          customStartDate: customStartDate?.toISOString() ?? null,
          customEndDate: customEndDate?.toISOString() ?? null,
        })
      );
    } catch (error) {
      console.error("Failed to persist dashboard date filters:", error);
    }
  }, [selectedDateRange, customStartDate, customEndDate, hasHydratedDateFilter]);

  useEffect(() => {
    if (typeof window === 'undefined' || hasHydratedViewState) return;

    let initialHistoryState: ViewHistoryState = {
      view: "dashboard",
      selectedState: null,
      selectedEmployee: null,
    };

    try {
      const raw = sessionStorage.getItem(VIEW_STATE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as ViewHistoryState;
        if (saved?.selectedState) {
          setSelectedState(saved.selectedState);
        }
        if (saved?.view === "employeeDetail" && saved?.selectedEmployee) {
          setSelectedEmployee(saved.selectedEmployee);
          setView("employeeDetail");
        } else if (saved?.view === "state" && saved?.selectedState) {
          setView("state");
        }
        initialHistoryState = {
          view: saved?.view ?? "dashboard",
          selectedState: saved?.selectedState ?? null,
          selectedEmployee: saved?.selectedEmployee ?? null,
        };
      }
    } catch {}

    try {
      window.history.replaceState(initialHistoryState, "");
    } catch {}

    setHasHydratedViewState(true);
  }, [VIEW_STATE_KEY, hasHydratedViewState]);

  // Determine role using corrected flags from auth context (preferred method)
  useEffect(() => {
    // Use corrected role flags if available (most reliable - based on teamId fetch)
    const roleFlags = getCorrectedRoleFlags(userRole, currentUser, correctedRoleFlags, teamId);
    
    console.log('Dashboard - Role detection - userRole:', userRole);
    console.log('Dashboard - Role detection - teamId:', teamId);
    console.log('Dashboard - Role detection - correctedRoleFlags:', correctedRoleFlags);
    console.log('Dashboard - Role detection - final isManager:', roleFlags.isManager);
    console.log('Dashboard - Role detection - final isFieldOfficer:', roleFlags.isFieldOfficer);
    console.log('Dashboard - Role detection - final isAdmin:', roleFlags.isAdmin);

    setIsManager(roleFlags.isManager);
    setCurrentUserRole(userRole);
    setIsRoleDetermined(true);
  }, [userRole, currentUser, teamId, correctedRoleFlags]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const dismissed = sessionStorage.getItem(PRICING_MODAL_DISMISS_KEY) === 'true';
    setIsPricingDismissed(dismissed);
  }, []);

  const handlePricingModalDismiss = useCallback(() => {
    setIsPricingModalOpen(false);
    if (!isPricingDismissed) {
      setIsPricingDismissed(true);
      if (typeof window !== 'undefined') {
        sessionStorage.setItem(PRICING_MODAL_DISMISS_KEY, 'true');
      }
    }
  }, [isPricingDismissed]);

  useEffect(() => {
    console.log('Pricing check useEffect triggered:', {
      token: token ? 'present' : 'missing',
      isPricingDismissed,
      hasCheckedPricing,
      isRoleDetermined,
      currentUserRole
    });
    
    if (!token || isPricingDismissed || hasCheckedPricing || !isRoleDetermined) return;

    const normalizedRole = (currentUserRole ?? '').toUpperCase();
    const isAdmin = normalizedRole.includes('ADMIN');
    console.log('User role check:', { normalizedRole, isAdmin });
    
    if (!isAdmin) {
      console.log('User is not admin, skipping pricing check');
      setHasCheckedPricing(true);
      return;
    }

    const fetchPricing = async () => {
      try {
        const today = new Date().toISOString().split('T')[0];
        console.log('Checking pricing for today:', today);
        const response = await fetch(`https://api.gajkesaristeels.in/brand/getByDateRange?start=${today}&end=${today}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          console.log('Pricing API response not ok:', response.status, response.statusText);
          setHasCheckedPricing(true);
          return;
        }

        const data: Array<Record<string, unknown>> = await response.json();
        console.log('Pricing API response data:', data);
        
        const hasGajkesari = data.some(
          (item) => typeof item.brandName === 'string' && item.brandName.toLowerCase() === 'gajkesari'
        );
        
        console.log('Has Gajkesari pricing:', hasGajkesari);

        if (!hasGajkesari) {
          console.log('No Gajkesari pricing found, showing modal');
          setIsPricingModalOpen(true);
        } else {
          console.log('Gajkesari pricing found, not showing modal');
        }

        setHasCheckedPricing(true);
      } catch (err) {
        console.error('Dashboard - Error checking Gajkesari pricing:', err);
        setHasCheckedPricing(true);
      }
    };

    void fetchPricing();
  }, [token, currentUserRole, isPricingDismissed, hasCheckedPricing, isRoleDetermined]);

  // Persist view chain for back navigation (dashboard -> state -> employeeDetail)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      sessionStorage.setItem(
        VIEW_STATE_KEY,
        JSON.stringify({ view, selectedState, selectedEmployee })
      );
    } catch {}
  }, [view, selectedState, selectedEmployee]);

  // Load all scoped team members for managers. Never fall back to all employees for manager access.
  useEffect(() => {
    const loadTeamMembers = async () => {
      if (!isManager) return;

      if (userData?.employeeId) {
        try {
          console.log('Loading team members using employeeId:', userData.employeeId);
          const teamData: TeamDataDto[] = await API.getTeamByEmployee(userData.employeeId);
          const teamMemberIds = new Set(getUniqueFieldOfficersFromTeams(teamData).map((fo) => fo.id));
          const filteredEmployees = employees.filter((emp) => teamMemberIds.has(emp.id));
          setTeamMembers(filteredEmployees);
          console.log('Team members loaded:', filteredEmployees.length);
        } catch (err) {
          console.error('Failed to load team members:', err);
          setError('Failed to load team members');
          setTeamMembers([]);
        }
      } else if (teamId) {
        try {
          console.log('Loading team members using teamId from auth context:', teamId);
          const teamData: TeamDataDto = await API.getTeamById(teamId);
          const teamMemberIds = new Set((teamData.fieldOfficers ?? []).map((fo) => fo.id));
          const filteredEmployees = employees.filter((emp) => teamMemberIds.has(emp.id));
          setTeamMembers(filteredEmployees);
          console.log('Team members loaded:', filteredEmployees.length);
        } catch (err) {
          console.error('Failed to load team members using teamId:', err);
          setError('Failed to load team members');
          setTeamMembers([]);
        }
      } else {
        setTeamMembers([]);
      }
    };
    
    if (isManager && employees.length > 0) {
      loadTeamMembers();
    }
  }, [isManager, userData?.employeeId, employees, teamId]);

  // Load employees based on user role
  useEffect(() => {
    const loadEmployees = async () => {
      if (!isRoleDetermined) return;
      
      try {
        setIsLoading(true);
        const data: EmployeeUserDto[] = await API.getAllEmployees();
        const mapped: Employee[] = (data || []).map((e) => ({
          id: e.id,
          name: [e.firstName, e.lastName].filter(Boolean).join(' ') || String(e.id),
          position: e.role || 'Employee',
          avatar: "/placeholder.svg?height=40&width=40",
          lastUpdated: new Date().toISOString(),
          status: 'active',
          location: [normalizeCityName(e.city), e.state].filter(Boolean).join(', '),
        }));
        setEmployees(mapped);
      } catch (err) {
        setError((err as Error)?.message || 'Failed to load employees');
      } finally {
        setIsLoading(false);
      }
    };
    loadEmployees();
  }, [isRoleDetermined]);

  // Get employees based on user role
  const displayEmployees = useMemo(() => {
    if (isManager) {
      return teamMembers;
    }
    return employees; // Admin sees all employees
  }, [isManager, teamMembers, employees]);

  const handleDateRangeChange = (value: DateRangeOption) => {
    setSelectedDateRange(value);
    if (value === "custom") {
      setShowCustomDatePicker(true);
    } else {
      setShowCustomDatePicker(false);
      setCustomStartDate(undefined);
      setCustomEndDate(undefined);
    }
  };

  const handleCustomDateApply = () => {
    if (customStartDate && customEndDate && !customDateRangeInvalid) {
      setShowCustomDatePicker(false);
      setIsDateRangeLoading(true);
      // The useEffect will automatically trigger due to dateRange dependency change
    }
  };

  const dateRange = useMemo<DateRangeValue>(() => {
    const today = new Date();
    
    if (selectedDateRange === "custom" && customStartDate && customEndDate && !customDateRangeInvalid) {
      return {
        start: customStartDate,
        end: customEndDate,
      };
    }
    
    switch (selectedDateRange) {
      case "today":
        return { start: today, end: today };
      case "yesterday": {
        const yesterday = subDays(today, 1);
        return { start: yesterday, end: yesterday };
      }
      case "thisWeek":
        return { start: startOfWeek(today), end: today };
      case "thisMonth":
        return { start: startOfMonth(today), end: today };
      default:
        return { start: today, end: today };
    }
  }, [selectedDateRange, customStartDate, customEndDate, customDateRangeInvalid]);

  // Load pre-aggregated, role-scoped KPIs from the optimized dashboard endpoint.
  useEffect(() => {
    if (!hasHydratedDateFilter || !isRoleDetermined) return;
    let cancelled = false;
    const run = async () => {
      try {
        setIsDateRangeLoading(true);
        const start = format(dateRange.start, 'yyyy-MM-dd');
        const end = format(dateRange.end, 'yyyy-MM-dd');
        
        const counts = await API.getReportCounts(start, end);
        const allowedEmployeeIds = isManager
          ? new Set(displayEmployees.map((employee) => employee.id))
          : null;
        const scopedCounts = allowedEmployeeIds
          ? counts.filter((item) => allowedEmployeeIds.has(item.employeeId))
          : counts;
        const summary = {
          startDate: start,
          endDate: end,
          totalVisits: scopedCounts.reduce((sum, item) => sum + (item.statsDto?.visitCount ?? 0), 0),
          activeEmployees: scopedCounts.filter((item) => (item.statsDto?.visitCount ?? 0) > 0).length,
          countsByEmployee: scopedCounts.map((item) => ({
            employeeId: item.employeeId,
            employeeName: [item.employeeFirstName, item.employeeLastName].filter(Boolean).join(' '),
            visitCount: item.statsDto?.visitCount ?? 0,
          })),
        };
        if (cancelled) return;
        const cMap = new Map<number, number>();
        summary.countsByEmployee.forEach((item) => cMap.set(item.employeeId, item.visitCount ?? 0));
        setCountsByEmployee(cMap);
        setKpis(prev => ({
          ...prev,
          totalVisits: summary.totalVisits,
          activeEmployees: summary.activeEmployees,
        }));
      } catch (error) {
        console.error('Error fetching KPIs:', error);
        // leave KPIs as-is if error
      } finally {
        if (!cancelled) setIsDateRangeLoading(false);
      }
    };
    run();
    return () => { cancelled = true; };
  }, [dateRange.start, dateRange.end, isRoleDetermined, hasHydratedDateFilter, isManager, displayEmployees]);

  // Latest known positions are independent of the selected visit date range.
  useEffect(() => {
    if (!hasHydratedDateFilter || !isRoleDetermined) return;
    let cancelled = false;
    setLocationsLoading(true);
    setLocationsError(null);
    const run = async () => {
      try {
        const locations = await API.getAllEmployeeLocations();
        if (!Array.isArray(locations)) throw new Error('Unexpected location response');
        const latest = latestEmployeeLocations(locations,
          isManager ? new Set(teamMembers.map(employee => employee.id)) : undefined);
        const results: MapMarker[] = latest.map(location => {
          const coordinates = mapCoordinates(location.latitude, location.longitude)!;
          const timestamp = mapTimestamp(location.updatedAt, location.updatedTime);
          return {
            id: Number(location.empId), employeeId: Number(location.empId),
            name: location.empName, lat: coordinates[0], lng: coordinates[1], type: "live",
            updatedAt: timestamp?.getTime() ?? null,
            subtitle: timestamp ? format(timestamp, "MMM dd, yyyy, hh:mm a") : "Update time unavailable",
          };
        });
        if (!cancelled) {
          setMarkers(results.sort((a, b) => (a.name || '').localeCompare(b.name || '')));
          setLocationsSyncedAt(Date.now());
        }
      } catch {
        if (!cancelled) {
          setMarkers([]);
          setLocationsError("We couldn't load employee locations. Please refresh the page to try again.");
        }
      } finally {
        if (!cancelled) setLocationsLoading(false);
      }
    };
    void run();
    return () => { cancelled = true; };
  }, [isManager, teamMembers, isRoleDetermined, hasHydratedDateFilter, locationRefreshKey]);

  // Keep KPI liveLocations in sync with markers count
  useEffect(() => {
    setKpis(prev => ({ ...prev, liveLocations: markers.length }));
  }, [markers.length]);

  // Derive states from active employees (same semantics as source: only those with visits/presence)
  // Use displayEmployees to respect role-based filtering (managers see only their team)
  useEffect(() => {
    // Build states once we have employees and countsByEmployee
    if (!displayEmployees.length) return;
    const byState = new Map<string, number>();
    displayEmployees.forEach((emp) => {
      const visits = countsByEmployee.get(emp.id) ?? 0;
      const rawLocation = emp.location || '';
      const parts = rawLocation.split(',').map((s) => s.trim()).filter(Boolean);
      const stateName = parts.length > 1 ? parts[parts.length - 1] : (parts[0] || 'Unknown');
      if (visits > 0 && stateName !== 'Unknown') {
        byState.set(stateName, (byState.get(stateName) || 0) + 1);
      }
    });
    const stateItems: StateItem[] = Array.from(byState.entries()).map(([name, count], idx) => ({
      id: idx + 1,
      name,
      employeeCount: count,
      color: colorPalette[idx % colorPalette.length],
    }));
    setStates(stateItems);
  }, [displayEmployees, countsByEmployee]);

  const employeeList = useMemo<ExtendedEmployee[]>(() => {
    // Keep scoped employees without GPS visible, as in the reference panel.
    const byId = new Map<number, MapMarker>();
    markers.forEach(m => {
      byId.set(Number(m.id), m);
    });
    const list = displayEmployees
      .map((employee) => ({
        ...employee,
        listId: String(employee.id),
        visits: countsByEmployee.get(employee.id) ?? 0,
        formattedLastUpdated: byId.get(employee.id)?.subtitle || '',
        hasLocation: byId.has(employee.id),
        locationTimestamp: byId.get(employee.id)?.updatedAt ?? null,
      }));
    // Sorted by employee name similar to example list
    list.sort((a, b) => a.name.localeCompare(b.name));
    return list;
  }, [displayEmployees, countsByEmployee, markers]);

  const stateEmployees = useMemo(() => {
    if (!selectedState) return [];
    // Only employees active in selected range (same as upstream logic)
    return displayEmployees.filter((employee) => {
      const rawLocation = employee.location || '';
      const parts = rawLocation.split(',').map((s) => s.trim()).filter(Boolean);
      const empState = parts.length > 1 ? parts[parts.length - 1] : (parts[0] || 'Unknown');
      return (
        (empState.toLowerCase() === selectedState.name.toLowerCase() ||
          employee.location.toLowerCase().includes(selectedState.name.toLowerCase())) &&
        (countsByEmployee.get(employee.id) ?? 0) > 0
      );
    });
  }, [selectedState, displayEmployees, countsByEmployee]);

  const handleBack = useCallback(() => {
    if (view === "employeeDetail") {
      setSelectedEmployee(null);
      if (selectedState) {
        setView("state");
        setIsStateSectionLoading(true);
      } else {
        setView("dashboard");
        setHighlightedEmployee(null);
        setSelectedEmployeeMarkers([]);
        setMapCenter(DEFAULT_MAP_CENTER);
        setMapZoom(DEFAULT_MAP_ZOOM);
      }
      return;
    }

    if (view === "state") {
      setView("dashboard");
      setSelectedState(null);
      setHighlightedEmployee(null);
      setSelectedEmployeeMarkers([]);
      setMapCenter(DEFAULT_MAP_CENTER);
      setMapZoom(DEFAULT_MAP_ZOOM);
      return;
    }

    if (typeof window !== "undefined" && window.history.length > 1) {
      window.history.back();
    }
  }, [view, selectedState]);

  useDashboardHeader({
    heading:
      view === "dashboard"
        ? "Dashboard"
        : view === "state"
          ? selectedState?.name || "Employees"
          : selectedEmployee?.name || "Employee details",
    subheading:
      view === "dashboard"
        ? isManager
          ? "Team activity and performance overview"
          : "Sales and employee activity overview"
        : view === "state"
          ? `${stateEmployees.length} active ${stateEmployees.length === 1 ? "employee" : "employees"} in ${selectedState?.name || "this state"}`
          : [selectedEmployee?.position, selectedState?.name].filter(Boolean).join(" · "),
    onBack: view === "dashboard" ? undefined : handleBack,
  });

  const handleStateSelect = useCallback((state: { id: number; name: string; employeeCount: number; color?: string }) => {
    if (!state) return;
    const normalizedState: StateItem = {
      id: state.id,
      name: state.name,
      employeeCount: state.employeeCount,
      color: state.color || colorPalette[0],
    };
    pushHistoryState({
      view: "state",
      selectedState: normalizedState,
      selectedEmployee: null,
    });
    setSelectedState(normalizedState);
    setSelectedEmployee(null);
    setView("state");
    setIsStateSectionLoading(true);
  }, [pushHistoryState]);
  const clearStateSkeletonTimeout = useCallback(() => {
    if (stateSkeletonTimeoutRef.current) {
      clearTimeout(stateSkeletonTimeoutRef.current);
      stateSkeletonTimeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      clearStateSkeletonTimeout();
    };
  }, [clearStateSkeletonTimeout]);

  useEffect(() => {
    if (view === "state" && prevViewRef.current !== "state") {
      setIsStateSectionLoading(true);
    } else if (view !== "state") {
      clearStateSkeletonTimeout();
      setIsStateSectionLoading(false);
    }
    prevViewRef.current = view;
  }, [view, clearStateSkeletonTimeout]);

  useEffect(() => {
    if (view !== "state") {
      clearStateSkeletonTimeout();
      return;
    }

    if (stateEmployees.length > 0) {
      clearStateSkeletonTimeout();
      setIsStateSectionLoading(false);
      return;
    }

    if (isLoading || isDateRangeLoading) {
      clearStateSkeletonTimeout();
      setIsStateSectionLoading(true);
      return;
    }

    if (!stateSkeletonTimeoutRef.current) {
      stateSkeletonTimeoutRef.current = setTimeout(() => {
        setIsStateSectionLoading(false);
        stateSkeletonTimeoutRef.current = null;
      }, 1500);
    }
  }, [
    view,
    stateEmployees.length,
    isLoading,
    isDateRangeLoading,
    clearStateSkeletonTimeout,
  ]);


  const handleEmployeeSelect = useCallback((employee: ExtendedEmployee) => {
    journeyRequestRef.current += 1;
    setSelectedEmployeeMarkers([]);
    setJourneyError(null);
    setJourneyLoading(true);
    setHighlightedEmployee({ ...employee });
  }, []);

  const journeyStart = format(dateRange.start, "yyyy-MM-dd");
  const journeyEnd = format(dateRange.end, "yyyy-MM-dd");

  // Selection and date range share one loader. Cleanup rejects stale responses.
  useEffect(() => {
    if (!highlightedEmployee || !hasHydratedDateFilter) return;
    const requestId = ++journeyRequestRef.current;
    let cancelled = false;
    setSelectedEmployeeMarkers([]);
    setJourneyLoading(true);
    setJourneyError(null);
    const employee = highlightedEmployee;
    const load = async () => {
      const [homeResult, visitsResult] = await Promise.allSettled([
        API.getEmployeeById(employee.id),
        API.getEmployeeJourney(employee.id, journeyStart, journeyEnd),
      ]);
      if (cancelled || requestId !== journeyRequestRef.current) return;
      const home = homeResult.status === 'fulfilled' ? homeResult.value : null;
      const visits = visitsResult.status === 'fulfilled' && Array.isArray(visitsResult.value) ? visitsResult.value : [];
      const formatTimestamp = (date?: string | null, time?: string | null) => {
        const timestamp = mapTimestamp(date, time);
        return timestamp ? format(timestamp, "MMM dd, yyyy, hh:mm a") : "Not available";
      };
      setSelectedEmployeeMarkers(journeyMapMarkers(employee, home, visits, journeyStart, journeyEnd, formatTimestamp));
      const failures: string[] = [];
      if (homeResult.status === 'rejected') failures.push('home location');
      if (visitsResult.status === 'rejected' || !Array.isArray(visitsResult.value)) failures.push('visits');
      setJourneyError(failures.length ? `We couldn't load the ${failures.join(' and ')}. Please select the employee again to retry.` : null);
      setJourneyLoading(false);
    };
    void load();
    return () => { cancelled = true; };
  }, [highlightedEmployee, journeyStart, journeyEnd, hasHydratedDateFilter]);

  const handleEmployeeDetailSelect = useCallback((employee: Employee) => {
    pushHistoryState({
      view: "employeeDetail",
      selectedState,
      selectedEmployee: employee,
    });
    setSelectedEmployee(employee);
    setView("employeeDetail");
  }, [pushHistoryState, selectedState]);



  const handleMarkerClick = useCallback(async (marker: MapMarker) => {
    if (marker.type === 'live') {
      const employeeId = Number(marker.id);
      const employee = employeeList.find(emp => emp.id === employeeId);
      if (employee) {
        await handleEmployeeSelect(employee as ExtendedEmployee);
      }
    }
  }, [employeeList, handleEmployeeSelect]);

  // Note: All employee location loading is now handled in handleEmployeeSelect
  // This effect is no longer needed since we load all locations immediately

  return (
    <div className="german-dashboard-density space-y-4">
      <div className="flex min-h-9 flex-wrap items-center justify-end gap-2">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Select value={selectedDateRange} onValueChange={handleDateRangeChange}>
              <SelectTrigger className="h-9 w-[170px] text-xs">
                <SelectValue placeholder="Select date range" />
              </SelectTrigger>
              <SelectContent>
                {dateRanges.map((range) => (
                  <SelectItem key={range.value} value={range.value}>
                    {range.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {showCustomDatePicker && (
              <div className="flex flex-wrap items-center gap-2">
                <Popover open={isStartDatePopoverOpen} onOpenChange={setIsStartDatePopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="h-9 w-[140px] justify-start text-left text-xs font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {customStartDate ? format(customStartDate, 'MMM dd, yyyy') : 'Start date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <SpacedCalendar
                      mode="single"
                      selected={customStartDate}
                      onSelect={(date) => {
                        setCustomStartDate(date);
                        setIsStartDatePopoverOpen(false);
                      }}
                      disabled={(date) => date > new Date() || date < new Date('1900-01-01') || (customEndDate ? date > customEndDate : false)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                
                <Popover open={isEndDatePopoverOpen} onOpenChange={setIsEndDatePopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="h-9 w-[140px] justify-start text-left text-xs font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {customEndDate ? format(customEndDate, 'MMM dd, yyyy') : 'End date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <SpacedCalendar
                      mode="single"
                      selected={customEndDate}
                      onSelect={(date) => {
                        setCustomEndDate(date);
                        setIsEndDatePopoverOpen(false);
                      }}
                      disabled={(date) => date > new Date() || date < new Date('1900-01-01') || (customStartDate ? date < customStartDate : false)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                
                <DateRangeError fromDate={customStartDate} toDate={customEndDate} className="basis-full" />
                <Button 
                  onClick={handleCustomDateApply}
                  disabled={!customStartDate || !customEndDate || customDateRangeInvalid}
                  size="sm"
                >
                  Apply
                </Button>
              </div>
            )}
            {isDateRangeLoading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Loading...</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Show skeleton loader while role is being determined or data is loading */}
      {!isRoleDetermined || isLoading ? (
        <div className="space-y-8">
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {[
              { label: 'Visits in period', icon: Calendar },
              { label: 'Employees with activity', icon: Users },
              { label: 'Last-known locations', icon: MapPin },
            ].map(({ label, icon: Icon }) => (
              <div key={label} className="rounded-lg border bg-card px-3 py-3 sm:px-4">
                <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                  <span>{label}</span>
                  <Icon className="hidden h-4 w-4 shrink-0 sm:block" />
                </div>
                <Skeleton className="mt-1 h-7 w-12" />
              </div>
            ))}
          </div>
          
          <div className="space-y-4">
            <Skeleton className="h-8 w-64" />
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
              {[...Array(4)].map((_, i) => (
                <Card key={i}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <Skeleton className="h-6 w-20" />
                    <Building className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-8 w-12" />
                    <Skeleton className="h-4 w-32 mt-2" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
          
          <div className="space-y-4">
            <Skeleton className="h-8 w-64" />
            <div className="flex flex-col gap-6 lg:flex-row">
              <div className="flex-1">
                <Card className="h-[600px] overflow-hidden rounded-xl">
                  <Skeleton className="h-full w-full" />
                </Card>
              </div>
              <div className="w-full lg:w-96">
                <Card className="flex h-[600px] flex-col overflow-hidden rounded-xl">
                  <CardHeader className="border-b">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Users className="h-5 w-5" />
                      <span>Active Employees</span>
                      <Skeleton className="h-6 w-12 ml-auto" />
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex-1 overflow-y-auto p-0">
                    <div className="divide-y">
                      {[...Array(5)].map((_, i) => (
                        <div key={i} className="w-full p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <Skeleton className="h-10 w-10 rounded-xl" />
                              <div>
                                <Skeleton className="h-4 w-24" />
                                <Skeleton className="h-3 w-16 mt-1" />
                              </div>
                            </div>
                            <div className="text-right">
                              <Skeleton className="h-3 w-16" />
                              <Skeleton className="h-3 w-20 mt-1" />
                            </div>
                          </div>
                          <div className="mt-3 flex items-center gap-2">
                            <Skeleton className="h-5 w-16" />
                            <Skeleton className="h-5 w-20" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          {view === "dashboard" && (
            <OverviewSection
              kpis={kpis}
              states={states}
              onStateSelect={handleStateSelect}
              markers={markers}
              highlightedEmployee={highlightedEmployee}
              selectedEmployeeMarkers={selectedEmployeeMarkers}
              onResetView={() => {
                journeyRequestRef.current += 1;
                setJourneyLoading(false);
                setJourneyError(null);
                setMapCenter([...DEFAULT_MAP_CENTER]);
                setMapZoom(DEFAULT_MAP_ZOOM);
                setHighlightedEmployee(null);
                setSelectedEmployeeMarkers([]);
              }}
              mapCenter={mapCenter}
              mapZoom={mapZoom}
              onMarkerClick={handleMarkerClick as unknown as (marker: Record<string, unknown>) => void}
              onEmployeeSelect={handleEmployeeSelect as unknown as (employee: Record<string, unknown>) => void}
              employeeList={employeeList}
              journeyLoading={journeyLoading}
              journeyError={journeyError}
              locationsLoading={locationsLoading}
              locationsError={locationsError}
              locationsSyncedAt={locationsSyncedAt}
              onRefreshLocations={() => setLocationRefreshKey((key) => key + 1)}
              periodLabel={`${format(dateRange.start, 'd MMM')} – ${format(dateRange.end, 'd MMM yyyy')}`}
            />
          )}

          {view === "state" && selectedState && (
            isStateSectionLoading ? (
              <StateSectionSkeleton />
            ) : (
              <StateSection
                selectedState={selectedState}
                stateEmployees={stateEmployees}
                onEmployeeDetailSelect={handleEmployeeDetailSelect as (employee: unknown) => void}
              />
            )
          )}

          {view === "employeeDetail" && selectedEmployee && (
            <EmployeeDetailSection employee={selectedEmployee} dateRange={dateRange} />
          )}
        </>
      )}

      <DailyPricingModal
        open={isPricingModalOpen}
        onOpenChange={(open) => {
          if (open) {
            setIsPricingModalOpen(true);
          } else {
            handlePricingModalDismiss();
          }
        }}
        onCreateSuccess={handlePricingModalDismiss}
      />
    </div>
  );
}
