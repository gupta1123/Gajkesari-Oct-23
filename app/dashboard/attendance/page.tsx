"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SearchIcon, Loader2, Calendar, Sun, CloudSun, XCircle } from "lucide-react";
import EmployeeAttendanceCard from "@/components/employee-attendance-card";
import VisitDetailsModal from "@/components/visit-details-modal";
import { Text } from "@/components/ui/typography";
import { SearchableSelect, type SearchableOption } from "@/components/ui/searchable-select2";

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
  const [nameFilter, setNameFilter] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [visitData, setVisitData] = useState<unknown[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedEmployeeName, setSelectedEmployeeName] = useState<string>('');

  // Searchable year options
  const yearOptions = useMemo<SearchableOption[]>(() =>
    years.map((y) => ({ value: String(y), label: String(y) })),
  []);

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
        const parsed = JSON.parse(raw) as { selectedYear?: number; selectedMonth?: number; nameFilter?: string };
        if (typeof parsed.selectedYear === 'number') setSelectedYear(parsed.selectedYear);
        if (typeof parsed.selectedMonth === 'number') setSelectedMonth(parsed.selectedMonth);
        if (typeof parsed.nameFilter === 'string') setNameFilter(parsed.nameFilter);
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
        JSON.stringify({ selectedYear, selectedMonth, nameFilter })
      );
    } catch {}
  }, [selectedYear, selectedMonth, nameFilter]);

  // Get token from localStorage (you may need to adjust this based on your auth setup)
  const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;

  const fetchEmployees = useCallback(async () => {
    if (!token) {
      console.error("Auth token is missing");
      return;
    }

    try {
      const response = await fetch("https://api.gajkesaristeels.in/employee/getAll", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch employees");
      }

      const data = await response.json();
      setEmployees(data);
    } catch (error) {
      console.error("Error fetching employees:", error);
    }
  }, [token]);

  const fetchAttendanceData = useCallback(async () => {
    setIsLoading(true);

    if (!token) {
      console.error("Auth token is missing");
      return;
    }

    const startDate = new Date(selectedYear, selectedMonth, 1).toISOString().split("T")[0];
    const lastDayOfMonth = new Date(selectedYear, selectedMonth + 1, 0);
    const nextDay = new Date(lastDayOfMonth);
    nextDay.setDate(lastDayOfMonth.getDate() + 1);
    const endDate = nextDay.toISOString().split("T")[0];

    try {
      const response = await fetch(
        `https://api.gajkesaristeels.in/attendance-log/getForRange1?start=${startDate}&end=${endDate}`,
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
        // Preserve original status for breakdowns
        const originalStatus = item.attendanceStatus as string;
        // Normalize the attendance status values used by calendar/summary
        let normalizedStatus = originalStatus;
        if (originalStatus === "Present") {
          normalizedStatus = "full day";
        } else if (originalStatus === "Absent") {
          normalizedStatus = "absent";
        } else if (originalStatus === "Half Day") {
          normalizedStatus = "half day";
        } else if (originalStatus === "Paid Leave") {
          normalizedStatus = "paid";
        } else if (originalStatus === "Activity") {
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
        const url = `https://api.gajkesaristeels.in/visit/getByDateSorted?startDate=${date}&endDate=${date}&employeeName=${employeeName}&page=0&size=100&sort=id,desc`;
        
        console.log('Making API request to:', url);
        console.log('Request params:', { date, employeeName, token: token ? 'Present' : 'Missing' });
        
        const response = await fetch(url, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error("Failed to fetch visit data");
        }

        const data = await response.json();
        
        console.log('Visit API Response:', {
          date,
          employeeName,
          totalElements: data.totalElements,
          contentLength: data.content?.length,
          content: data.content
        });

        // The API already filters by employeeName, so we can use all the content directly
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

  // Filter employees by name, then sort
  const filteredEmployees = employees
    .filter((employee) =>
      `${employee.firstName} ${employee.lastName}`.toLowerCase().includes(nameFilter.toLowerCase())
    )
    .sort((a, b) => {
      const nameA = `${a.firstName} ${a.lastName}`.toLowerCase();
      const nameB = `${b.firstName} ${b.lastName}`.toLowerCase();
      return nameA.localeCompare(nameB);
    });

  return (
    <div className="container mx-auto py-8 px-4 sm:px-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-4 sm:space-y-0 sm:space-x-4">
          <div className="w-full sm:w-auto">
            <SearchableSelect
              options={yearOptions}
              value={String(selectedYear)}
              onSelect={(opt) => {
                if (!opt) return;
                const yr = parseInt(opt.value);
                if (!Number.isNaN(yr)) setSelectedYear(yr);
              }}
              placeholder="Select a year"
              triggerClassName="w-[180px]"
              contentClassName="w-[var(--radix-popover-trigger-width)]"
              searchPlaceholder="Search year..."
            />
          </div>
          <div>
            <Select value={selectedMonth.toString()} onValueChange={(value) => setSelectedMonth(parseInt(value))}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select a month" />
              </SelectTrigger>
              <SelectContent>
                {months.map((month, index) => (
                  <SelectItem key={month} value={index.toString()}>
                    {month}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Input
              type="text"
              placeholder="Filter by name"
              value={nameFilter}
              onChange={(e) => setNameFilter(e.target.value)}
            />
          </div>
        </div>
        <div className="mb-4">
          <p className="text-lg font-bold text-foreground">Legend:</p>
          <div className="flex space-x-4">
            <div className="flex items-center">
              <span className="inline-block w-3.5 h-3.5 rounded-sm bg-green-500 dark:bg-green-400 mr-2" />
              <p className="text-muted-foreground">Full Day</p>
            </div>
            <div className="flex items-center">
              <span className="inline-block w-3.5 h-3.5 rounded-sm bg-yellow-500 dark:bg-yellow-400 mr-2" />
              <p className="text-muted-foreground">Half Day</p>
            </div>
            <div className="flex items-center">
              <span className="inline-block w-3.5 h-3.5 rounded-sm bg-red-500 dark:bg-red-400 mr-2" />
              <p className="text-muted-foreground">Absent</p>
            </div>
          </div>
        </div>
      </div>

      {noDataMessage && <p className="mb-4 text-red-500">{noDataMessage}</p>}

      <div className="space-y-4">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="h-48 bg-gray-200 animate-pulse rounded-lg"></div>
          ))
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {filteredEmployees.map((employee) => {
              const initialSummary = { fullDays: 0, halfDays: 0, absentDays: 0 };
              const employeeAttendance = attendanceData.filter((data) => data.employeeId === employee.id);
              
              // Console log the dates for this employee
              const employeeDates = employeeAttendance.map(item => new Date(item.checkinDate).getDate());
              console.log(`Dates passed to AttendanceCard for ${employee.firstName} ${employee.lastName}:`, employeeDates);
              
              return (
                <EmployeeAttendanceCard
                  key={employee.id}
                  employee={{
                    id: employee.id,
                    name: `${employee.firstName} ${employee.lastName}`,
                    position: employee.position,
                    avatar: "",
                    fullDays: 0,
                    halfDays: 0,
                    absent: 0,
                    attendance: employeeAttendance.map(att => ({
                      date: att.checkinDate,
                      status: att.attendanceStatus === 'full day' ? 'present' : att.attendanceStatus === 'half day' ? 'half' : 'absent',
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
