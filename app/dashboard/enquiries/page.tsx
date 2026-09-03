"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CalendarIcon as CalendarIconLucide } from 'lucide-react';
import { format } from 'date-fns';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { ChevronLeft, ChevronRight, Filter, Loader2, MapPin, RefreshCw, Store, Phone, DollarSign, Users, X } from 'lucide-react';
import { DateRangeError, isDateRangeInvalid } from '@/components/date-range-error';

const API_BASE_URL = 'https://api.gajkesaristeels.in';

interface LocationMasterDto {
  id: number;
  name: string;
}

interface SalesData {
  [monthYear: string]: number;
}

interface Enquiry {
  id: number;
  taluka: string;
  city?: string;
  state?: string;
  population: number;
  dealerName: string;
  expenses: number;
  contactNumber: string;
  sales: SalesData;
  storeCount?: number;
}

interface PaginatedEnquiryResponse {
  content: Enquiry[];
  totalPages?: number;
  totalElements?: number;
}

const formatDateToMMMyy = (date: Date | undefined): string => {
  return date ? format(date, 'MMM-yy') : '';
};

const formatMonthYearToString = (month: number | undefined, year: number | undefined): string => {
  if (typeof month === 'number' && typeof year === 'number') {
    const date = new Date(year, month);
    return format(date, 'MMM-yy');
  }
  return '';
};

export default function EnquiriesPage() {
  const [token, setToken] = useState<string | null>(null);

  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [storeNameFilter, setStoreNameFilter] = useState<string>('');
  const [talukaFilter, setTalukaFilter] = useState<string>('');
  const [cityFilter, setCityFilter] = useState<string>('');
  const [stateFilter, setStateFilter] = useState<string>('');

  const [tempStartMonth, setTempStartMonth] = useState<number | undefined>(undefined);
  const [tempStartYear, setTempStartYear] = useState<number | undefined>(undefined);
  const [tempEndMonth, setTempEndMonth] = useState<number | undefined>(undefined);
  const [tempEndYear, setTempEndYear] = useState<number | undefined>(undefined);
  const tempStartDate = tempStartYear !== undefined && tempStartMonth !== undefined
    ? `${tempStartYear}-${String(tempStartMonth + 1).padStart(2, '0')}-01`
    : '';
  const tempEndDate = tempEndYear !== undefined && tempEndMonth !== undefined
    ? `${tempEndYear}-${String(tempEndMonth + 1).padStart(2, '0')}-01`
    : '';
  const dateRangeInvalid = isDateRangeInvalid(tempStartDate, tempEndDate);

  const [tempStoreNameFilter, setTempStoreNameFilter] = useState<string>('');
  const [tempTalukaFilter, setTempTalukaFilter] = useState<string>('');
  const [tempCityFilter, setTempCityFilter] = useState<string>('');
  const [tempStateFilter, setTempStateFilter] = useState<string>('');
  
  const firstEnquiryYear = 2026;
  const lastEnquiryYear = Math.max(new Date().getFullYear() + 10, firstEnquiryYear + 10);
  const years = Array.from(
    { length: lastEnquiryYear - firstEnquiryYear + 1 },
    (_, index) => firstEnquiryYear + index
  );
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  // Pagination and Sorting State
  const [currentPage, setCurrentPage] = useState<number>(0);
  const [pageSize, setPageSize] = useState<number>(10);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [isSortByStoreCount, setIsSortByStoreCount] = useState<boolean>(false);

  const [isFiltersOpen, setIsFiltersOpen] = useState<boolean>(false);
  const [isMobileFilterExpanded, setIsMobileFilterExpanded] = useState<boolean>(false);

  const activeFilterCount = React.useMemo(() => {
    return [
      storeNameFilter,
      talukaFilter,
      cityFilter,
      stateFilter,
      startDate,
      endDate,
      isSortByStoreCount ? 'sortByStoreCount' : '',
    ].filter(Boolean).length;
  }, [storeNameFilter, talukaFilter, cityFilter, stateFilter, startDate, endDate, isSortByStoreCount]);

  // Data state
  const [enquiriesData, setEnquiriesData] = useState<PaginatedEnquiryResponse | null>(null);
  const [locationStates, setLocationStates] = useState<LocationMasterDto[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Handle client-side hydration
  useEffect(() => {
    setToken(localStorage.getItem('authToken'));
  }, []);

  useEffect(() => {
    let isMounted = true;
    if (!token) return;

    fetch(`${API_BASE_URL}/locations/states`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then((res) => (res.ok ? res.json() : []))
      .then((states: LocationMasterDto[]) => {
        if (!isMounted || !Array.isArray(states)) return;
        setLocationStates(
          [...states].sort((left, right) => left.name.localeCompare(right.name))
        );
      })
      .catch(() => {
        if (isMounted) setLocationStates([]);
      });

    return () => {
      isMounted = false;
    };
  }, [token]);

  const fetchEnquiries = useCallback(async () => {
    if (!token) {
      setError('No token available. Please log in.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const queryParams = new URLSearchParams();
      const baseUrl = `${API_BASE_URL}/enquiry/filtered`;

      if (storeNameFilter) queryParams.append('storeName', storeNameFilter);
      if (talukaFilter) queryParams.append('taluka', talukaFilter);
      if (cityFilter) queryParams.append('city', cityFilter);
      if (stateFilter) queryParams.append('state', stateFilter);
      if (startDate) queryParams.append('startMonthYear', startDate);
      if (endDate) queryParams.append('endMonthYear', endDate);
      
      queryParams.append('sortByStoreCount', String(isSortByStoreCount));
      queryParams.append('page', String(currentPage));
      queryParams.append('size', String(pageSize));

      const endpoint = `${baseUrl}?${queryParams.toString()}`;
      
      const response = await fetch(endpoint, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      
      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Network response was not ok while fetching enquiries: ${errorData || response.statusText}`);
      }
      
      const data = await response.json();
      setEnquiriesData(data);
      setTotalPages(data.totalPages || 0);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, [token, storeNameFilter, talukaFilter, cityFilter, stateFilter, startDate, endDate, currentPage, pageSize, isSortByStoreCount]);

  useEffect(() => {
    fetchEnquiries();
  }, [fetchEnquiries]);

  const handleApplyFilters = () => {
    if (dateRangeInvalid) return;
    setCurrentPage(0);

    const sDateStr = formatMonthYearToString(tempStartMonth, tempStartYear);
    const eDateStr = formatMonthYearToString(tempEndMonth, tempEndYear);

    if (sDateStr && !eDateStr) {
        setStartDate(sDateStr);
        setEndDate(sDateStr);
    } else {
        setStartDate(sDateStr);
        setEndDate(eDateStr);
    }

    setStoreNameFilter(tempStoreNameFilter);
    setTalukaFilter(tempTalukaFilter);
    setCityFilter(tempCityFilter);
    setStateFilter(tempStateFilter);
  };

  const handleClearFilters = () => {
    setCurrentPage(0);
    setTempStartMonth(undefined);
    setTempStartYear(undefined);
    setTempEndMonth(undefined);
    setTempEndYear(undefined);
    setTempStoreNameFilter('');
    setTempTalukaFilter('');
    setTempCityFilter('');
    setTempStateFilter('');
    
    setStartDate('');
    setEndDate('');
    setStoreNameFilter('');
    setTalukaFilter('');
    setCityFilter('');
    setStateFilter('');
    setIsSortByStoreCount(false);
  };

  const salesMonths = React.useMemo(() => {
    const monthsSet = new Set<string>();
    if (Array.isArray(enquiriesData?.content)) {
        enquiriesData.content.forEach((enquiry: Enquiry) => {
            if (enquiry.sales) {
                Object.keys(enquiry.sales).forEach(month => monthsSet.add(month));
            }
        });
    }
    return Array.from(monthsSet).sort((a, b) => {
      const parse = (str: string) => {
        const [mon, yr] = str.split('-');
        const monthIdx = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"].findIndex(m => m === mon);
        const yearNum = parseInt(yr, 10) + (parseInt(yr, 10) < 70 ? 2000 : 1900);
        return new Date(yearNum, monthIdx);
      };
      return parse(a).getTime() - parse(b).getTime();
    });
  }, [enquiriesData]);

  const baseDisplayColumns = ['Taluka', 'City', 'State', 'Population', 'Store Name', 'Expenses', 'Phone'];
  const tableDisplayColumns = [...baseDisplayColumns, ...salesMonths, 'Total Sales'];

  const calculateTotalSales = (sales: SalesData | undefined): number => {
    if (!sales) return 0;
    return Object.values(sales).reduce((sum, value) => sum + (Number(value) || 0), 0);
  };

  const renderMainContent = () => {
    if (!token && !isLoading) {
      return (
        <div className="rounded-lg border bg-card px-4 py-14 text-center">
          <div className="mx-auto max-w-sm">
            <h3 className="text-sm font-semibold text-foreground">Authentication required</h3>
            <p className="mt-1 text-xs text-muted-foreground">Please log in to view enquiries.</p>
          </div>
        </div>
      );
    }
    if (isLoading) return (
      <div className="flex min-h-52 items-center justify-center rounded-lg border bg-card">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Loading enquiries…</span>
        </div>
      </div>
    );
    if (error) return (
      <div className="rounded-lg border border-destructive/25 bg-destructive/5 p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
              <h3 className="text-sm font-semibold text-destructive">Could not load enquiries</h3>
              <p className="mt-1 truncate text-xs text-muted-foreground">{error}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchEnquiries()}
            className="h-8 text-xs shrink-0"
          >
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
            Retry
          </Button>
        </div>
      </div>
    );
    return (
      <div className="overflow-hidden rounded-lg border border-border/80 bg-card shadow-sm">
        {/* Desktop Table View */}
        <div className="hidden overflow-x-auto md:block">
          <Table className="text-xs">
            <TableHeader className="bg-muted/35">
              <TableRow>
                {tableDisplayColumns.map((column) => (
                  <TableHead 
                    key={column} 
                    className="h-10 whitespace-nowrap text-left text-xs font-medium"
                  >
                    {column}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {enquiriesData?.content?.map((enquiry: Enquiry) => (
                <TableRow key={enquiry.id} className="hover:bg-muted/25">
                  <TableCell className="h-11 whitespace-nowrap font-medium text-xs">
                    {enquiry.taluka}
                  </TableCell>
                  <TableCell className="text-xs">
                    {enquiry.city || '—'}
                  </TableCell>
                  <TableCell className="text-xs">
                    {enquiry.state || '—'}
                  </TableCell>
                  <TableCell className="text-xs">
                    {enquiry.population ? enquiry.population.toLocaleString() : '0'}
                  </TableCell>
                  <TableCell className="max-w-[220px] truncate font-medium text-xs" title={enquiry.dealerName}>
                    {enquiry.dealerName}
                  </TableCell>
                  <TableCell className="text-xs">
                    ₹{enquiry.expenses ? enquiry.expenses.toLocaleString() : '0'}
                  </TableCell>
                  <TableCell className="text-xs">
                    {enquiry.contactNumber}
                  </TableCell>
                  {salesMonths.map(month => (
                    <TableCell key={month} className="text-center text-xs">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        (enquiry.sales?.[month] ?? 0) > 0 
                          ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-200' 
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                      }`}>
                        {enquiry.sales?.[month] ?? 0}
                      </span>
                    </TableCell>
                  ))}
                  <TableCell className="font-bold text-xs text-blue-600 dark:text-blue-400">
                    ₹{calculateTotalSales(enquiry.sales) ? calculateTotalSales(enquiry.sales).toLocaleString() : '0'}
                  </TableCell>
                </TableRow>
              ))}
              {(!enquiriesData?.content || enquiriesData.content.length === 0) && !isLoading && (
                <TableRow>
                  <TableCell colSpan={tableDisplayColumns.length} className="text-center py-12">
                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                      <Store className="mb-3 h-8 w-8 stroke-[1.5]" />
                      <h3 className="text-sm font-medium text-foreground">No enquiries found</h3>
                      <p className="mt-1 text-xs">Try changing or clearing the filters.</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Mobile Card View */}
        <div className="space-y-3 p-3 md:hidden">
          {enquiriesData?.content?.map((enquiry: Enquiry) => (
            <Card key={enquiry.id} className="shadow-none border border-border/70">
              <CardContent className="p-4">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <Store className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0">
                      <h3 className="truncate text-xs font-semibold text-foreground">{enquiry.dealerName}</h3>
                      <p className="text-xs text-muted-foreground">{enquiry.taluka}</p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="shrink-0 text-xs">
                    ₹{calculateTotalSales(enquiry.sales) ? calculateTotalSales(enquiry.sales).toLocaleString() : '0'}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="flex items-start gap-2">
                    <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <div>
                      <span className="font-medium">{enquiry.city || '—'}</span>
                      {enquiry.state && <span className="text-muted-foreground">, {enquiry.state}</span>}
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-2">
                    <Users className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <div>
                      <span className="font-medium">Population: </span>
                      <span className="font-semibold">{enquiry.population ? enquiry.population.toLocaleString() : '0'}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-2">
                    <Phone className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <div>
                      <span className="font-medium">Phone: </span>
                      <span className="font-semibold">{enquiry.contactNumber}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-2">
                    <DollarSign className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <div>
                      <span className="font-medium">Expenses: </span>
                      <span className="font-semibold">₹{enquiry.expenses ? enquiry.expenses.toLocaleString() : '0'}</span>
                    </div>
                  </div>
                </div>

                {salesMonths.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-border">
                    <div className="mb-2 flex items-center gap-2">
                      <CalendarIconLucide className="h-3.5 w-3.5 text-muted-foreground" />
                      <h4 className="text-xs font-medium text-foreground">Sales</h4>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {salesMonths.map(month => (
                        <div key={month} className="flex justify-between items-center py-2 px-3 bg-muted/30 rounded-lg">
                          <span className="text-xs font-medium">{month}</span>
                          <Badge 
                            variant={enquiry.sales?.[month] ? "default" : "secondary"}
                            className="text-xs"
                          >
                            {enquiry.sales?.[month] ?? 0}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
          
          {(!enquiriesData?.content || enquiriesData.content.length === 0) && !isLoading && (
            <div className="py-12 text-center">
              <div className="flex flex-col items-center justify-center text-muted-foreground">
                <Store className="mb-3 h-8 w-8 stroke-[1.5]" />
                <h3 className="text-sm font-medium text-foreground">No enquiries found</h3>
                <p className="mt-1 text-xs">Try changing or clearing the filters.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4 px-4 sm:px-6 py-4">
      {/* Top Header & Filter Toggle Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted-foreground">
          Showing <span className="font-semibold text-foreground">{enquiriesData?.totalElements ?? enquiriesData?.content?.length ?? 0}</span> enquiries
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsFiltersOpen((prev) => !prev)}
            className="h-9 text-xs shadow-none"
          >
            <Filter className="mr-1.5 h-3.5 w-3.5" />
            {isFiltersOpen ? "Hide filters" : "Show filters"}
            {activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
          </Button>
        </div>
      </div>

      {/* Collapsible Filter Card */}
      {isFiltersOpen && (
        <Card className="overflow-hidden border-border/70 bg-card shadow-sm">
          <CardContent className="p-4 space-y-4">
            <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
              {/* Store Name */}
              <div className="space-y-1.5">
                <Label htmlFor="storeNameFilter" className="text-xs font-medium text-foreground">Store name</Label>
                <Input 
                  id="storeNameFilter"
                  type="text" 
                  placeholder="All stores"
                  value={tempStoreNameFilter} 
                  onChange={(e) => setTempStoreNameFilter(e.target.value)} 
                  className="h-9 w-full text-xs bg-background shadow-none"
                />
              </div>

              {/* Taluka */}
              <div className="space-y-1.5">
                <Label htmlFor="talukaFilter" className="text-xs font-medium text-foreground">Taluka</Label>
                <Input 
                  id="talukaFilter"
                  type="text" 
                  placeholder="All talukas"
                  value={tempTalukaFilter} 
                  onChange={(e) => setTempTalukaFilter(e.target.value)} 
                  className="h-9 w-full text-xs bg-background shadow-none"
                />
              </div>

              {/* City */}
              <div className="space-y-1.5">
                <Label htmlFor="cityFilter" className="text-xs font-medium text-foreground">City</Label>
                <Input 
                  id="cityFilter"
                  type="text" 
                  placeholder="All cities"
                  value={tempCityFilter} 
                  onChange={(e) => setTempCityFilter(e.target.value)} 
                  className="h-9 w-full text-xs bg-background shadow-none"
                />
              </div>

              {/* State */}
              <div className="space-y-1.5">
                <Label htmlFor="stateFilter" className="text-xs font-medium text-foreground">State</Label>
                <Select
                  value={tempStateFilter || "all"}
                  onValueChange={(value) => setTempStateFilter(value === "all" ? "" : value)}
                >
                  <SelectTrigger id="stateFilter" className="h-9 w-full text-xs bg-background shadow-none">
                    <SelectValue placeholder="All states" />
                  </SelectTrigger>
                  <SelectContent className="max-h-56 text-xs">
                    <SelectItem value="all" className="text-xs">All states</SelectItem>
                    {locationStates.map((state) => (
                      <SelectItem key={state.id} value={state.name} className="text-xs">{state.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* From Year */}
              <div className="space-y-1.5">
                <Label htmlFor="fromYearFilter" className="text-xs font-medium text-foreground">From year</Label>
                <Select
                  value={tempStartYear !== undefined ? tempStartYear.toString() : "NONE_VALUE"}
                  onValueChange={(value) => {
                    if (value === "NONE_VALUE") setTempStartYear(undefined);
                    else setTempStartYear(parseInt(value));
                  }}
                >
                  <SelectTrigger id="fromYearFilter" className="h-9 w-full text-xs bg-background shadow-none">
                    <SelectValue placeholder="Select year" />
                  </SelectTrigger>
                  <SelectContent className="max-h-48 text-xs">
                    <SelectItem value="NONE_VALUE" className="text-xs">Any year</SelectItem>
                    {years.map(year => (
                      <SelectItem key={year} value={year.toString()} className="text-xs">{year}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* From Month */}
              <div className="space-y-1.5">
                <Label htmlFor="fromMonthFilter" className="text-xs font-medium text-foreground">From month</Label>
                <Select
                  value={tempStartMonth !== undefined ? tempStartMonth.toString() : "NONE_VALUE"}
                  onValueChange={(value) => {
                    if (value === "NONE_VALUE") setTempStartMonth(undefined);
                    else setTempStartMonth(parseInt(value));
                  }}
                  disabled={typeof tempStartYear !== 'number'}
                >
                  <SelectTrigger id="fromMonthFilter" className="h-9 w-full text-xs bg-background shadow-none">
                    <SelectValue placeholder="Select month" />
                  </SelectTrigger>
                  <SelectContent className="text-xs">
                    <SelectItem value="NONE_VALUE" className="text-xs">Any month</SelectItem>
                    {months.map((month, index) => (
                      <SelectItem key={index} value={index.toString()} className="text-xs">{month}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* To Year */}
              <div className="space-y-1.5">
                <Label htmlFor="toYearFilter" className="text-xs font-medium text-foreground">To year</Label>
                <Select
                  value={tempEndYear !== undefined ? tempEndYear.toString() : "NONE_VALUE"}
                  onValueChange={(value) => {
                    if (value === "NONE_VALUE") setTempEndYear(undefined);
                    else setTempEndYear(parseInt(value));
                  }}
                >
                  <SelectTrigger id="toYearFilter" className="h-9 w-full text-xs bg-background shadow-none">
                    <SelectValue placeholder="Select year" />
                  </SelectTrigger>
                  <SelectContent className="max-h-48 text-xs">
                    <SelectItem value="NONE_VALUE" className="text-xs">Any year</SelectItem>
                    {years.map(year => (
                      <SelectItem key={year} value={year.toString()} className="text-xs">{year}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* To Month */}
              <div className="space-y-1.5">
                <Label htmlFor="toMonthFilter" className="text-xs font-medium text-foreground">To month</Label>
                <Select
                  value={tempEndMonth !== undefined ? tempEndMonth.toString() : "NONE_VALUE"}
                  onValueChange={(value) => {
                    if (value === "NONE_VALUE") setTempEndMonth(undefined);
                    else setTempEndMonth(parseInt(value));
                  }}
                  disabled={typeof tempEndYear !== 'number'}
                >
                  <SelectTrigger id="toMonthFilter" className="h-9 w-full text-xs bg-background shadow-none">
                    <SelectValue placeholder="Select month" />
                  </SelectTrigger>
                  <SelectContent className="text-xs">
                    <SelectItem value="NONE_VALUE" className="text-xs">Any month</SelectItem>
                    {months.map((month, index) => (
                      <SelectItem key={index} value={index.toString()} className="text-xs">{month}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DateRangeError fromDate={tempStartDate} toDate={tempEndDate} />

            {/* Action Buttons */}
            <div className="flex items-center justify-between gap-3 pt-1 border-t">
              <div className="flex items-center gap-2">
                <Switch
                  id="sortByStoreCountToggle"
                  checked={isSortByStoreCount}
                  onCheckedChange={(checked) => {
                    setCurrentPage(0);
                    setIsSortByStoreCount(checked);
                  }}
                />
                <Label htmlFor="sortByStoreCountToggle" className="text-xs font-medium text-foreground cursor-pointer">
                  Sort by store count
                </Label>
              </div>
              
              <div className="flex items-center gap-2">
                <Button 
                  variant="ghost"
                  size="sm"
                  onClick={handleClearFilters}
                  className="h-9 text-xs"
                >
                  Clear
                </Button>
                <Button 
                  size="sm"
                  onClick={handleApplyFilters}
                  disabled={dateRangeInvalid}
                  className="h-9 text-xs font-medium"
                >
                  Apply filters
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Mobile Filter Sheet */}
      <Sheet open={isMobileFilterExpanded} onOpenChange={setIsMobileFilterExpanded}>
        <SheetContent className="overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle className="text-base font-semibold">Enquiry filters</SheetTitle>
          </SheetHeader>
          <div className="grid gap-4 py-5">
            <div className="space-y-1.5">
              <Label htmlFor="mobileStoreNameFilter" className="text-xs font-medium text-foreground">Store name</Label>
              <Input 
                id="mobileStoreNameFilter"
                type="text" 
                placeholder="All stores"
                value={tempStoreNameFilter} 
                onChange={(e) => setTempStoreNameFilter(e.target.value)} 
                className="h-9 w-full text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="mobileTalukaFilter" className="text-xs font-medium text-foreground">Taluka</Label>
              <Input 
                id="mobileTalukaFilter"
                type="text" 
                placeholder="All talukas"
                value={tempTalukaFilter} 
                onChange={(e) => setTempTalukaFilter(e.target.value)} 
                className="h-9 w-full text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="mobileCityFilter" className="text-xs font-medium text-foreground">City</Label>
              <Input 
                id="mobileCityFilter"
                type="text" 
                placeholder="All cities"
                value={tempCityFilter} 
                onChange={(e) => setTempCityFilter(e.target.value)} 
                className="h-9 w-full text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="mobileStateFilter" className="text-xs font-medium text-foreground">State</Label>
              <Select
                value={tempStateFilter || "all"}
                onValueChange={(value) => setTempStateFilter(value === "all" ? "" : value)}
              >
                <SelectTrigger id="mobileStateFilter" className="h-9 w-full text-xs">
                  <SelectValue placeholder="All states" />
                </SelectTrigger>
                <SelectContent className="max-h-56 text-xs">
                  <SelectItem value="all" className="text-xs">All states</SelectItem>
                  {locationStates.map((state) => (
                    <SelectItem key={state.id} value={state.name} className="text-xs">{state.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="mobileFromYearFilter" className="text-xs font-medium text-foreground">From year</Label>
                <Select
                  value={tempStartYear !== undefined ? tempStartYear.toString() : "NONE_VALUE"}
                  onValueChange={(value) => {
                    if (value === "NONE_VALUE") setTempStartYear(undefined);
                    else setTempStartYear(parseInt(value));
                  }}
                >
                  <SelectTrigger id="mobileFromYearFilter" className="h-9 w-full text-xs">
                    <SelectValue placeholder="Year" />
                  </SelectTrigger>
                  <SelectContent className="max-h-48 text-xs">
                    <SelectItem value="NONE_VALUE" className="text-xs">Any</SelectItem>
                    {years.map(year => (
                      <SelectItem key={year} value={year.toString()} className="text-xs">{year}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="mobileFromMonthFilter" className="text-xs font-medium text-foreground">From month</Label>
                <Select
                  value={tempStartMonth !== undefined ? tempStartMonth.toString() : "NONE_VALUE"}
                  onValueChange={(value) => {
                    if (value === "NONE_VALUE") setTempStartMonth(undefined);
                    else setTempStartMonth(parseInt(value));
                  }}
                  disabled={typeof tempStartYear !== 'number'}
                >
                  <SelectTrigger id="mobileFromMonthFilter" className="h-9 w-full text-xs">
                    <SelectValue placeholder="Month" />
                  </SelectTrigger>
                  <SelectContent className="text-xs">
                    <SelectItem value="NONE_VALUE" className="text-xs">Any</SelectItem>
                    {months.map((month, index) => (
                      <SelectItem key={index} value={index.toString()} className="text-xs">{month}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="mobileToYearFilter" className="text-xs font-medium text-foreground">To year</Label>
                <Select
                  value={tempEndYear !== undefined ? tempEndYear.toString() : "NONE_VALUE"}
                  onValueChange={(value) => {
                    if (value === "NONE_VALUE") setTempEndYear(undefined);
                    else setTempEndYear(parseInt(value));
                  }}
                >
                  <SelectTrigger id="mobileToYearFilter" className="h-9 w-full text-xs">
                    <SelectValue placeholder="Year" />
                  </SelectTrigger>
                  <SelectContent className="max-h-48 text-xs">
                    <SelectItem value="NONE_VALUE" className="text-xs">Any</SelectItem>
                    {years.map(year => (
                      <SelectItem key={year} value={year.toString()} className="text-xs">{year}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="mobileToMonthFilter" className="text-xs font-medium text-foreground">To month</Label>
                <Select
                  value={tempEndMonth !== undefined ? tempEndMonth.toString() : "NONE_VALUE"}
                  onValueChange={(value) => {
                    if (value === "NONE_VALUE") setTempEndMonth(undefined);
                    else setTempEndMonth(parseInt(value));
                  }}
                  disabled={typeof tempEndYear !== 'number'}
                >
                  <SelectTrigger id="mobileToMonthFilter" className="h-9 w-full text-xs">
                    <SelectValue placeholder="Month" />
                  </SelectTrigger>
                  <SelectContent className="text-xs">
                    <SelectItem value="NONE_VALUE" className="text-xs">Any</SelectItem>
                    {months.map((month, index) => (
                      <SelectItem key={index} value={index.toString()} className="text-xs">{month}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DateRangeError fromDate={tempStartDate} toDate={tempEndDate} />

            <div className="flex items-center gap-2 pt-2">
              <Switch
                id="mobileSortByStoreCountToggle"
                checked={isSortByStoreCount}
                onCheckedChange={(checked) => {
                  setCurrentPage(0);
                  setIsSortByStoreCount(checked);
                }}
              />
              <Label htmlFor="mobileSortByStoreCountToggle" className="text-xs font-medium text-foreground">
                Sort by store count
              </Label>
            </div>
          </div>
          <SheetFooter className="gap-2 border-t pt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                handleClearFilters();
                setIsMobileFilterExpanded(false);
              }}
              className="h-9 text-xs flex-1"
            >
              Clear
            </Button>
            <Button
              size="sm"
              disabled={dateRangeInvalid}
              onClick={() => {
                handleApplyFilters();
                setIsMobileFilterExpanded(false);
              }}
              className="h-9 text-xs flex-1"
            >
              Apply filters
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {renderMainContent()}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex flex-col gap-3 rounded-lg border border-border/70 bg-card p-3 sm:flex-row sm:items-center sm:justify-between text-xs">
          <div className="flex items-center gap-2">
            <Label htmlFor="pageSizeSelect" className="text-xs font-medium">Rows per page:</Label>
            <Select
              value={String(pageSize)}
              onValueChange={(value) => {
                setPageSize(Number(value));
                setCurrentPage(0);
              }}
            >
              <SelectTrigger id="pageSizeSelect" className="h-8 w-18 text-xs bg-background shadow-none">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="text-xs">
                <SelectItem value="10" className="text-xs">10</SelectItem>
                <SelectItem value="25" className="text-xs">25</SelectItem>
                <SelectItem value="50" className="text-xs">50</SelectItem>
                <SelectItem value="100" className="text-xs">100</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 0))}
              disabled={currentPage === 0 || isLoading}
            >
              <ChevronLeft className="mr-1 h-3.5 w-3.5" />
              Previous
            </Button>

            <span className="text-xs text-muted-foreground">
              Page {currentPage + 1} of {totalPages}
            </span>

            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages - 1))}
              disabled={currentPage >= totalPages - 1 || isLoading}
            >
              Next
              <ChevronRight className="ml-1 h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}