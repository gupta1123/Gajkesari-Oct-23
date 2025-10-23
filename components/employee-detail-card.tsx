"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Pagination, PaginationContent, PaginationItem, PaginationLink } from "@/components/ui/pagination";
import { 
  Calendar, 
  CheckCircle, 
  Clock, 
  XCircle,
  TrendingUp,
  MapPin,
  User,
  ChevronUpIcon,
  ChevronDownIcon,
  ChevronRight
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { format, parseISO } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { useRouter } from 'next/navigation';
import { API, type VisitDto, type EmployeeStatsWithVisits } from "@/lib/api";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectValue,
  SelectItem
} from "@/components/ui/select";

interface Employee {
  id: number;
  name: string;
  position: string;
  avatar: string;
  lastUpdated: string;
  status: string;
  location: string;
}

interface VisitRow {
  id: number;
  date: string;
  customer: string;
  purpose: string;
  status: "completed" | "in-progress" | "scheduled";
  duration: string;
  checkinTime?: string;
  checkoutTime?: string;
  employeeState?: string;
}

interface KPICardProps {
  title: string;
  value: number;
}

const KPICard = ({ title, value }: KPICardProps) => {
  return (
    <Card>
      <CardHeader className="pb-2 md:pb-4">
        <CardTitle className="text-xs md:text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="text-2xl md:text-4xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
};

interface VisitsByPurposeChartProps {
  data: { purpose: string; visits: number }[];
}

const VisitsByPurposeChart = ({ data }: VisitsByPurposeChartProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base md:text-lg">Visits by Purpose</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={250} className="md:hidden">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="purpose" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip contentStyle={{ backgroundColor: 'rgba(0, 0, 0, 0.8)', border: 'none', fontSize: '12px' }} />
            <Bar dataKey="visits" fill="#1a202c" />
          </BarChart>
        </ResponsiveContainer>
        <ResponsiveContainer width="100%" height={300} className="hidden md:block">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="purpose" />
            <YAxis />
            <Tooltip contentStyle={{ backgroundColor: 'rgba(0, 0, 0, 0.8)', border: 'none' }} />
            <Legend />
            <Bar dataKey="visits" fill="#1a202c" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

interface VisitsTableProps {
  visits: VisitRow[];
  onViewDetails: (visitId: number) => void;
  currentPage: number;
  onPageChange: (page: number) => void;
}

const VisitsTable = ({ visits, onViewDetails, currentPage, onPageChange }: VisitsTableProps) => {
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [sortColumn, setSortColumn] = useState<keyof VisitRow>('date');
  const [lastClickedColumn, setLastClickedColumn] = useState<keyof VisitRow | null>(null);

  const getOutcomeStatus = (visit: VisitRow): { emoji: React.ReactNode; status: string } => {
    if (visit.checkinTime && visit.checkoutTime) {
      return { emoji: '✅', status: 'Completed' };
    } else if (visit.checkoutTime) {
      return { emoji: '⏱️', status: 'Checked Out' };
    } else if (visit.checkinTime) {
      return { emoji: '🕰️', status: 'On Going' };
    }
    return { emoji: '📅', status: 'Assigned' };
  };

  const handleSort = (column: keyof VisitRow) => {
    if (column === sortColumn) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortOrder('desc');
    }
    setLastClickedColumn(column);
  };

  const rowsPerPage = 10;
  const totalPages = Math.ceil(visits.length / rowsPerPage);

  const sortedVisits = [...visits].sort((a, b) => {
    const valueA = a[sortColumn];
    const valueB = b[sortColumn];

    if (valueA === null || valueA === undefined) {
      return 1;
    }
    if (valueB === null || valueB === undefined) {
      return -1;
    }

    if (typeof valueA === 'string' && typeof valueB === 'string') {
      return sortOrder === 'asc' ? valueA.localeCompare(valueB) : valueB.localeCompare(valueA);
    }

    if (valueA < valueB) {
      return sortOrder === 'asc' ? -1 : 1;
    }
    if (valueA > valueB) {
      return sortOrder === 'asc' ? 1 : -1;
    }
    return 0;
  });

  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const visitsToDisplay = sortedVisits.slice(startIndex, endIndex);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base md:text-lg">Recent Completed Visits</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Mobile Card View */}
        <div className="md:hidden space-y-3">
          {visitsToDisplay.map((visit) => {
            const { emoji, status } = getOutcomeStatus(visit);
            if (status !== 'Completed') return null; // Only show completed visits
            return (
              <Card key={visit.id} className="border-l-4 border-l-primary">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <h4 className="font-semibold text-sm truncate">{visit.customer}</h4>
                        <Badge variant="outline" className="text-xs">{emoji} {status}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {format(parseISO(visit.date), "dd MMM ''yy")} • {visit.purpose}
                      </p>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onViewDetails(visit.id)}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5" />
                      <span className="capitalize truncate max-w-[150px]">{visit.employeeState || 'N/A'}</span>
                    </div>
                    <Button variant="link" className="px-0 h-auto text-xs" onClick={() => onViewDetails(visit.id)}>
                      View
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {visitsToDisplay.filter(v => getOutcomeStatus(v).status === 'Completed').length === 0 && (
            <div className="text-xs text-muted-foreground">No completed visits available</div>
          )}
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
          <table className="w-full min-w-[600px]">
            <thead>
              <tr>
                <th className="px-2 md:px-4 py-2 text-xs md:text-sm cursor-pointer" onClick={() => handleSort('customer')}>
                  Store
                  {lastClickedColumn === 'customer' && (
                    sortOrder === 'asc' ? (
                      <ChevronUpIcon className="w-3 h-3 md:w-4 md:h-4 inline-block ml-1" />
                    ) : (
                      <ChevronDownIcon className="w-3 h-3 md:w-4 md:h-4 inline-block ml-1" />
                    )
                  )}
                </th>
                <th className="px-2 md:px-4 py-2 text-xs md:text-sm cursor-pointer" onClick={() => handleSort('date')}>
                  Date
                  {lastClickedColumn === 'date' && (
                    sortOrder === 'asc' ? (
                      <ChevronUpIcon className="w-3 h-3 md:w-4 md:h-4 inline-block ml-1" />
                    ) : (
                      <ChevronDownIcon className="w-3 h-3 md:w-4 md:h-4 inline-block ml-1" />
                    )
                  )}
                </th>
                <th className="px-2 md:px-4 py-2 text-xs md:text-sm cursor-pointer" onClick={() => handleSort('purpose')}>
                  Purpose
                  {lastClickedColumn === 'purpose' && (
                    sortOrder === 'asc' ? (
                      <ChevronUpIcon className="w-3 h-3 md:w-4 md:h-4 inline-block ml-1" />
                    ) : (
                      <ChevronDownIcon className="w-3 h-3 md:w-4 md:h-4 inline-block ml-1" />
                    )
                  )}
                </th>
                <th className="px-2 md:px-4 py-2 text-xs md:text-sm cursor-pointer" onClick={() => handleSort('employeeState')}>
                  City
                  {lastClickedColumn === 'employeeState' && (
                    sortOrder === 'asc' ? (
                      <ChevronUpIcon className="w-3 h-3 md:w-4 md:h-4 inline-block ml-1" />
                    ) : (
                      <ChevronDownIcon className="w-3 h-3 md:w-4 md:h-4 inline-block ml-1" />
                    )
                  )}
                </th>
                <th className="px-2 md:px-4 py-2 text-xs md:text-sm">Status</th>
                <th className="px-2 md:px-4 py-2 text-xs md:text-sm">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visitsToDisplay.map((visit) => {
                const { emoji, status } = getOutcomeStatus(visit);
                if (status !== 'Completed') return null; // Filter out non-completed visits
                return (
                  <tr key={visit.id}>
                    <td className="px-2 md:px-4 py-2 text-xs md:text-sm">{visit.customer}</td>
                    <td className="px-2 md:px-4 py-2 text-xs md:text-sm whitespace-nowrap">{format(parseISO(visit.date), "dd MMM ''yy")}</td>
                    <td className="px-2 md:px-4 py-2 text-xs md:text-sm">{visit.purpose}</td>
                    <td className="px-2 md:px-4 py-2 text-xs md:text-sm capitalize">{visit.employeeState || 'N/A'}</td>
                    <td className="px-2 md:px-4 py-2 text-xs md:text-sm">
                      <Badge variant="outline" className="text-xs whitespace-nowrap">{emoji} {status}</Badge>
                    </td>
                    <td className="px-2 md:px-4 py-2">
                      <button
                        className="text-blue-500 hover:text-blue-700 text-xs md:text-sm"
                        onClick={() => onViewDetails(visit.id)}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                );
              })}
              {visitsToDisplay.length === 0 && (
                <tr>
                  <td className="px-2 md:px-4 py-2 text-xs md:text-sm text-center" colSpan={6}>No visits available</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
      {totalPages > 1 && visitsToDisplay.length > 0 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationLink
                size="default"
                onClick={() => onPageChange(currentPage - 1)}
                className={currentPage === 1 ? 'pointer-events-none opacity-50' : ''}
              >
                Previous
              </PaginationLink>
            </PaginationItem>
            {Array.from({ length: totalPages }, (_, index) => (
              <PaginationItem key={index}>
                <PaginationLink
                  size="default"
                  onClick={() => onPageChange(index + 1)}
                  className={currentPage === index + 1 ? 'bg-gray-300' : ''}
                >
                  {index + 1}
                </PaginationLink>
              </PaginationItem>
            ))}
            <PaginationItem>
              <PaginationLink
                size="default"
                onClick={() => onPageChange(currentPage + 1)}
                className={currentPage === totalPages ? 'pointer-events-none opacity-50' : ''}
              >
                Next
              </PaginationLink>
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </Card>
  );
};

interface EmployeeDetailCardProps {
  employee: Employee;
  dateRange: { start: Date; end: Date };
}

export default function EmployeeDetailCard({ employee, dateRange }: EmployeeDetailCardProps) {
  const [employeeDetails, setEmployeeDetails] = useState<EmployeeStatsWithVisits | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const router = useRouter();
  const DETAIL_STATE_KEY = 'dashboard.employeeDetail.state.v1';

  // Added: filters and extra datasets to match reference
  const [visitFilter, setVisitFilter] = useState<string>('today');
  const [expenses, setExpenses] = useState<Array<Record<string, unknown>>>([]);
  const [expenseStartDate, setExpenseStartDate] = useState<Date | undefined>(new Date());
  const [expenseEndDate, setExpenseEndDate] = useState<Date | undefined>(new Date());
  const [attendanceStats, setAttendanceStats] = useState<Record<string, unknown> | null>(null);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [dailyPricing, setDailyPricing] = useState<Array<Record<string, unknown>>>([]);
  const [pricingStartDate, setPricingStartDate] = useState<Date | undefined>(new Date());
  const [pricingEndDate, setPricingEndDate] = useState<Date | undefined>(new Date());

  const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;

  // Hydrate filters if returning back from Visit Detail
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = sessionStorage.getItem(DETAIL_STATE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as Record<string, unknown>;
      if (saved?.employeeId !== employee.id) return;
      if (typeof saved.visitFilter === 'string') setVisitFilter(saved.visitFilter);
      if (typeof saved.currentPage === 'number') setCurrentPage(saved.currentPage);
      if (saved.expenseStartDate && typeof saved.expenseStartDate === 'string') setExpenseStartDate(new Date(saved.expenseStartDate));
      if (saved.expenseEndDate && typeof saved.expenseEndDate === 'string') setExpenseEndDate(new Date(saved.expenseEndDate));
      if (typeof saved.selectedYear === 'number') setSelectedYear(saved.selectedYear);
      if (typeof saved.selectedMonth === 'number') setSelectedMonth(saved.selectedMonth);
      if (saved.pricingStartDate && typeof saved.pricingStartDate === 'string') setPricingStartDate(new Date(saved.pricingStartDate));
      if (saved.pricingEndDate && typeof saved.pricingEndDate === 'string') setPricingEndDate(new Date(saved.pricingEndDate));
    } catch {}
  // run once per employee
  }, [employee.id]);

  // Persist filters on change
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      sessionStorage.setItem(DETAIL_STATE_KEY, JSON.stringify({
        employeeId: employee.id,
        visitFilter,
        currentPage,
        expenseStartDate,
        expenseEndDate,
        selectedYear,
        selectedMonth,
        pricingStartDate,
        pricingEndDate,
      }));
    } catch {}
  }, [employee.id, visitFilter, currentPage, expenseStartDate, expenseEndDate, selectedYear, selectedMonth, pricingStartDate, pricingEndDate]);

  // Visits + stats loaded using visitFilter (today/yesterday/etc.)
  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const now = new Date();
        let start: string;
        let end: string;
        if (visitFilter === 'today') {
          start = format(now, 'yyyy-MM-dd');
          end = format(now, 'yyyy-MM-dd');
        } else if (visitFilter === 'yesterday') {
          const y = new Date(now);
          y.setDate(y.getDate() - 1);
          start = format(y, 'yyyy-MM-dd');
          end = format(y, 'yyyy-MM-dd');
        } else if (visitFilter === 'last-2-days') {
          const twoDaysAgo = new Date(now);
          twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
          start = format(twoDaysAgo, 'yyyy-MM-dd');
          end = format(now, 'yyyy-MM-dd');
        } else if (visitFilter === 'this-month') {
          const first = new Date(now.getFullYear(), now.getMonth(), 1);
          const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
          start = format(first, 'yyyy-MM-dd');
          end = format(last, 'yyyy-MM-dd');
        } else if (visitFilter === 'last-month') {
          const first = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          const last = new Date(now.getFullYear(), now.getMonth(), 0);
          start = format(first, 'yyyy-MM-dd');
          end = format(last, 'yyyy-MM-dd');
        } else {
          start = format(dateRange.start, 'yyyy-MM-dd');
          end = format(dateRange.end, 'yyyy-MM-dd');
        }

        const data = await API.getEmployeeStatsWithVisits(employee.id, start, end);
        setEmployeeDetails(data);
      } catch (e) {
        setError((e as Error)?.message || 'Failed to load employee details');
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [employee.id, visitFilter, dateRange.start, dateRange.end]);

  // Expenses by employee and date range
  useEffect(() => {
    const run = async () => {
      if (!token) return;
      try {
        const start = expenseStartDate ? format(expenseStartDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-01');
        const end = expenseEndDate ? format(expenseEndDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-30');
        const resp = await fetch(`https://api.gajkesaristeels.in/expense/getByEmployeeAndDate?start=${start}&end=${end}&id=${employee.id}` , {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await resp.json();
        setExpenses(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Error fetching expenses:', err);
      }
    };
    run();
  }, [token, employee.id, expenseStartDate, expenseEndDate]);

  // Attendance monthly visits stats
  useEffect(() => {
    const run = async () => {
      if (!token) return;
      try {
        const selectedDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`;
        const resp = await fetch(`https://api.gajkesaristeels.in/attendance-log/monthlyVisits?date=${selectedDate}&employeeId=${employee.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await resp.json();
        setAttendanceStats(data);
      } catch (err) {
        console.error('Error fetching attendance stats:', err);
      }
    };
    run();
  }, [token, employee.id, selectedYear, selectedMonth]);

  // Daily pricing by date range
  useEffect(() => {
    const run = async () => {
      if (!token) return;
      try {
        const start = pricingStartDate ? format(pricingStartDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-01');
        const end = pricingEndDate ? format(pricingEndDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-30');
        const resp = await fetch(`https://api.gajkesaristeels.in/brand/getByDateRangeForEmployee?start=${start}&end=${end}&id=${employee.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await resp.json();
        setDailyPricing(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Error fetching daily pricing:', err);
      }
    };
    run();
  }, [token, employee.id, pricingStartDate, pricingEndDate]);

  const visitsByPurposeChartData = useMemo(() => {
    if (!employeeDetails || !employeeDetails.visitDto) return [];

    const completedVisits = employeeDetails.visitDto.filter((visit) =>
      visit.checkinTime && visit.checkoutTime
    );

    const visitsByPurpose = completedVisits.reduce((acc: { [key: string]: number }, visit) => {
      const purpose = visit.purpose ? visit.purpose.trim().toLowerCase() : 'unknown';
      if (!acc[purpose]) {
        acc[purpose] = 0;
      }
      acc[purpose]++;
      return acc;
    }, {});

    return Object.entries(visitsByPurpose).map(([purpose, visits]) => ({
      purpose: purpose.charAt(0).toUpperCase() + purpose.slice(1),
      visits: Number(visits),
    }));
  }, [employeeDetails]);

  const handleViewDetails = (visitId: number) => {
    // Persist parent view state to ensure return lands back here
    try {
      sessionStorage.setItem('dashboard.view.state.v1', JSON.stringify({
        view: 'employeeDetail',
        selectedEmployee: {
          id: employee.id,
          name: employee.name,
          position: employee.position,
          avatar: employee.avatar,
          location: employee.location,
        }
      }));
    } catch {}
    router.push(`/dashboard/visits/${visitId}`);
  };

  if (error) {
    return <div className="space-y-4"><div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded p-3">{error}</div></div>;
  }

  if (loading) {
    return (
      <div className="space-y-4 md:space-y-6">
        <div>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-32 mt-2" />
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2 md:pb-4">
                <Skeleton className="h-4 w-28" />
              </CardHeader>
              <CardContent className="pt-0">
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-56" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center justify-between gap-4 p-3 border rounded">
                  <div className="flex-1 min-w-0">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-56 mt-2" />
                  </div>
                  <Skeleton className="h-5 w-16" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-40" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  const visits: VisitRow[] = (employeeDetails?.visitDto || []).map((v: VisitDto) => ({
    id: v.id,
    date: v.visit_date,
    customer: v.storeName,
    purpose: v.purpose || '—',
    status: 'completed',
    duration: '-',
    checkinTime: v.checkinTime,
    checkoutTime: v.checkoutTime,
    employeeState: v.state,
  }));

  // Calculate actual metrics from the visits data
  const completedVisits = visits.filter(visit => visit.checkinTime && visit.checkoutTime);
  const totalCompletedVisits = completedVisits.length;

  return (
    <div className="space-y-4 md:space-y-6 pb-20 md:pb-0">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold capitalize">{employee.name}</h1>
        <p className="text-sm md:text-base text-muted-foreground">{employee.position}</p>
      </div>

      {/* Visits filter selector to match reference */}
      <div className="flex items-center gap-4">
        <div className="space-y-2 w-full sm:w-auto">
          <Select value={visitFilter} onValueChange={setVisitFilter}>
            <SelectTrigger className="w-full sm:w-[180px] text-xs md:text-sm">
              <SelectValue placeholder="Select Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today" className="text-xs md:text-sm">Today</SelectItem>
              <SelectItem value="yesterday" className="text-xs md:text-sm">Yesterday</SelectItem>
              <SelectItem value="last-2-days" className="text-xs md:text-sm">Last 2 Days</SelectItem>
              <SelectItem value="this-month" className="text-xs md:text-sm">This Month</SelectItem>
              <SelectItem value="last-month" className="text-xs md:text-sm">Last Month</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-8">
        <KPICard title="Total Completed Visits" value={totalCompletedVisits} />
        <KPICard title="Full Days" value={employeeDetails?.statsDto?.fullDays || 0} />
        <KPICard title="Half Days" value={employeeDetails?.statsDto?.halfDays || 0} />
        <KPICard title="Absences" value={employeeDetails?.statsDto?.absences || 0} />
      </div>

      <VisitsTable
        visits={visits}
        onViewDetails={handleViewDetails}
        currentPage={currentPage}
        onPageChange={setCurrentPage}
      />
      
      <div className="mt-8">
        <VisitsByPurposeChart data={visitsByPurposeChartData} />
      </div>

      {/* Attendance quick stats (month/year selectors) */}
      <div className="mt-6 md:mt-8 space-y-3 md:space-y-4">
        <div className="flex flex-col sm:flex-row gap-2 md:gap-4">
          <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
            <SelectTrigger className="w-full sm:w-[120px] text-xs md:text-sm"><SelectValue placeholder="Year" /></SelectTrigger>
            <SelectContent>
              {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map((y) => (
                <SelectItem key={y} value={y.toString()} className="text-xs md:text-sm">{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedMonth.toString()} onValueChange={(v) => setSelectedMonth(parseInt(v))}>
            <SelectTrigger className="w-full sm:w-[140px] text-xs md:text-sm"><SelectValue placeholder="Month" /></SelectTrigger>
            <SelectContent>
              {[
                'January','February','March','April','May','June','July','August','September','October','November','December'
              ].map((m, idx) => (
                <SelectItem key={m} value={(idx+1).toString()} className="text-xs md:text-sm">{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-3 gap-2 md:gap-4">
          <Card><CardContent className="pt-4 md:pt-6"><div className="text-xs md:text-sm text-muted-foreground">Full Day</div><div className="text-xl md:text-2xl font-semibold">{(attendanceStats as { statsDto?: { fullDays?: number } })?.statsDto?.fullDays ?? 0}</div></CardContent></Card>
          <Card><CardContent className="pt-4 md:pt-6"><div className="text-xs md:text-sm text-muted-foreground">Half Day</div><div className="text-xl md:text-2xl font-semibold">{(attendanceStats as { statsDto?: { halfDays?: number } })?.statsDto?.halfDays ?? 0}</div></CardContent></Card>
          <Card><CardContent className="pt-4 md:pt-6"><div className="text-xs md:text-sm text-muted-foreground">Absent</div><div className="text-xl md:text-2xl font-semibold">{(attendanceStats as { statsDto?: { absences?: number } })?.statsDto?.absences ?? 0}</div></CardContent></Card>
        </div>
      </div>

      {/* Expenses with date pickers */}
      <div className="mt-6 md:mt-8 space-y-3 md:space-y-4">
        <div className="flex flex-col sm:flex-row gap-2 md:gap-4">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full sm:w-auto text-xs md:text-sm justify-start">
                Start: {expenseStartDate ? format(expenseStartDate, 'MMM d, yyyy') : 'Pick'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <CalendarComponent mode="single" selected={expenseStartDate} onSelect={setExpenseStartDate} />
            </PopoverContent>
          </Popover>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full sm:w-auto text-xs md:text-sm justify-start">
                End: {expenseEndDate ? format(expenseEndDate, 'MMM d, yyyy') : 'Pick'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <CalendarComponent mode="single" selected={expenseEndDate} onSelect={setExpenseEndDate} />
            </PopoverContent>
          </Popover>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
          {expenses.map((exp, index) => (
            <Card key={String(exp.id) || index}><CardContent className="pt-4 md:pt-6">
              <div className="text-xs md:text-sm font-medium">{String(exp.type || 'N/A')}</div>
              <div className="text-xs md:text-sm text-muted-foreground">{String(exp.employeeName || 'N/A')}</div>
              <div className="mt-2 text-sm md:text-base">Amount: ₹{Number(exp.amount || 0).toFixed(2)}</div>
              <div className="text-xs md:text-sm">{String(exp.approvalStatus || 'N/A')}</div>
              <div className="text-xs text-muted-foreground">{exp.expenseDate && typeof exp.expenseDate === 'string' ? format(new Date(exp.expenseDate), 'MMM d, yyyy') : ''}</div>
            </CardContent></Card>
          ))}
        </div>
      </div>

      {/* Daily Pricing with date pickers */}
      <div className="mt-8 space-y-4">
        <div className="flex gap-4">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline">Start: {pricingStartDate ? format(pricingStartDate, 'MMM d, yyyy') : 'Pick'}</Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <CalendarComponent mode="single" selected={pricingStartDate} onSelect={setPricingStartDate} />
            </PopoverContent>
          </Popover>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline">End: {pricingEndDate ? format(pricingEndDate, 'MMM d, yyyy') : 'Pick'}</Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <CalendarComponent mode="single" selected={pricingEndDate} onSelect={setPricingEndDate} />
            </PopoverContent>
          </Popover>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {dailyPricing.map((p, index) => (
            <Card key={String(p.id) || index}><CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="font-medium">{String(p.brandName || 'N/A')}</div>
                <div className="text-sm text-muted-foreground">{String(p.city || 'N/A')}</div>
              </div>
              <div className="mt-2 text-lg font-semibold">₹{Number(p.price || 0).toFixed(2)}</div>
            </CardContent></Card>
          ))}
        </div>
      </div>
    </div>
  );
}
