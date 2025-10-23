"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarIcon, DownloadIcon, ChevronLeft, ChevronRight, Loader2, User, Building, Clock, Target, ChevronDown, ChevronUp } from "lucide-react";
import { format } from "date-fns";
import { DateRange } from "react-day-picker";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { SpacedCalendar } from "@/components/ui/spaced-calendar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useRouter } from "next/navigation";
// Removed dropdown menu imports as Actions now uses direct navigation
import { API, type VisitDto, type VisitResponse, type EmployeeUserDto, type TeamDataDto } from "@/lib/api";
import { format as formatDate } from "date-fns";
import { useAuth } from "@/components/auth-provider";
import { formatTimeTo12Hour, formatDateToUserFriendly, formatLastUpdated } from "@/lib/utils";
import { SearchableSelect, type SearchableOption } from "@/components/ui/searchable-select2";

const VISITS_TABLE_STORAGE_KEY = "visits.table.state.v1";

type Row = {
  id: number;
  customerName: string;
  executive: string;
  employeeId?: number;
  date: string; // yyyy-MM-dd
  status?: string;
  purpose?: string;
  visitStart?: string;
  visitEnd?: string;
  intent?: number;
  lastUpdated?: string;
  priority?: string;
  outcome?: string;
  feedback?: string;
  city?: string;
  state?: string;
  checkinTime?: string;
  checkoutTime?: string;
};

export default function VisitsTable() {
  const { userRole, userData, currentUser } = useAuth();
  const router = useRouter();
  const [navigatingVisitId, setNavigatingVisitId] = useState<number | null>(null);
  const [isNavigating, startTransition] = useTransition();
  const filterInitialisedRef = useRef(false);
  const hasHydratedRef = useRef(false);
  const [isStateHydrated, setIsStateHydrated] = useState(false);
  
  // Set default date range to last 7 days
  const defaultEndDate = new Date();
  const defaultStartDate = new Date();
  defaultStartDate.setDate(defaultEndDate.getDate() - 7);
  
  const [startDate, setStartDate] = useState<Date | undefined>(defaultStartDate);
  const [endDate, setEndDate] = useState<Date | undefined>(defaultEndDate);
  const [selectedPurpose, setSelectedPurpose] = useState<string>("all");
  const [selectedExecutive, setSelectedExecutive] = useState<string>("all");
  const [customerName, setCustomerName] = useState<string>("");
  const [rows, setRows] = useState<Row[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  const [expandedCards, setExpandedCards] = useState<number[]>([]);

  const [employees, setEmployees] = useState<EmployeeUserDto[]>([]);
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(false);
  
  useEffect(() => {
    let isMounted = true;

    const loadEmployees = async () => {
      try {
        setIsLoadingEmployees(true);
        const employeeList = await API.getAllEmployees();
        if (!isMounted) {
          return;
        }
        setEmployees(employeeList);
      } catch (err) {
        console.error("Failed to load employees list:", err);
      } finally {
        if (isMounted) {
          setIsLoadingEmployees(false);
        }
      }
    };

    loadEmployees();

    return () => {
      isMounted = false;
    };
  }, []);

  // Role-based state
  const [isManager, setIsManager] = useState(false);
  const [teamMembers, setTeamMembers] = useState<EmployeeUserDto[]>([]);
  const [teamId, setTeamId] = useState<number | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    if (hasHydratedRef.current) {
      setIsStateHydrated(true);
      return;
    }

    hasHydratedRef.current = true;

    try {
      const storedState = sessionStorage.getItem(VISITS_TABLE_STORAGE_KEY);
      if (storedState) {
        const parsed = JSON.parse(storedState) as {
          startDate?: string;
          endDate?: string;
          selectedPurpose?: string;
          selectedExecutive?: string;
          customerName?: string;
          currentPage?: number;
          pageSize?: number;
          expandedCards?: number[];
        };

        if (parsed.startDate) {
          const parsedStart = new Date(parsed.startDate);
          if (!Number.isNaN(parsedStart.getTime())) {
            setStartDate(parsedStart);
          }
        }

        if (parsed.endDate) {
          const parsedEnd = new Date(parsed.endDate);
          if (!Number.isNaN(parsedEnd.getTime())) {
            setEndDate(parsedEnd);
          }
        }

        if (parsed.selectedPurpose) {
          setSelectedPurpose(parsed.selectedPurpose);
        }

        if (parsed.selectedExecutive) {
          setSelectedExecutive(parsed.selectedExecutive);
        }

        if (typeof parsed.customerName === "string") {
          setCustomerName(parsed.customerName);
        }

        if (typeof parsed.currentPage === "number") {
          setCurrentPage(parsed.currentPage);
        }

        if (typeof parsed.pageSize === "number" && parsed.pageSize > 0) {
          setPageSize(parsed.pageSize);
        }

        if (Array.isArray(parsed.expandedCards)) {
          setExpandedCards(parsed.expandedCards);
        }
      }
    } catch (error) {
      console.error("Failed to restore visit table state:", error);
    } finally {
      setIsStateHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!isStateHydrated || typeof window === 'undefined') {
      return;
    }

    const payload = {
      startDate: startDate ? startDate.toISOString() : undefined,
      endDate: endDate ? endDate.toISOString() : undefined,
      selectedPurpose,
      selectedExecutive,
      customerName,
      currentPage,
      pageSize,
      expandedCards,
    };

    try {
      sessionStorage.setItem(VISITS_TABLE_STORAGE_KEY, JSON.stringify(payload));
    } catch (error) {
      console.error("Failed to persist visit table state:", error);
    }
  }, [
    isStateHydrated,
    startDate,
    endDate,
    selectedPurpose,
    selectedExecutive,
    customerName,
    currentPage,
    pageSize,
    expandedCards,
  ]);

  const purposes = useMemo(() => {
    const set = new Set<string>();
    rows.forEach(r => { if (r.purpose) set.add(r.purpose); });
    return Array.from(set);
  }, [rows]);

  const employeeOptions = useMemo<SearchableOption[]>(() => {
    const base = employees.map((employee) => {
      const fullName = [employee.firstName, employee.lastName].filter(Boolean).join(" ").trim();
      const identifier = employee.userDto?.employeeId ?? null;
      const displayName = fullName || employee.userName || employee.email || `Employee ${identifier ?? employee.id}`;
      const label = identifier !== null ? `${displayName} (${identifier})` : displayName;
      return {
        value: String(employee.id),
        label,
      };
    });

    base.sort((a, b) => a.label.localeCompare(b.label));

    return [{ value: "all", label: "All Executives" }, ...base];
  }, [employees]);

  useEffect(() => {
    if (selectedExecutive === "all" || employees.length === 0) {
      return;
    }

    const hasExactMatch = employeeOptions.some((option) => option.value === selectedExecutive);
    if (hasExactMatch) {
      return;
    }

    const legacyMatch = employees.find((employee) => {
      const fullName = [employee.firstName, employee.lastName].filter(Boolean).join(" ").trim();
      const displayName = fullName || employee.userName || employee.email || `Employee ${employee.id}`;
      return fullName === selectedExecutive || displayName === selectedExecutive;
    });

    if (legacyMatch) {
      setSelectedExecutive(String(legacyMatch.id));
    } else {
      setSelectedExecutive("all");
    }
  }, [selectedExecutive, employeeOptions, employees]);

  const toggleCardExpansion = (visitId: number) => {
    setExpandedCards(prev => 
      prev.includes(visitId) 
        ? prev.filter(id => id !== visitId)
        : [...prev, visitId]
    );
  };

  const handleViewDetails = (visitId: number) => {
    if (navigatingVisitId !== null || isNavigating) {
      return;
    }
    setNavigatingVisitId(visitId);
    startTransition(() => {
      router.push(`/dashboard/visits/${visitId}`);
    });
  };

  useEffect(() => {
    if (!isNavigating && navigatingVisitId !== null) {
      setNavigatingVisitId(null);
    }
  }, [isNavigating, navigatingVisitId]);

  // Determine user role and load team members for managers
  useEffect(() => {
    const checkUserRole = () => {
      // Check both userRole and currentUser authorities
      const isManagerRole = userRole === 'MANAGER' || 
        currentUser?.authorities?.some(auth => auth.authority === 'ROLE_MANAGER');
      
      console.log('Role detection - userRole:', userRole);
      console.log('Role detection - currentUser authorities:', currentUser?.authorities);
      console.log('Role detection - isManagerRole:', isManagerRole);
      
      setIsManager(!!isManagerRole);
    };
    checkUserRole();
  }, [userRole, currentUser]);

  // Load team members for managers
  useEffect(() => {
    const loadTeamMembers = async () => {
      if (!isManager || !userData?.employeeId) return;
      if (employees.length === 0) {
        console.log('Employee list not available yet, waiting before computing team members');
        return;
      }

      try {
        console.log('Loading team members for manager employee ID:', userData.employeeId);
        const teamData: TeamDataDto[] = await API.getTeamByEmployee(userData.employeeId);
        console.log('Team data received:', teamData);
        console.log('Team data structure:', JSON.stringify(teamData, null, 2));
        
        if (teamData && teamData.length > 0) {
          // Extract team ID from the first team (assuming manager has one team)
          const firstTeam = teamData[0];
          setTeamId(firstTeam.id);
          console.log('Team ID set to:', firstTeam.id);
          
          const teamMemberIds = teamData.flatMap(team =>
            team.fieldOfficers.map(fo => fo.id)
          );
          console.log('Team member IDs from team data:', teamMemberIds);

          console.log('All employees count:', employees.length);
          console.log('Sample employees:', employees.slice(0, 5).map(emp => ({ id: emp.id, name: `${emp.firstName} ${emp.lastName}` })));
          
          const filteredTeamMembers = employees.filter(emp =>
            teamMemberIds.includes(emp.id)
          );
          console.log('Filtered team members:', filteredTeamMembers);
          setTeamMembers(filteredTeamMembers);
        } else {
          console.log('No team data found for manager');
          setTeamId(null);
          setTeamMembers([]);
        }
      } catch (err) {
        console.error('Failed to load team members:', err);
        console.error('Error details:', (err as Error).message, (err as Error).stack);
        setError('Failed to load team members');
        setTeamId(null);
        setTeamMembers([]);
      }
    };

    if (isManager && userData?.employeeId) {
      loadTeamMembers();
    }
  }, [isManager, userData?.employeeId, employees]);

  useEffect(() => {
    if (!isStateHydrated) return;
    if (!startDate || !endDate) return;
    
    // For managers, wait until we have teamId
    if (isManager && !teamId) {
      console.log('⏳ Manager detected but no teamId yet - waiting for team data');
      return;
    }
    
    const startStr = formatDate(startDate, 'yyyy-MM-dd');
    const endStr = formatDate(endDate, 'yyyy-MM-dd');

    const run = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const storeNameFilter = customerName.trim() !== '' ? customerName : undefined;
        const purposeFilter = selectedPurpose !== 'All Purposes' ? selectedPurpose : undefined;
        
        console.log('Making API call with filters:', {
          startDate: startStr,
          endDate: endStr,
          page: currentPage,
          size: pageSize,
          sort: 'visitDate,desc',
          storeName: storeNameFilter,
          purpose: purposeFilter,
          isManager,
          teamId: teamId,
          teamMemberCount: teamMembers.length,
          userRole: userRole,
          currentUserAuthorities: currentUser?.authorities
        });
        
        let response: VisitResponse;
        
        // Use team-specific API for managers, regular API for admins
        console.log('🔍 API Selection Debug:', {
          isManager,
          teamId,
          userRole,
          currentUserAuthorities: currentUser?.authorities,
          userDataEmployeeId: userData?.employeeId,
          teamMembersCount: teamMembers.length
        });

        if (isManager && teamId) {
          console.log('🔵 MANAGER DETECTED - Using team-specific API');
          console.log('Team ID:', teamId);
          console.log('API Endpoint: /visit/getForTeam');
          response = await API.getVisitsForTeam(
            teamId,
            startStr,
            endStr,
            currentPage,
            pageSize,
            'visitDate,desc',
            purposeFilter,
            undefined, // priority filter
            storeNameFilter
          );
        } else {
          console.log('🟢 ADMIN DETECTED - Using regular API');
          console.log('Reason:', !isManager ? 'Not a manager' : 'No teamId');
          console.log('API Endpoint: /visit/getByDateSorted');
          response = await API.getVisitsByDateSorted(
            startStr,
            endStr,
            currentPage,
            pageSize,
            'visitDate,desc',
            storeNameFilter
          );
        }
        
        console.log('API Response:', response);
        console.log('Total elements:', response.totalElements);
        console.log('Content length:', response.content?.length);
        
        // Extract visits from the content array
        const visits: VisitDto[] = response.content || [];
        
        const mapped: Row[] = visits.map(v => ({
          id: v.id,
          customerName: v.storeName,
          executive: v.employeeName,
          employeeId: v.employeeId,
          date: v.visit_date,
          status: v.checkinTime ? 'Completed' : 'Scheduled',
          purpose: v.purpose ?? undefined,
          visitStart: v.checkinTime ?? undefined,
          visitEnd: v.checkoutTime ?? undefined,
          intent: v.intent ?? undefined,
          lastUpdated: v.updatedAt ? `${v.updatedAt} ${v.updatedTime || ''}` : undefined,
          priority: v.priority ?? undefined,
          outcome: v.outcome ?? undefined,
          feedback: v.feedback ?? undefined,
          city: v.city ?? undefined,
          state: v.state ?? undefined,
          checkinTime: v.checkinTime ?? undefined,
          checkoutTime: v.checkoutTime ?? undefined,
        }));
        
        setRows(mapped);
        // Use actual total pages and elements from API response
        const resolvedTotalPages = response.totalPages && response.totalPages > 0 ? response.totalPages : 1;
        setTotalPages(resolvedTotalPages);
        setTotalElements(response.totalElements || 0);

        if (currentPage >= resolvedTotalPages) {
          const nextPage = Math.max(resolvedTotalPages - 1, 0);
          if (nextPage !== currentPage) {
            setCurrentPage(nextPage);
          }
        }
      } catch (err) {
        setError((err as Error)?.message || 'Failed to load visits');
      } finally {
        setIsLoading(false);
      }
    };
    run();
  }, [isStateHydrated, startDate, endDate, selectedPurpose, customerName, currentPage, pageSize, isManager, teamId]);

  // Reset to first page when filters change
  useEffect(() => {
    if (!isStateHydrated) return;
    if (!filterInitialisedRef.current) {
      filterInitialisedRef.current = true;
      return;
    }
    setCurrentPage(0);
  }, [isStateHydrated, startDate, endDate, selectedPurpose, selectedExecutive, customerName]);

  const filteredVisits = rows.filter(visit => {
    // Purpose filter (client-side since API doesn't support it yet)
    if (selectedPurpose !== "all" && visit.purpose !== selectedPurpose) return false;
    
    // Executive filter (client-side since API doesn't support it yet)
    if (selectedExecutive !== "all" && String(visit.employeeId ?? '') !== selectedExecutive) return false;
    
    return true;
  });


  const csvEscape = (val: string | number | null | undefined): string => {
    if (val === null || val === undefined) return '';
    let s = String(val);
    if (s.includes('"')) s = s.replace(/"/g, '""');
    if (/[",\n]/.test(s)) s = `"${s}"`;
    return s;
  };

  const buildCsvAndDownload = (rowsForCsv: Row[]) => {
    const headers = [
      'Customer Name',
      'Executive',
      'Date',
      'Status',
      'Purpose',
      'Visit Start',
      'Visit End',
      'Intent',
      'Last Updated',
      'City',
      'State',
    ];

    const lines = [headers.map(csvEscape).join(',')];

    for (const r of rowsForCsv) {
      const status = r.checkinTime ? 'Completed' : 'Scheduled';
      const lastUpdated = r.lastUpdated ?? '';
      const line = [
        r.customerName,
        r.executive,
        r.date,
        status,
        r.purpose ?? '',
        r.visitStart ?? '',
        r.visitEnd ?? '',
        r.intent ?? '',
        lastUpdated,
        r.city ?? '',
        r.state ?? '',
      ].map(csvEscape).join(',');
      lines.push(line);
    }

    const csv = lines.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'visits.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleExport = async () => {
    try {
      setIsExporting(true);
      if (!startDate || !endDate) return;
      const startStr = formatDate(startDate, 'yyyy-MM-dd');
      const endStr = formatDate(endDate, 'yyyy-MM-dd');

      const size = 200;
      let page = 0;
      let all: VisitDto[] = [];
      // Use server-side storeName filter if provided
      const storeNameFilter = customerName.trim() !== '' ? customerName : undefined;

      // First call to get total pages
      const first = await API.getVisitsByDateSorted(startStr, endStr, page, size, 'visitDate,desc', storeNameFilter);
      all = all.concat(first.content || []);
      const total = first.totalPages || 1;

      for (page = 1; page < total; page++) {
        const res = await API.getVisitsByDateSorted(startStr, endStr, page, size, 'visitDate,desc', storeNameFilter);
        all = all.concat(res.content || []);
      }

      // Filter visits based on role
      if (isManager && teamMembers.length > 0) {
        const teamMemberIds = teamMembers.map(member => member.id);
        all = all.filter(visit => teamMemberIds.includes(visit.employeeId));
      }

      // Map to table Row type
      const mapped: Row[] = all.map((v) => ({
        id: v.id,
        customerName: v.storeName,
        executive: v.employeeName,
        employeeId: v.employeeId,
        date: v.visit_date,
        status: v.checkinTime ? 'Completed' : 'Scheduled',
        purpose: v.purpose ?? undefined,
        visitStart: v.checkinTime ?? undefined,
        visitEnd: v.checkoutTime ?? undefined,
        intent: v.intent ?? undefined,
        lastUpdated: v.updatedAt ? `${v.updatedAt} ${v.updatedTime || ''}` : undefined,
        priority: v.priority ?? undefined,
        outcome: v.outcome ?? undefined,
        feedback: v.feedback ?? undefined,
        city: v.city ?? undefined,
        state: v.state ?? undefined,
        checkinTime: v.checkinTime ?? undefined,
        checkoutTime: v.checkoutTime ?? undefined,
      }));

      // Apply same client-side Purpose/Executive filters
      const rowsForCsv = mapped.filter(visit => {
        if (selectedPurpose !== 'all' && visit.purpose !== selectedPurpose) return false;
        if (selectedExecutive !== 'all' && String(visit.employeeId ?? '') !== selectedExecutive) return false;
        return true;
      });

      buildCsvAndDownload(rowsForCsv);
    } catch (e) {
      console.error('Export failed', e);
      alert('Failed to export CSV');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <>
      <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-end">
          {userRole && (
            <Badge variant={isManager ? "secondary" : "default"} className="text-xs">
              {isManager ? "Manager View" : "Admin View"}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="w-full">
        {error && (
          <div className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded p-3">{error}</div>
        )}
        
        {/* Status indicator */}
        {!startDate || !endDate ? (
          <div className="mb-4 text-sm text-blue-700 bg-blue-50 border border-blue-200 rounded p-3">
            Please select both start and end dates to load visits data.
          </div>
        ) : isLoading ? (
          <div className="mb-4 text-sm text-yellow-700 bg-yellow-50 border border-yellow-200 rounded p-3">
            Loading visits data...
          </div>
        ) : isManager && !teamId ? (
          <div className="mb-4 text-sm text-blue-700 bg-blue-50 border border-blue-200 rounded p-3">
            🔵 Manager detected - Loading team data...
          </div>
        ) : null}
        
        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
          <div className="space-y-2">
            <Label>Start Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {startDate ? (
                    format(startDate, "LLL dd, y")
                  ) : (
                    <span>Select start date</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <SpacedCalendar
                  initialFocus
                  mode="single"
                  defaultMonth={startDate}
                  selected={startDate}
                  onSelect={setStartDate}
                />
              </PopoverContent>
            </Popover>
          </div>
          
          <div className="space-y-2">
            <Label>End Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {endDate ? (
                    format(endDate, "LLL dd, y")
                  ) : (
                    <span>Select end date</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <SpacedCalendar
                  initialFocus
                  mode="single"
                  defaultMonth={endDate}
                  selected={endDate}
                  onSelect={setEndDate}
                />
              </PopoverContent>
            </Popover>
          </div>
          
          <div className="space-y-2">
            <Label>Purpose</Label>
            <Select value={selectedPurpose} onValueChange={setSelectedPurpose}>
              <SelectTrigger>
                <SelectValue placeholder="Select purpose" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Purposes</SelectItem>
                {purposes.map((purpose) => (
                  <SelectItem key={purpose} value={purpose}>
                    {purpose}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label>Customer Name</Label>
            <Input
              placeholder="Search customer"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
            />
          </div>
          
          <div className="space-y-2">
            <Label>Executive</Label>
            <SearchableSelect
              options={employeeOptions}
              value={selectedExecutive}
              onSelect={(option) => {
                if (!option || option.value === "all") {
                  setSelectedExecutive("all");
                } else {
                  setSelectedExecutive(option.value);
                }
              }}
              placeholder="Select executive"
              loading={isLoadingEmployees}
              triggerClassName="w-full justify-between h-11"
              contentClassName="w-[var(--radix-popover-trigger-width)]"
              searchPlaceholder="Search executives..."
            />
          </div>
          
          <div className="flex items-end">
            <Button onClick={handleExport} className="w-full" disabled={isExporting}>
              {isExporting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <DownloadIcon className="mr-2 h-4 w-4" />
                  Export CSV
                </>
              )}
            </Button>
          </div>
        </div>
        
        {/* Desktop Table View */}
        <div className="hidden md:block rounded-md border overflow-hidden w-full">
          <div className="overflow-x-auto w-full">
            <Table className="min-w-full">
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap">Customer Name</TableHead>
                  <TableHead className="whitespace-nowrap">Executive</TableHead>
                  <TableHead className="whitespace-nowrap">Date</TableHead>
                  <TableHead className="whitespace-nowrap">Status</TableHead>
                  <TableHead className="whitespace-nowrap">Purpose</TableHead>
                  <TableHead className="whitespace-nowrap">Visit Start</TableHead>
                  <TableHead className="whitespace-nowrap">Visit End</TableHead>
                  <TableHead className="whitespace-nowrap">Intent</TableHead>
                  <TableHead className="whitespace-nowrap">Last Updated</TableHead>
                  <TableHead className="whitespace-nowrap">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!startDate || !endDate ? (
                  <TableRow>
                    <TableCell colSpan={10} className="h-24 text-center text-gray-500">
                      Select both start and end dates to view visits
                    </TableCell>
                  </TableRow>
                ) : isLoading ? (
                  <TableRow>
                    <TableCell colSpan={10} className="h-24 text-center">Loading visits…</TableCell>
                  </TableRow>
                ) : filteredVisits.length > 0 ? (
                  filteredVisits.map((visit) => (
                    <TableRow key={visit.id}>
                      <TableCell className="font-medium whitespace-nowrap">
                        {visit.customerName}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">{visit.executive}</TableCell>
                      <TableCell className="whitespace-nowrap">{formatDateToUserFriendly(visit.date)}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs whitespace-nowrap ${
                          visit.status === "Completed" 
                            ? "bg-green-100 text-green-800" 
                            : visit.status === "Scheduled" 
                              ? "bg-blue-100 text-blue-800" 
                              : visit.status === "In Progress" 
                                ? "bg-yellow-100 text-yellow-800" 
                                : "bg-red-100 text-red-800"
                        }`}>
                          {visit.status ?? '—'}
                        </span>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">{visit.purpose ?? '—'}</TableCell>
                      <TableCell className="whitespace-nowrap">{visit.visitStart ? formatTimeTo12Hour(visit.visitStart) : '—'}</TableCell>
                      <TableCell className="whitespace-nowrap">{visit.visitEnd ? formatTimeTo12Hour(visit.visitEnd) : '—'}</TableCell>
                      <TableCell className="whitespace-nowrap">{visit.intent}</TableCell>
                      <TableCell className="whitespace-nowrap">{visit.lastUpdated ? formatLastUpdated(visit.lastUpdated) : '—'}</TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewDetails(visit.id)}
                          disabled={navigatingVisitId !== null}
                        >
                          {navigatingVisitId === visit.id ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Opening…
                            </>
                          ) : (
                            "View Details"
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={10} className="h-24 text-center">
                      No visits found matching the selected filters
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden space-y-4">
          {!startDate || !endDate ? (
            <div className="text-center py-10">
              <p className="text-lg text-gray-500">Select both start and end dates to view visits</p>
            </div>
          ) : isLoading ? (
            <div className="text-center py-10">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
              <p className="text-lg">Loading visits…</p>
            </div>
          ) : filteredVisits.length > 0 ? (
            filteredVisits.map((visit) => (
              <Card key={visit.id} className="overflow-hidden shadow-md hover:shadow-lg transition-shadow duration-300">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="h-12 w-12 bg-primary rounded-full flex items-center justify-center">
                        <Building className="h-6 w-6 text-primary-foreground" />
                      </div>
                      <div>
                        <CardTitle className="text-lg font-bold">{visit.customerName}</CardTitle>
                        <p className="text-sm text-muted-foreground">{formatDateToUserFriendly(visit.date)}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                        visit.status === "Completed" 
                          ? "bg-green-100 text-green-800" 
                          : visit.status === "Scheduled" 
                            ? "bg-blue-100 text-blue-800" 
                            : visit.status === "In Progress" 
                              ? "bg-yellow-100 text-yellow-800" 
                              : "bg-red-100 text-red-800"
                      }`}>
                        {visit.status ?? '—'}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleCardExpansion(visit.id)}
                      >
                        {expandedCards.includes(visit.id) ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <User className="text-blue-500 h-4 w-4" />
                      <span className="text-base font-medium">Executive:</span>
                      <span className="text-base">{visit.executive}</span>
                    </div>
                  </div>

                  {expandedCards.includes(visit.id) && (
                    <div className="mt-4 space-y-3 text-base">
                      {visit.purpose && (
                        <div className="flex items-center space-x-2">
                          <Target className="text-purple-500 h-4 w-4" />
                          <span className="font-medium">Purpose:</span>
                          <span>{visit.purpose}</span>
                        </div>
                      )}
                      {visit.visitStart && (
                        <div className="flex items-center space-x-2">
                          <Clock className="text-green-500 h-4 w-4" />
                          <span className="font-medium">Visit Start:</span>
                          <span>{formatTimeTo12Hour(visit.visitStart)}</span>
                        </div>
                      )}
                      {visit.visitEnd && (
                        <div className="flex items-center space-x-2">
                          <Clock className="text-red-500 h-4 w-4" />
                          <span className="font-medium">Visit End:</span>
                          <span>{formatTimeTo12Hour(visit.visitEnd)}</span>
                        </div>
                      )}
                      {visit.intent && (
                        <div className="flex items-center space-x-2">
                          <Target className="text-orange-500 h-4 w-4" />
                          <span className="font-medium">Intent:</span>
                          <span>{visit.intent}</span>
                        </div>
                      )}
                      {visit.lastUpdated && (
                        <div className="flex items-center space-x-2">
                          <CalendarIcon className="text-indigo-500 h-4 w-4" />
                          <span className="font-medium">Last Updated:</span>
                          <span>{formatLastUpdated(visit.lastUpdated)}</span>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="mt-4 flex justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-base px-4 py-2"
                      onClick={() => handleViewDetails(visit.id)}
                      disabled={navigatingVisitId !== null}
                    >
                      {navigatingVisitId === visit.id ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Opening…
                        </>
                      ) : (
                        "View Details"
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="text-center py-10">
              <p className="text-lg">No visits found matching the selected filters</p>
            </div>
          )}
        </div>
        
        {/* Pagination Controls */}
        {startDate && endDate && (
          <div className="flex items-center justify-between mt-4">
          <div className="flex items-center space-x-2">
            <Label htmlFor="pageSize">Rows per page:</Label>
            <Select value={pageSize.toString()} onValueChange={(value) => setPageSize(parseInt(value))}>
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
              disabled={currentPage === 0}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            
            <span className="text-sm text-muted-foreground">
              Page {currentPage + 1} of {totalPages}
            </span>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 1))}
              disabled={currentPage >= totalPages - 1}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        )}
      </CardContent>
      </Card>
      {navigatingVisitId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur">
          <div className="w-full max-w-3xl space-y-6 rounded-2xl border border-border/40 bg-card/95 p-8 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-8 w-64" />
              </div>
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {Array.from({ length: 4 }).map((_, idx) => (
                <Skeleton key={idx} className="h-20 w-full rounded-xl" />
              ))}
            </div>
            <Skeleton className="h-32 w-full rounded-xl" />
            <p className="text-center text-sm text-muted-foreground">
              Preparing visit details…
            </p>
          </div>
        </div>
      )}
    </>
  );
}
