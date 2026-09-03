"use client";

import React, { useEffect, useMemo, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  MapPin,
  CheckCircle2,
  CalendarCheck2,
  Clock3,
  UserRoundX,
  BarChart3,
  ChevronUpIcon,
  ChevronDownIcon,
  ChevronRight,
  ChevronLeft
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList, Cell } from "recharts";
import { summarizeVisitPurposes } from "@/lib/visit-purpose-summary";
import { format, parseISO } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { useRouter } from 'next/navigation';
import { API, type VisitDto, type EmployeeStatsWithVisits, type EmployeeDashboardSummary } from "@/lib/api";

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
  value: React.ReactNode;
  icon?: React.ReactNode;
}

const KPICard = ({ title, value, icon }: KPICardProps) => {
  return (
    <Card className="rounded-lg shadow-none">
      <CardContent className="flex min-h-[72px] items-center justify-between gap-3 p-3 sm:min-h-[82px] sm:p-4">
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-muted-foreground">{title}</p>
          <p className="mt-1 text-2xl font-semibold leading-none tracking-tight text-foreground">{value}</p>
        </div>
        {icon && (
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
            {icon}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

interface VisitsByPurposeChartProps {
  data: { purpose: string; visits: number }[];
}

const VisitsByPurposeChart = ({ data }: VisitsByPurposeChartProps) => {
  const hasData = data.some((item) => item.visits > 0);
  const total = data.reduce((sum, item) => sum + item.visits, 0);

  return (
    <Card className="min-w-0 gap-0 rounded-lg py-0 shadow-none">
      <CardHeader className="border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-sm font-semibold">Visits by purpose</CardTitle>
        </div>
        <p className="text-xs text-muted-foreground">{total} visits · selected period</p>
      </CardHeader>
      <CardContent className="p-4">
        {hasData ? (
          <ResponsiveContainer width="100%" height={Math.max(160, data.length * 42 + 24)}>
            <BarChart accessibilityLayer layout="vertical" data={data} margin={{ top: 4, right: 28, left: 0, bottom: 0 }}>
              <CartesianGrid horizontal={false} stroke="hsl(var(--border))" strokeDasharray="3 3" />
              <XAxis
                type="number"
                domain={[0, 'dataMax']}
                allowDecimals={false}
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              />
              <YAxis
                type="category"
                dataKey="purpose"
                width={105}
                interval={0}
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: "hsl(var(--foreground))" }}
              />
              <Tooltip
                cursor={{ fill: "hsl(var(--muted))" }}
                contentStyle={{
                  backgroundColor: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  color: "hsl(var(--popover-foreground))",
                  fontSize: "12px",
                  boxShadow: "0 8px 24px hsl(var(--foreground) / 0.08)",
                }}
              />
              <Bar dataKey="visits" name="Visits" fill="hsl(var(--primary))" radius={[0, 3, 3, 0]} maxBarSize={18}>
                {data.map(item => <Cell key={item.purpose} fill={item.purpose === 'Others' ? 'hsl(var(--muted-foreground))' : 'hsl(var(--primary))'} />)}
                <LabelList dataKey="visits" position="right" style={{ fill: 'hsl(var(--foreground))', fontSize: 12, fontVariantNumeric: 'tabular-nums' }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-[210px] items-center justify-center text-xs text-muted-foreground">
            No visit-purpose data for this range
          </div>
        )}
        {data.some(item => item.purpose === 'Others') && <p className="mt-3 text-xs text-muted-foreground">Others includes custom and unspecified purposes.</p>}
      </CardContent>
    </Card>
  );
};

interface VisitsTableProps {
  visits: VisitRow[];
  onViewDetails: (visitId: number) => void;
  currentPage: number;
  onPageChange: (page: number) => void;
  totalPages: number;
  totalElements: number;
}

const VisitsTable = ({ visits, onViewDetails, currentPage, onPageChange, totalPages, totalElements }: VisitsTableProps) => {
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

  // Filter to only completed visits for pagination calculation
  const completedVisits = sortedVisits.filter(visit => getOutcomeStatus(visit).status === 'Completed');
  
  const safeTotalPages = totalPages === 0 ? 1 : totalPages;
  const visitsToDisplay = completedVisits;

  return (
    <Card className="rounded-lg shadow-none">
      <CardHeader className="border-b px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-sm font-semibold">Recent completed visits</CardTitle>
          <span className="text-xs text-muted-foreground">{totalElements} in range</span>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {/* Mobile Card View */}
        <div className="divide-y md:hidden">
          {visitsToDisplay.length > 0 ? (
            visitsToDisplay.map((visit) => {
              const outcome = getOutcomeStatus(visit);
              return (
                <div key={visit.id} className="p-3 transition-colors hover:bg-muted/40">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-foreground">{visit.customer}</p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">{visit.purpose}</p>
                    </div>
                    <span className="shrink-0 text-xs font-semibold">{outcome.emoji}</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                    <span>{visit.date ? format(parseISO(visit.date), "dd MMM yyyy") : '-'}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onViewDetails(visit.id)}
                      className="h-6 px-2 text-[11px] font-medium"
                    >
                      View
                    </Button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-6 text-center text-xs text-muted-foreground">No visits match criteria</div>
          )}
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-xs font-poppins">
            <thead className="bg-muted/30">
              <tr className="border-b text-left">
                <th
                  className="cursor-pointer px-4 py-2.5 font-medium text-muted-foreground transition-colors hover:text-foreground"
                  onClick={() => handleSort('customer')}
                >
                  <div className="flex items-center gap-1">
                    <span>Customer</span>
                    {lastClickedColumn === 'customer' && (
                      sortOrder === 'asc' ? <ChevronUpIcon className="h-3 w-3" /> : <ChevronDownIcon className="h-3 w-3" />
                    )}
                  </div>
                </th>
                <th
                  className="cursor-pointer px-4 py-2.5 font-medium text-muted-foreground transition-colors hover:text-foreground"
                  onClick={() => handleSort('purpose')}
                >
                  <div className="flex items-center gap-1">
                    <span>Purpose</span>
                    {lastClickedColumn === 'purpose' && (
                      sortOrder === 'asc' ? <ChevronUpIcon className="h-3 w-3" /> : <ChevronDownIcon className="h-3 w-3" />
                    )}
                  </div>
                </th>
                <th
                  className="cursor-pointer px-4 py-2.5 font-medium text-muted-foreground transition-colors hover:text-foreground"
                  onClick={() => handleSort('date')}
                >
                  <div className="flex items-center gap-1">
                    <span>Date</span>
                    {lastClickedColumn === 'date' && (
                      sortOrder === 'asc' ? <ChevronUpIcon className="h-3 w-3" /> : <ChevronDownIcon className="h-3 w-3" />
                    )}
                  </div>
                </th>
                <th className="px-4 py-2.5 font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {visitsToDisplay.length > 0 ? (
                visitsToDisplay.map((visit) => {
                  const outcome = getOutcomeStatus(visit);
                  return (
                    <tr key={visit.id} className="transition-colors hover:bg-muted/30">
                      <td className="px-4 py-2.5 font-semibold text-foreground">{visit.customer}</td>
                      <td className="px-4 py-2.5 text-muted-foreground">{visit.purpose}</td>
                      <td className="px-4 py-2.5 text-muted-foreground">
                        {visit.date ? format(parseISO(visit.date), "dd MMM yyyy") : '-'}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="inline-flex items-center gap-1 text-xs font-semibold">
                          <span>{outcome.emoji}</span>
                          <span>{outcome.status}</span>
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onViewDetails(visit.id)}
                          className="h-7 px-2.5 text-xs font-medium"
                        >
                          View
                        </Button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-xs text-muted-foreground">
                    No visits match criteria
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
      {totalElements > 0 && (
        <div className="flex flex-col gap-2 border-t px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-xs text-muted-foreground">{totalElements} visits in this range</div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(Math.max(1, currentPage - 1))}
              disabled={currentPage <= 1}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              <span className="sr-only sm:not-sr-only">Previous</span>
            </Button>
            <span className="text-xs text-muted-foreground">
              Page {Math.min(currentPage, safeTotalPages)} of {safeTotalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(Math.min(safeTotalPages, currentPage + 1))}
              disabled={currentPage >= safeTotalPages}
            >
              <span className="sr-only sm:not-sr-only">Next</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
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
  const [employeeSummary, setEmployeeSummary] = useState<EmployeeDashboardSummary | null>(null);
  const [visitTotalPages, setVisitTotalPages] = useState(1);
  const [visitTotalElements, setVisitTotalElements] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const router = useRouter();
  const DETAIL_STATE_KEY = 'dashboard.employeeDetail.state.v1';
  const VIEW_STATE_KEY = 'dashboard.view.state.v1';
  const hasHydratedRef = useRef(false);

  // Hydrate filters if returning back from Visit Detail
  useEffect(() => {
    if (typeof window === 'undefined' || hasHydratedRef.current) return;
    try {
      const raw = sessionStorage.getItem(DETAIL_STATE_KEY);
      if (!raw) {
        hasHydratedRef.current = true;
        return;
      }
      const saved = JSON.parse(raw) as Record<string, unknown>;
      if (saved?.employeeId !== employee.id) {
        hasHydratedRef.current = true;
        return;
      }

      const startKey = format(dateRange.start, 'yyyy-MM-dd');
      const endKey = format(dateRange.end, 'yyyy-MM-dd');
      const savedStartKey = typeof saved.startKey === 'string' ? saved.startKey : null;
      const savedEndKey = typeof saved.endKey === 'string' ? saved.endKey : null;
      const savedPage = typeof saved.currentPage === 'number' ? saved.currentPage : null;

      if (savedPage != null && savedStartKey === startKey && savedEndKey === endKey) {
        setCurrentPage(savedPage);
      }

      hasHydratedRef.current = true;
    } catch {
      hasHydratedRef.current = true;
    }
  }, [employee.id, dateRange.start, dateRange.end]);

  // Persist filters on change
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      sessionStorage.setItem(DETAIL_STATE_KEY, JSON.stringify({
        employeeId: employee.id,
        currentPage,
        startKey: format(dateRange.start, 'yyyy-MM-dd'),
        endKey: format(dateRange.end, 'yyyy-MM-dd'),
      }));
    } catch {}
  }, [employee.id, currentPage, dateRange.start, dateRange.end]);

  useEffect(() => {
    setCurrentPage(1);
  }, [employee.id, dateRange.start, dateRange.end]);

  // Visits + stats loaded using parent-provided date range
  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const start = format(dateRange.start, 'yyyy-MM-dd');
        const end = format(dateRange.end, 'yyyy-MM-dd');
        const data = await API.getEmployeeStatsOptimized(employee.id, start, end, currentPage - 1, 10, 'id,desc');
        setEmployeeDetails({ statsDto: data.statsDto, visitDto: data.visitPage.content || [] });
        setVisitTotalPages(Math.max(data.visitPage.totalPages || 1, 1));
        setVisitTotalElements(data.visitPage.totalElements || 0);
      } catch (e) {
        setError((e as Error)?.message || 'Failed to load employee details');
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [employee.id, dateRange.start, dateRange.end, currentPage]);

  useEffect(() => {
    const run = async () => {
      try {
        const start = format(dateRange.start, 'yyyy-MM-dd');
        const end = format(dateRange.end, 'yyyy-MM-dd');
        setEmployeeSummary(await API.getEmployeeDashboardSummary(employee.id, start, end));
      } catch (e) {
        setError((e as Error)?.message || 'Failed to load employee summary');
      }
    };
    run();
  }, [employee.id, dateRange.start, dateRange.end]);

  const visitsByPurposeChartData = useMemo(() => {
    return summarizeVisitPurposes(employeeSummary?.visitSummary.visitsByPurpose || []);
  }, [employeeSummary]);

  const handleViewDetails = (visitId: number) => {
    // Persist parent view state to ensure return lands back here
    try {
      let selectedState: Record<string, unknown> | null = null;
      const existingRaw = sessionStorage.getItem(VIEW_STATE_KEY);
      if (existingRaw) {
        const existing = JSON.parse(existingRaw) as Record<string, unknown>;
        if (existing?.selectedState) {
          selectedState = existing.selectedState as Record<string, unknown>;
        }
      }
      sessionStorage.setItem(VIEW_STATE_KEY, JSON.stringify({
        view: 'employeeDetail',
        selectedState,
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
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="rounded-lg shadow-none">
              <CardContent className="flex min-h-[82px] items-center justify-between p-4">
                <div>
                  <Skeleton className="h-3 w-28" />
                  <Skeleton className="mt-2 h-6 w-12" />
                </div>
                <Skeleton className="h-8 w-8 rounded-md" />
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.65fr)_minmax(300px,0.75fr)]">
          <Card className="rounded-lg shadow-none">
            <CardHeader className="border-b px-4 py-3">
              <Skeleton className="h-4 w-44" />
            </CardHeader>
            <CardContent className="p-0">
              <div className="space-y-px">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="flex items-center justify-between gap-4 border-b p-3 last:border-0">
                    <div className="min-w-0 flex-1">
                      <Skeleton className="h-3.5 w-40" />
                      <Skeleton className="mt-2 h-3 w-56" />
                    </div>
                    <Skeleton className="h-5 w-16" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-lg shadow-none">
            <CardHeader className="border-b px-4 py-3">
              <Skeleton className="h-4 w-36" />
            </CardHeader>
            <CardContent className="p-4">
              <Skeleton className="h-[210px] w-full" />
            </CardContent>
          </Card>
        </div>
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

  const totalCompletedVisits = employeeSummary?.visitSummary.completedVisits || 0;

  return (
    <div className="space-y-4 pb-12 md:pb-0">
      <section aria-label="Performance snapshot">
        <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
          <KPICard
            title="Completed visits"
            value={totalCompletedVisits}
            icon={<CheckCircle2 className="h-4 w-4" />}
          />
          <KPICard
            title="Full days"
            value={employeeDetails?.statsDto?.fullDays || 0}
            icon={<CalendarCheck2 className="h-4 w-4" />}
          />
          <KPICard
            title="Half days"
            value={employeeDetails?.statsDto?.halfDays || 0}
            icon={<Clock3 className="h-4 w-4" />}
          />
          <KPICard
            title="Absences"
            value={employeeDetails?.statsDto?.absences || 0}
            icon={<UserRoundX className="h-4 w-4" />}
          />
        </div>
      </section>

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.65fr)_minmax(300px,0.75fr)]">
        <VisitsTable
          visits={visits}
          onViewDetails={handleViewDetails}
          currentPage={currentPage}
          onPageChange={setCurrentPage}
          totalPages={visitTotalPages}
          totalElements={visitTotalElements}
        />
        <VisitsByPurposeChart data={visitsByPurposeChartData} />
      </div>

    </div>
  );
}
