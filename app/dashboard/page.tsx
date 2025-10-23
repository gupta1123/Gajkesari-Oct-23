"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import {
  format,
  subDays,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
} from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MapPin, Users, Calendar, ArrowLeft, Building } from "lucide-react";
import OverviewSection from "@/components/dashboard/OverviewSection";
import StateSection from "@/components/dashboard/StateSection";
import EmployeeDetailSection from "@/components/dashboard/EmployeeDetailSection";
import { Heading, Text } from "@/components/ui/typography";
import { API, type EmployeeUserDto, type VisitDto, type ReportCountsItem, type AttendanceLogItem, type LiveLocationDto, type TeamDataDto, type CurrentUserDto } from "@/lib/api";
import { useAuth } from "@/components/auth-provider";
import { Skeleton } from "@/components/ui/skeleton";


const DEFAULT_MAP_CENTER: [number, number] = [22.5726, 88.3639];
const DEFAULT_MAP_ZOOM = 5;

const CITY_COORDINATES: Record<string, [number, number]> = {
  Mumbai: [19.076, 72.8777],
  Bangalore: [12.9716, 77.5946],
  Chennai: [13.0827, 80.2707],
  Hyderabad: [17.385, 78.4867],
  Kolkata: [22.5726, 88.3639],
  Delhi: [28.6139, 77.209],
};

const resolveCoordinates = (location: string): [number, number] => {
  const match = Object.entries(CITY_COORDINATES).find(([city]) =>
    location.includes(city)
  );
  return match ? match[1] : DEFAULT_MAP_CENTER;
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
  visitsToday: number;
  formattedLastUpdated: string;
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
};

type StateItem = { id: number; name: string; employeeCount: number; color: string };
type SelectedState = StateItem | null;

type DateRangeValue = {
  start: Date;
  end: Date;
};

const dateRanges = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "thisWeek", label: "This Week" },
  { value: "thisMonth", label: "This Month" },
] as const;

export default function DashboardPage() {
  const { userRole, userData, currentUser, token } = useAuth();
  const [selectedDateRange, setSelectedDateRange] = useState("today");
  const [view, setView] = useState<"dashboard" | "state" | "employeeDetail">(
    "dashboard"
  );
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
  const [error, setError] = useState<string | null>(null);
  const [isManager, setIsManager] = useState(false);
  const [isRoleDetermined, setIsRoleDetermined] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const VIEW_STATE_KEY = 'dashboard.view.state.v1';

  // Fetch current user data to determine role
  useEffect(() => {
    // Restore view if coming back from deep link
    if (typeof window !== 'undefined') {
      try {
        const raw = sessionStorage.getItem(VIEW_STATE_KEY);
        if (raw) {
          const saved = JSON.parse(raw) as Record<string, unknown>;
          if (saved?.selectedState) {
            setSelectedState(saved.selectedState as SelectedState);
          }
          if (saved?.view === 'employeeDetail' && saved?.selectedEmployee) {
            setSelectedEmployee(saved.selectedEmployee as Employee);
            setView('employeeDetail');
          } else if (saved?.view === 'state' && saved?.selectedState) {
            setView('state');
          }
        }
      } catch {}
    }
    const fetchCurrentUser = async () => {
      if (!token) return;
      
      try {
        const response = await fetch('https://api.gajkesaristeels.in/user/manage/current-user', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        
        if (response.ok) {
          const userData: CurrentUserDto = await response.json();
          console.log('Dashboard - Current user data:', userData);
          
          // Extract role from authorities
          const authorities = userData.authorities || [];
          const role = authorities.length > 0 ? authorities[0].authority : null;
          
          // Set role flags
          const isManagerRole = role === 'ROLE_MANAGER';
          setIsManager(isManagerRole);
          
          console.log('Dashboard - Role from API:', role);
          console.log('Dashboard - isManager:', isManagerRole);
          
          // Mark role as determined
          setIsRoleDetermined(true);
        } else {
          console.error('Dashboard - Failed to fetch current user data');
          // Fallback to existing logic
          setIsRoleDetermined(true);
        }
      } catch (error) {
        console.error('Dashboard - Error fetching current user:', error);
        // Fallback to existing logic
        setIsRoleDetermined(true);
      }
    };

    fetchCurrentUser();
  }, [token]);

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

  // Load team members for managers
  useEffect(() => {
    const loadTeamMembers = async () => {
      if (!isManager || !userData?.employeeId) return;
      
      try {
        const teamData: TeamDataDto[] = await API.getTeamByEmployee(userData.employeeId);
        const teamMemberIds = teamData.flatMap(team => 
          team.fieldOfficers.map(fo => fo.id)
        );
        
        // Filter employees to only show team members
        const filteredEmployees = employees.filter(emp => 
          teamMemberIds.includes(emp.id)
        );
        setTeamMembers(filteredEmployees);
      } catch (err) {
        console.error('Failed to load team members:', err);
        setError('Failed to load team members');
      }
    };
    
    if (isManager && employees.length > 0) {
      loadTeamMembers();
    }
  }, [isManager, userData?.employeeId, employees]);

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
          location: [e.city, e.state].filter(Boolean).join(', '),
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
      return teamMembers.length > 0 ? teamMembers : employees; // Fallback to all employees if team not loaded yet
    }
    return employees; // Admin sees all employees
  }, [isManager, teamMembers, employees]);

  const dateRange = useMemo<DateRangeValue>(() => {
    const today = new Date();
    switch (selectedDateRange) {
      case "today":
        return { start: today, end: today };
      case "yesterday": {
        const yesterday = subDays(today, 1);
        return { start: yesterday, end: yesterday };
      }
      case "thisWeek":
        return { start: startOfWeek(today), end: endOfWeek(today) };
      case "thisMonth":
        return { start: startOfMonth(today), end: endOfMonth(today) };
      default:
        return { start: today, end: today };
    }
  }, [selectedDateRange]);

  // Load KPIs (visits and active employees) from report counts
  useEffect(() => {
    const run = async () => {
      if (!isRoleDetermined) return;
      
      try {
        const start = format(dateRange.start, 'yyyy-MM-dd');
        const end = format(dateRange.end, 'yyyy-MM-dd');
        
        // Fetch report counts for KPI data using API service
        const counts: ReportCountsItem[] = await API.getReportCounts(start, end);
        
        // Filter counts based on user role
        const filteredCounts = isManager 
          ? counts.filter(item => displayEmployees.some(emp => emp.id === item.employeeId))
          : counts;
        
        // Calculate KPIs from the filtered data
        const totalVisits = (filteredCounts || []).reduce((sum, item) => sum + (item.statsDto?.visitCount ?? 0), 0);
        const activeEmployees = (filteredCounts || []).filter(item => (item.statsDto?.visitCount ?? 0) > 0).length;
        
        // Map for quick per-employee visit counts in the date range
        const cMap = new Map<number, number>();
        filteredCounts.forEach(item => cMap.set(item.employeeId, item.statsDto?.visitCount ?? 0));
        setCountsByEmployee(cMap);
        setKpis(prev => ({ ...prev, totalVisits, activeEmployees }));
      } catch (error) {
        console.error('Error fetching KPIs:', error);
        // leave KPIs as-is if error
      }
    };
    run();
  }, [dateRange.start, dateRange.end, isManager, displayEmployees, isRoleDetermined]);

  // Fetch live locations for employees based on role
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!isRoleDetermined) return;
      
      try {
        // Use API service to get live locations
        const liveLocations = await API.getAllEmployeeLocations();
        const now = new Date();
        
        const results: MapMarker[] = [];
        
        liveLocations.forEach((loc: LiveLocationDto) => {
          if (loc.latitude != null && loc.longitude != null) {
            // For managers: show all employees under their management
            // For admins: show all employees
            let shouldShow = true;
            
            if (isManager) {
              // Check if this employee is under the manager's team
              shouldShow = teamMembers.some(emp => emp.id === loc.empId);
            }
            
            if (!shouldShow) return;
            
            // Check if location is recent (within 60 minutes)
            const timePart = String(loc.updatedTime).split('.')[0];
            const ts = new Date(`${loc.updatedAt}T${timePart}`);
            const diffMin = (now.getTime() - ts.getTime()) / 60000;
            
            if (diffMin <= 60) {
              results.push({
                id: loc.empId,
                name: loc.empName,
                lat: loc.latitude,
                lng: loc.longitude,
                // Display date like 11 Aug '25 plus time
                subtitle: `${format(ts, "dd MMM ''yy")} ${timePart}`.trim(),
                type: "live",
                employeeId: loc.empId,
                tooltipLines: [
                  `Employee: ${loc.empName}`,
                  `Last updated: ${format(ts, "dd MMM ''yy, hh:mm a")}`,
                ],
              });
            }
          }
        });

        if (!cancelled) {
          // Sort by name
          results.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
          setMarkers(results);
        }
      } catch (e) {
        if (!cancelled) setMarkers([]);
      }
    };
    run();
    return () => { cancelled = true; };
  }, [isManager, teamMembers, isRoleDetermined]);

  // Keep KPI liveLocations in sync with markers count
  useEffect(() => {
    setKpis(prev => ({ ...prev, liveLocations: markers.length }));
  }, [markers.length]);

  // Derive states from active employees (same semantics as source: only those with visits/presence)
  useEffect(() => {
    // Build states once we have employees and countsByEmployee
    if (!employees.length) return;
    const byState = new Map<string, number>();
    employees.forEach((emp) => {
      const visits = countsByEmployee.get(emp.id) ?? 0;
      const stateName = emp.location.split(', ')[1] || 'Unknown';
      if (visits > 0) {
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
  }, [employees, countsByEmployee]);

  const employeeList = useMemo<ExtendedEmployee[]>(() => {
    // Build list only for employees with live markers, preserving UI fields
    const byId = new Map<number, { lat: number; lng: number; subtitle?: string }>();
    markers.forEach(m => {
      byId.set(Number(m.id), { lat: m.lat, lng: m.lng, subtitle: m.subtitle });
    });
    const list = displayEmployees
      .filter(e => byId.has(e.id))
      .map((employee) => ({
        ...employee,
        listId: String(employee.id),
        visitsToday: countsByEmployee.get(employee.id) ?? 0,
        formattedLastUpdated: byId.get(employee.id)?.subtitle || '',
      }));
    // Sorted by employee name similar to example list
    list.sort((a, b) => a.name.localeCompare(b.name));
    return list;
  }, [displayEmployees, countsByEmployee, markers]);

  const stateEmployees = useMemo(() => {
    if (!selectedState) return [];
    // Only employees active in selected range (same as upstream logic)
    return displayEmployees.filter((employee) =>
      employee.location.includes(selectedState.name) && (countsByEmployee.get(employee.id) ?? 0) > 0
    );
  }, [selectedState, displayEmployees, countsByEmployee]);

  const handleBack = useCallback(() => {
    if (view === "employeeDetail") {
      setView("state");
      setSelectedEmployee(null);
      return;
    }

    if (view === "state") {
      setView("dashboard");
      setSelectedState(null);
      setHighlightedEmployee(null);
      setMapCenter(DEFAULT_MAP_CENTER);
      setMapZoom(DEFAULT_MAP_ZOOM);
    }
  }, [view]);

  const handleStateSelect = useCallback((state: { id: number; name: string; employeeCount: number; color?: string }) => {
    if (!state) return;
    setSelectedState({ id: state.id, name: state.name, employeeCount: state.employeeCount, color: state.color || colorPalette[0] });
    setView("state");
  }, []);

  const handleEmployeeSelect = useCallback(async (employee: ExtendedEmployee) => {
    // Find the live marker for this employee
    const liveMarker = markers.find(m => Number(m.id) === employee.id);
    
    // Clear previous markers and set the highlighted employee
    setSelectedEmployeeMarkers([]);
    setHighlightedEmployee(employee);
    
    // Immediately fetch and show house location if available
    try {
      const employeeDetail = await API.getEmployeeById(employee.id);
      
      if (employeeDetail && 
          employeeDetail.houseLatitude != null && 
          employeeDetail.houseLongitude != null) {
        
        const placeParts = [employeeDetail.city, employeeDetail.state, employeeDetail.country]
          .filter(Boolean)
          .join(", ");

        const houseMarker: MapMarker = {
          id: `house-${employeeDetail.id}`,
          name: `${employee.name}'s Home`,
          lat: Number(employeeDetail.houseLatitude),
          lng: Number(employeeDetail.houseLongitude),
          subtitle: placeParts,
          type: "house",
          employeeId: employeeDetail.id,
          tooltipLines: [], // Simplified - no detailed address
        };

        setSelectedEmployeeMarkers([houseMarker]);
        
        // Smart centering: if both live and house locations exist, center between them
        if (liveMarker) {
          // Calculate center point between live and house locations
          const centerLat = (liveMarker.lat + Number(employeeDetail.houseLatitude)) / 2;
          const centerLng = (liveMarker.lng + Number(employeeDetail.houseLongitude)) / 2;
          setMapCenter([centerLat, centerLng]);
          setMapZoom(12); // Slightly zoomed out to show both locations
        } else {
          // Only house location exists, center on it
          setMapCenter([Number(employeeDetail.houseLatitude), Number(employeeDetail.houseLongitude)]);
          setMapZoom(13);
        }
      } else if (liveMarker) {
        // Only live location exists, center on it
        setMapCenter([liveMarker.lat, liveMarker.lng]);
        setMapZoom(13);
      } else {
        // No locations available, fallback to city coordinates
        setMapCenter(resolveCoordinates(employee.location));
        setMapZoom(10);
      }
    } catch (error) {
      console.error('Failed to fetch employee house location:', error);
      // Fallback to live marker if house location fetch fails
      if (liveMarker) {
        setMapCenter([liveMarker.lat, liveMarker.lng]);
        setMapZoom(13);
      } else {
        setMapCenter(resolveCoordinates(employee.location));
        setMapZoom(10);
      }
    }
  }, [markers]);

  const handleEmployeeDetailSelect = useCallback((employee: Employee) => {
    setSelectedEmployee(employee);
    setView("employeeDetail");
  }, []);

  const handleMarkerClick = useCallback(async (marker: MapMarker) => {
    // If it's a live location marker, find the corresponding employee and show their house location
    if (marker.type === 'live') {
      const employeeId = Number(marker.id);
      const employee = employeeList.find(emp => emp.id === employeeId);
      
      if (employee) {
        // Set the highlighted employee to trigger the loadSupplementaryMarkers effect
        setHighlightedEmployee(employee);
        
        // Center the map on the clicked marker
        setMapCenter([marker.lat, marker.lng]);
        setMapZoom(13);
      }
    }
  }, [employeeList]);

  useEffect(() => {
    let cancelled = false;

    const loadSupplementaryMarkers = async () => {
      if (!highlightedEmployee || !token) {
        setSelectedEmployeeMarkers([]);
        return;
      }

      try {
        const start = format(dateRange.start, "yyyy-MM-dd");
        const end = format(dateRange.end, "yyyy-MM-dd");

        const [employeeDetail, visitStats] = await Promise.all([
          API.getEmployeeById(highlightedEmployee.id),
          API.getEmployeeStatsByDateRange(highlightedEmployee.id, start, end),
        ]);

        const supplemental: MapMarker[] = [];

        // Note: House location is now handled in handleEmployeeSelect to show immediately
        // This effect now only handles visit markers

        const formatDateTime = (dateStr?: string | null, timeStr?: string | null) => {
          if (!dateStr) return "Not available";
          const time = timeStr ? timeStr.split(".")[0] : null;
          const normalizedTime = time && time.length === 8 ? time : time ? `${time}` : "00:00:00";
          const dateTime = new Date(`${dateStr}T${normalizedTime ?? "00:00:00"}`);
          if (Number.isNaN(dateTime.getTime())) {
            return dateStr;
          }
          return format(dateTime, "dd MMM yyyy, hh:mm a");
        };

        const visits = visitStats?.visitDto ?? [];
        visits.forEach((visit) => {
          const lat =
            visit.checkinLatitude ??
            visit.visitLatitude ??
            visit.storeLatitude;
          const lng =
            visit.checkinLongitude ??
            visit.visitLongitude ??
            visit.storeLongitude;

          if (lat == null || lng == null) {
            return;
          }

          const checkIn = formatDateTime(visit.checkinDate, visit.checkinTime);
          const checkOut =
            visit.checkoutDate || visit.checkoutTime
              ? formatDateTime(visit.checkoutDate, visit.checkoutTime)
              : "Not recorded";
          const place = [visit.city, visit.state, visit.country].filter(Boolean).join(", ");

          const tooltipLines = [
            `Store: ${visit.storeName || "N/A"}`,
            `Employee: ${visit.employeeName || highlightedEmployee.name}`,
            `Check-in: ${checkIn}`,
            `Check-out: ${checkOut}`,
            visit.purpose ? `Purpose: ${visit.purpose}` : null,
            place ? `Address: ${place}` : null,
          ].filter(Boolean) as string[];

          supplemental.push({
            id: `visit-${visit.id}`,
            name: visit.storeName || "Visit",
            lat: Number(lat),
            lng: Number(lng),
            subtitle: `${visit.storeName || "Visit"} - ${visit.purpose || "Visit"}`,
            type: "visit",
            employeeId: visit.employeeId,
            tooltipLines,
          });
        });

        if (!cancelled) {
          // Append visit markers to existing markers (which include house location)
          setSelectedEmployeeMarkers(prev => [...prev, ...supplemental]);
        }
      } catch (error) {
        console.error("Failed to load selected employee map data:", error);
        if (!cancelled) {
          setSelectedEmployeeMarkers([]);
        }
      }
    };

    loadSupplementaryMarkers();

    return () => {
      cancelled = true;
    };
  }, [highlightedEmployee?.id, highlightedEmployee?.name, dateRange.start, dateRange.end, token]);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <Heading as="h1" size="3xl" weight="bold">
              {view === "dashboard"
                ? "Dashboard"
                : view === "state" && selectedState
                ? selectedState.name
                : "Employee Details"}
            </Heading>
            {isRoleDetermined && (
              <Badge variant={isManager ? "secondary" : "default"} className="text-xs">
                {isManager ? "Manager View" : "Admin View"}
              </Badge>
            )}
          </div>
          <Text tone="muted">
            {view === "dashboard"
              ? isManager 
                ? "Overview of your team's activities and performance."
                : "Overview of sales and employee activities."
              : selectedState
              ? `Details for ${selectedState.name}`
              : "Deep dive into employee performance."}
          </Text>
        </div>
        <div className="flex items-center gap-4">
          {view !== "dashboard" && (
            <Button
              variant="outline"
              onClick={handleBack}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          )}
          <Select value={selectedDateRange} onValueChange={setSelectedDateRange}>
            <SelectTrigger className="w-[180px]">
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
        </div>
      </div>

      {/* Show skeleton loader while role is being determined or data is loading */}
      {!isRoleDetermined || isLoading ? (
        <div className="space-y-8">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle>Total Visits</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-4 w-24 mt-2" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle>Active Employees</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-4 w-24 mt-2" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle>Live Locations</CardTitle>
                <MapPin className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-4 w-24 mt-2" />
              </CardContent>
            </Card>
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
                setMapCenter(DEFAULT_MAP_CENTER);
                setMapZoom(DEFAULT_MAP_ZOOM);
                setHighlightedEmployee(null);
                setSelectedEmployeeMarkers([]);
              }}
              mapCenter={mapCenter}
              mapZoom={mapZoom}
              onMarkerClick={handleMarkerClick as unknown as (marker: Record<string, unknown>) => void}
              onEmployeeSelect={handleEmployeeSelect as unknown as (employee: Record<string, unknown>) => void}
              employeeList={employeeList}
            />
          )}

          {view === "state" && selectedState && (
            <StateSection
              selectedState={selectedState}
              stateEmployees={stateEmployees}
              onEmployeeDetailSelect={handleEmployeeDetailSelect as (employee: unknown) => void}
            />
          )}

          {view === "employeeDetail" && selectedEmployee && (
            <EmployeeDetailSection employee={selectedEmployee} dateRange={dateRange} />
          )}
        </>
      )}
    </div>
  );
}
