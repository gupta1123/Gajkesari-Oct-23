"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import EmployeeAttendanceCard from "@/components/employee-attendance-card";
import VisitDetailsModal from "@/components/visit-details-modal";
import { SearchableSelect, type SearchableOption } from "@/components/ui/searchable-select2";
import { API } from "@/lib/api";
import { getEmployeeRoleCategory, getEmployeeRoleLabel, isAdminEmployeeRole } from "@/lib/employee-role";

const API_BASE_URL = 'https://api.gajkesaristeels.in';

interface AttendanceData {
  id: number;
  employeeId: number;
  employeeName: string;
  attendanceStatus: 'full day' | 'half day' | 'Absent';
  checkinDate: string;
  checkoutDate: string;
}

interface Employee {
  id: number;
  firstName: string;
  lastName: string;
  employeeId: string;
  department: string;
  position: string;
  role: string;
}

const years = Array.from({ length: 27 }, (_, index) => 2024 + index);
const months = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export default function AttendancePage() {
  const [attendanceData, setAttendanceData] = useState<AttendanceData[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [noDataMessage, setNoDataMessage] = useState<string>("");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<'all' | 'regional-manager' | 'field-officer'>('all');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [visitData, setVisitData] = useState<unknown[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedEmployeeName, setSelectedEmployeeName] = useState<string>('');

  // Searchable year options
  const yearOptions = useMemo<SearchableOption[]>(() =>
    years.map((y) => ({ value: String(y), label: String(y) })),
  []);

  const roleFilteredEmployees = useMemo(() => employees.filter((employee) =>
    selectedRoleFilter === 'all' || getEmployeeRoleCategory(employee.role) === selectedRoleFilter
  ), [employees, selectedRoleFilter]);

  const employeeOptions = useMemo<SearchableOption[]>(() =>
    roleFilteredEmployees
      .map((employee) => ({
        value: String(employee.id),
        label: `${employee.firstName} ${employee.lastName}`,
      }))
      .sort((a, b) => a.label.localeCompare(b.label)),
  [roleFilteredEmployees]);

  // Persist page filters (year/month/name) across navigation
  const ATTENDANCE_STATE_KEY = 'attendance.page.state.v1';
  const hasHydratedRef = useRef(false);
  const [isFiltersHydrated, setIsFiltersHydrated] = useState(false);

  // Hydrate from session storage on first mount
  useEffect(() => {
    if (typeof window === 'undefined' || hasHydratedRef.current) return;
    try {
      const raw = sessionStorage.getItem(ATTENDANCE_STATE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { selectedYear?: number; selectedMonth?: number; selectedEmployeeId?: string; selectedRoleFilter?: string };
        if (typeof parsed.selectedYear === 'number') setSelectedYear(parsed.selectedYear);
        if (typeof parsed.selectedMonth === 'number') setSelectedMonth(parsed.selectedMonth);
        if (typeof parsed.selectedEmployeeId === 'string') setSelectedEmployeeId(parsed.selectedEmployeeId);
        if (parsed.selectedRoleFilter === 'regional-manager' || parsed.selectedRoleFilter === 'field-officer') {
          setSelectedRoleFilter(parsed.selectedRoleFilter);
        }
      }
    } catch {}
    hasHydratedRef.current = true;
    setIsFiltersHydrated(true);
  }, []);

  // Persist on changes
  useEffect(() => {
    if (typeof window === 'undefined' || !hasHydratedRef.current) return;
    try {
      sessionStorage.setItem(
        ATTENDANCE_STATE_KEY,
        JSON.stringify({ selectedYear, selectedMonth, selectedEmployeeId, selectedRoleFilter })
      );
    } catch {}
  }, [selectedYear, selectedMonth, selectedEmployeeId, selectedRoleFilter]);

  const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;

  const fetchEmployees = useCallback(async () => {
    if (!token) {
      console.error("Auth token is missing");
      return;
    }

    try {
      const data = (await API.getAllEmployees()) as unknown as Employee[];
      setEmployees(data.filter((employee) => !isAdminEmployeeRole(employee.role)));
    } catch (error) {
      console.error("Error fetching employees:", error);
    }
  }, [token]);

  const fetchAttendanceData = useCallback(async () => {
    setIsLoading(true);

    if (!token) {
      console.error("Auth token is missing");
      setIsLoading(false);
      return;
    }

    const monthPrefix = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}`;
    const startDate = `${monthPrefix}-01`;
    const endDate = `${monthPrefix}-${new Date(selectedYear, selectedMonth + 1, 0).getDate()}`;

    try {
      const response = await fetch(
        `${API_BASE_URL}/attendance-log/getForRange1?start=${startDate}&end=${endDate}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch attendance data");
      }

      const data = await response.json();

      const modifiedData = data.map((item: Record<string, unknown>) => {
        const originalStatus = typeof item.attendanceStatus === "string" ? item.attendanceStatus : "";
        const normalizedOriginal = originalStatus.trim().toLowerCase();

        let normalizedStatus = originalStatus;
        if (normalizedOriginal === "present") {
          normalizedStatus = "absent";
        } else if (normalizedOriginal === "full day") {
          normalizedStatus = "full day";
        } else if (normalizedOriginal === "absent") {
          normalizedStatus = "absent";
        } else if (normalizedOriginal === "half day") {
          normalizedStatus = "half day";
        } else if (normalizedOriginal === "paid leave") {
          normalizedStatus = "paid";
        } else if (normalizedOriginal === "activity") {
          normalizedStatus = "activity";
        }

        return { ...item, attendanceStatus: normalizedStatus, rawStatus: originalStatus };
      });

      setAttendanceData(modifiedData);
      setNoDataMessage("");

      if (data.length === 0) {
        setNoDataMessage("No data available for the selected month and year. Please choose a different month or year.");
      }
    } catch (error) {
      console.error("Error fetching attendance data:", error);
      setAttendanceData([]);
      setNoDataMessage("No data available for the selected month and year. Please choose a different month or year.");
    }

    setIsLoading(false);
  }, [token, selectedYear, selectedMonth]);

  const fetchVisitData = useCallback(
    async (date: string, employeeName: string) => {
      if (!token) {
        console.error("Auth token is missing");
        return;
      }

      try {
        const data = await API.getVisitsByDateSorted(date, date, 0, 100, 'id,desc', undefined, employeeName);

        setVisitData(data.content || []);
        setSelectedDate(date);
        setSelectedEmployeeName(employeeName);
        setIsModalOpen(true);

        if (data.content.length === 0) {
          setVisitData([]);
        }
      } catch (error) {
        console.error("Error fetching visit data:", error);
        setVisitData([]);
      }
    },
    [token]
  );

  useEffect(() => {
    if (!isFiltersHydrated) return;
    fetchAttendanceData();
    fetchEmployees();
  }, [isFiltersHydrated, selectedYear, selectedMonth, token, fetchAttendanceData, fetchEmployees]);

  const attendanceByEmployee = useMemo(() => {
    const index = new Map<number, AttendanceData[]>();
    for (const attendance of attendanceData) {
      const employeeAttendance = index.get(attendance.employeeId);
      if (employeeAttendance) {
        employeeAttendance.push(attendance);
      } else {
        index.set(attendance.employeeId, [attendance]);
      }
    }
    return index;
  }, [attendanceData]);

  const filteredEmployees = useMemo(() => employees
    .filter((employee) => selectedRoleFilter === 'all' || getEmployeeRoleCategory(employee.role) === selectedRoleFilter)
    .filter((employee) => !selectedEmployeeId || String(employee.id) === selectedEmployeeId)
    .sort((a, b) => {
      const nameA = `${a.firstName} ${a.lastName}`.toLowerCase();
      const nameB = `${b.firstName} ${b.lastName}`.toLowerCase();
      return nameA.localeCompare(nameB);
    }), [employees, selectedEmployeeId, selectedRoleFilter]);

  return (
    <div className="container mx-auto px-4 py-4 sm:px-6">
      <section
        aria-label="Attendance filters and legend"
        className="mb-4 space-y-3 rounded-xl border border-border/60 bg-card p-3.5 shadow-sm sm:p-4"
      >
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div className="flex flex-wrap items-center gap-2.5 lg:flex-nowrap">
            <SearchableSelect
              options={yearOptions}
              value={String(selectedYear)}
              onSelect={(opt) => {
                if (!opt) return;
                const yr = parseInt(opt.value);
                if (!Number.isNaN(yr)) setSelectedYear(yr);
              }}
              placeholder="Select a year"
              triggerClassName="h-9 w-[100px] rounded-lg border-border/80 text-xs font-semibold"
              contentClassName="w-[var(--radix-popover-trigger-width)]"
              searchPlaceholder="Search year..."
            />

            <Select value={selectedMonth.toString()} onValueChange={(value) => setSelectedMonth(parseInt(value))}>
              <SelectTrigger className="h-9 w-[120px] rounded-lg border-border/80 text-xs font-semibold">
                <SelectValue placeholder="Select a month" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                {months.map((month, index) => (
                  <SelectItem key={month} value={index.toString()} className="text-xs">
                    {month}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={selectedRoleFilter}
              onValueChange={(value: 'all' | 'regional-manager' | 'field-officer') => {
                setSelectedRoleFilter(value);
                setSelectedEmployeeId('');
              }}
            >
              <SelectTrigger className="h-9 w-[130px] rounded-lg border-border/80 text-xs font-semibold" aria-label="Filter by role">
                <SelectValue placeholder="All roles" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="all" className="text-xs">All roles</SelectItem>
                <SelectItem value="regional-manager" className="text-xs">Regional Manager</SelectItem>
                <SelectItem value="field-officer" className="text-xs">Field Officer</SelectItem>
              </SelectContent>
            </Select>

            <div className="min-w-[160px] flex-1 sm:max-w-[160px]">
              <SearchableSelect
                options={employeeOptions}
                value={selectedEmployeeId}
                onSelect={(option) => setSelectedEmployeeId(option?.value ?? '')}
                placeholder="All employees"
                searchPlaceholder="Search employees..."
                emptyMessage="No employees available"
                noResultsMessage="No matching employees"
                allowClear
                triggerClassName="h-9 w-full rounded-lg border-border/80 text-xs"
                contentClassName="w-[var(--radix-popover-trigger-width)]"
              />
            </div>
          </div>

          <div className="flex min-w-0 max-w-full flex-nowrap items-center gap-2 overflow-x-auto whitespace-nowrap border-t border-border/40 pt-2 text-[11px] font-medium text-muted-foreground lg:border-t-0 lg:pt-0">
            <span className="mr-1 shrink-0 text-xs font-semibold text-foreground">Legend:</span>
            <div className="flex shrink-0 items-center gap-1.5 rounded-md border border-purple-500/20 bg-purple-500/10 px-2 py-0.5 text-purple-700 dark:text-purple-400">
              <span className="h-2 w-2 rounded-full bg-purple-500" />
              <span>Paid Leave</span>
            </div>
            <div className="flex shrink-0 items-center gap-1.5 rounded-md border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-emerald-700 dark:text-emerald-400">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span>Full Day</span>
            </div>
            <div className="flex shrink-0 items-center gap-1.5 rounded-md border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-amber-700 dark:text-amber-400">
              <span className="h-2 w-2 rounded-full bg-amber-500" />
              <span>Half Day</span>
            </div>
            <div className="flex shrink-0 items-center gap-1.5 rounded-md border border-rose-500/20 bg-rose-500/10 px-2 py-0.5 text-rose-700 dark:text-rose-400">
              <span className="h-2 w-2 rounded-full bg-rose-500" />
              <span>Absent</span>
            </div>
          </div>
        </div>
      </section>

      {noDataMessage && <p className="mb-4 text-xs text-red-500">{noDataMessage}</p>}

      <div className="space-y-4">
        {isLoading ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="h-48 bg-muted/40 animate-pulse rounded-lg border"></div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredEmployees.map((employee) => {
              const employeeAttendance = attendanceByEmployee.get(employee.id) ?? [];
              
              return (
                <EmployeeAttendanceCard
                  key={employee.id}
                  employee={{
                    id: employee.id,
                    name: `${employee.firstName} ${employee.lastName}`,
                    position: getEmployeeRoleLabel(employee.role),
                    avatar: "",
                    fullDays: 0,
                    halfDays: 0,
                    absent: 0,
                    attendance: employeeAttendance.map(att => ({
                      date: att.checkinDate,
                      status:
                        att.attendanceStatus === 'full day'
                          ? 'present'
                          : att.attendanceStatus === 'half day'
                            ? 'half'
                            : 'absent',
                      visits: []
                    }))
                  }}
                  selectedMonth={selectedMonth}
                  selectedYear={selectedYear}
                  attendanceData={employeeAttendance.map(a => ({
                    id: a.id,
                    employeeId: a.employeeId,
                    employeeName: a.employeeName,
                    attendanceStatus: a.attendanceStatus === 'Absent' ? 'absent' : a.attendanceStatus,
                    checkinDate: a.checkinDate,
                    checkoutDate: a.checkoutDate,
                    rawStatus: String((a as unknown as Record<string, unknown>).rawStatus || '')
                  }))}
                  onDateClick={(date, employeeName) => fetchVisitData(date, employeeName)}
                />
              );
            })}
          </div>
        )}
      </div>

      <VisitDetailsModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        visitData={visitData as Record<string, unknown>[]}
        selectedDate={selectedDate}
        employeeName={selectedEmployeeName}
      />
    </div>
  );
}
