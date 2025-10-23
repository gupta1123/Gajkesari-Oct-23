"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, CalendarIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from 'framer-motion';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { SpacedCalendar } from "@/components/ui/spaced-calendar";
import { format } from "date-fns";

interface SummaryData {
    employeeName: string;
    fullDayThreshold: number;
    endDate: string;
    includeSundays: boolean;
    presentDays: number;
    fullDays: number;
    baseSalary: number;
    carDistanceKm: number;
    employeeId: number;
    absentDays: number;
    travelAllowance: number;
    halfDayThreshold: number;
    totalSalary: number;
    halfDays: number;
    bikeDistanceKm: number;
    approvedExpenses: number;
    startDate: string;
    dearnessAllowance: number;
}

const EmployeeSummary: React.FC = () => {
    const [summaryData, setSummaryData] = useState<SummaryData[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [summaryLoading, setSummaryLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [startDate, setStartDate] = useState(format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 'yyyy-MM-dd'));
    const [endDate, setEndDate] = useState(format(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0), 'yyyy-MM-dd'));
    const [isStartDatePopoverOpen, setIsStartDatePopoverOpen] = useState(false);
    const [isEndDatePopoverOpen, setIsEndDatePopoverOpen] = useState(false);

    // Get auth data from localStorage instead of Redux
    const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;

    // Helper function to format date for filter
    const formatDateForFilter = (date: Date | undefined) => {
        if (!date) return '';
        return format(date, 'yyyy-MM-dd');
    };

    const fetchSummaryData = async () => {
        setError(null);
        try {
            setSummaryLoading(true);
            
            if (!startDate || !endDate) {
                throw new Error('Please select a valid date range');
            }

            if (!token) {
                throw new Error('Authentication token not found. Please log in.');
            }

            const response = await fetch(
                `https://api.gajkesaristeels.in/salary-calculation/manual-summary-range?startDate=${startDate}&endDate=${endDate}`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                    },
                }
            );

            if (!response.ok) {
                throw new Error(`Failed to fetch summary data: ${response.statusText}`);
            }

            const data = await response.json();
            if (!data) {
                throw new Error('No summary data received');
            }

            setSummaryData(data);
        } catch (error) {
            setError(error instanceof Error ? error.message : 'An unknown error occurred');
        } finally {
            setSummaryLoading(false);
        }
    };

    // Remove automatic data fetching - only fetch on Apply Filter

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR'
        }).format(amount);
    };

    // Filter summary data based on search query and sort alphabetically by employee name
    const filteredSummaryData = summaryData
        .filter(employee =>
            employee.employeeName.toLowerCase().includes(searchQuery.toLowerCase())
        )
        .sort((a, b) => 
            a.employeeName.toLowerCase().localeCompare(b.employeeName.toLowerCase())
        );

    // Get date range display name
    const getDateRangeDisplay = () => {
        if (!startDate || !endDate) {
            return 'Select Date Range';
        }
        return `${format(new Date(startDate), 'MMM dd, yyyy')} - ${format(new Date(endDate), 'MMM dd, yyyy')}`;
    };

    return (
        <div className="space-y-6">
            <Card className="border-0 shadow-sm">
                <CardHeader className="pb-6">
                    <CardTitle className="text-3xl md:text-xl font-semibold text-foreground">Employee Summary</CardTitle>
                    <p className="text-lg md:text-sm text-muted-foreground">View employee salary summaries and attendance data</p>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Filters Section */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 p-6 bg-muted/30 rounded-lg">
                        <div className="space-y-3">
                            <Label htmlFor="searchQuery" className="text-lg md:text-sm font-medium text-foreground">Search Employee</Label>
                            <Input
                                id="searchQuery"
                                placeholder="Search employees..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full h-14 text-lg md:h-10 md:text-sm"
                            />
                        </div>
                        <div className="space-y-3">
                            <Label className="text-lg md:text-sm font-medium text-foreground">From Date</Label>
                            <Popover open={isStartDatePopoverOpen} onOpenChange={setIsStartDatePopoverOpen}>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        className={`w-full h-14 md:h-10 text-lg md:text-sm justify-start text-left font-normal ${!startDate && 'text-muted-foreground'}`}
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {startDate ? format(new Date(startDate), 'MMM d, yyyy') : <span>Pick start date</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                    <SpacedCalendar
                                        mode="single"
                                        selected={startDate ? new Date(startDate) : undefined}
                                        onSelect={(date) => {
                                            setStartDate(formatDateForFilter(date));
                                            setIsStartDatePopoverOpen(false);
                                        }}
                                        initialFocus
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>
                        <div className="space-y-3">
                            <Label className="text-lg md:text-sm font-medium text-foreground">To Date</Label>
                            <Popover open={isEndDatePopoverOpen} onOpenChange={setIsEndDatePopoverOpen}>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        className={`w-full h-14 md:h-10 text-lg md:text-sm justify-start text-left font-normal ${!endDate && 'text-muted-foreground'}`}
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {endDate ? format(new Date(endDate), 'MMM d, yyyy') : <span>Pick end date</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                    <SpacedCalendar
                                        mode="single"
                                        selected={endDate ? new Date(endDate) : undefined}
                                        onSelect={(date) => {
                                            setEndDate(formatDateForFilter(date));
                                            setIsEndDatePopoverOpen(false);
                                        }}
                                        initialFocus
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>
                        <div className="flex items-end">
                            <Button onClick={fetchSummaryData} className="w-full h-14 text-lg md:h-10 md:text-sm font-medium" disabled={summaryLoading}>
                                {summaryLoading ? (
                                    <>
                                        <Loader2 className="mr-2 h-6 w-6 md:h-4 md:w-4 animate-spin" />
                                        Loading...
                                    </>
                                ) : (
                                    'Apply Filter'
                                )}
                            </Button>
                        </div>
                    </div>

                    {summaryLoading && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-muted/30 rounded-lg">
                                {[...Array(4)].map((_, i) => (
                                    <div key={i} className="space-y-2">
                                        <Skeleton className="h-4 w-32" />
                                        <Skeleton className="h-10 w-full" />
                                    </div>
                                ))}
                            </div>

                            <div className="md:hidden space-y-3">
                                {[...Array(4)].map((_, i) => (
                                    <Card key={i}>
                                        <CardHeader className="pb-2">
                                            <div className="flex items-center justify-between">
                                                <Skeleton className="h-5 w-40" />
                                                <Skeleton className="h-5 w-20" />
                                            </div>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="grid grid-cols-1 gap-2">
                                                {[...Array(5)].map((_, j) => (
                                                    <div key={j} className="flex items-center justify-between">
                                                        <Skeleton className="h-3 w-28" />
                                                        <Skeleton className="h-3 w-16" />
                                                    </div>
                                                ))}
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>

                            <div className="hidden md:block rounded-lg border bg-card">
                                <div className="p-4 border-b">
                                    <Skeleton className="h-5 w-64" />
                                    <Skeleton className="h-4 w-40 mt-2" />
                                </div>
                                <div className="p-4 space-y-2">
                                    {[...Array(6)].map((_, i) => (
                                        <div key={i} className="flex items-center justify-between p-3 border rounded">
                                            <Skeleton className="h-4 w-40" />
                                            <div className="flex gap-4">
                                                {[...Array(9)].map((_, k) => (
                                                    <Skeleton key={k} className="h-4 w-20" />
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="p-4 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md">
                            <div className="flex items-center justify-between">
                                <p><strong>Error:</strong> {error}</p>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={fetchSummaryData}
                                    disabled={summaryLoading}
                                >
                                    Try Again
                                </Button>
                            </div>
                        </div>
                    )}

                    {!summaryLoading && !error && (
                        <>
                            {/* Mobile view */}
                            <div className="md:hidden space-y-6">
                                <Card>
                                    <CardHeader className="pb-4">
                                        <CardTitle className="text-3xl">Employee Salary Summary ({getDateRangeDisplay()})</CardTitle>
                                    </CardHeader>
                                    <CardContent className="pt-0">
                                        {summaryLoading ? (
                                            <div className="space-y-4">
                                                {[...Array(4)].map((_, i) => (
                                                    <Card key={i}>
                                                        <CardHeader className="pb-3">
                                                            <div className="flex items-center justify-between">
                                                                <Skeleton className="h-6 w-48" />
                                                                <Skeleton className="h-8 w-24" />
                                                            </div>
                                                        </CardHeader>
                                                        <CardContent>
                                                            <div className="grid grid-cols-1 gap-3">
                                                                {[...Array(5)].map((_, j) => (
                                                                    <div key={j} className="flex items-center justify-between">
                                                                        <Skeleton className="h-4 w-32" />
                                                                        <Skeleton className="h-4 w-20" />
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </CardContent>
                                                    </Card>
                                                ))}
                                            </div>
                                        ) : summaryData.length === 0 ? (
                                            <div className="text-center py-12 text-muted-foreground text-2xl">
                                                No summary data available
                                            </div>
                                        ) : (
                                            <div className="space-y-5">
                                                {filteredSummaryData.map((employee) => (
                                                    <motion.div
                                                        key={employee.employeeId}
                                                        initial={{ opacity: 0, y: 20 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        transition={{ duration: 0.3 }}
                                                    >
                                                        <Card className="border-l-4 border-l-primary shadow-md hover:shadow-lg transition-shadow duration-300">
                                                            <CardContent className="p-6">
                                                                {/* Header Section */}
                                                                <div className="mb-6">
                                                                    <div className="flex items-start justify-between mb-3">
                                                                        <h4 className="font-bold text-2xl text-foreground leading-tight flex-1 mr-2">
                                                                            {employee.employeeName}
                                                                        </h4>
                                                                    </div>
                                                                    <div className="flex items-center justify-between">
                                                                        <p className="text-xl text-muted-foreground">
                                                                            {getDateRangeDisplay()}
                                                                        </p>
                                                                        <Badge variant="default" className="text-2xl font-bold px-5 py-2.5 bg-primary">
                                                                            {formatCurrency(employee.totalSalary)}
                                                                        </Badge>
                                                                    </div>
                                                                </div>

                                                                {/* Attendance Section */}
                                                                <div className="mb-6">
                                                                    <h5 className="text-xl font-semibold text-foreground mb-4 uppercase tracking-wide">
                                                                        Attendance
                                                                    </h5>
                                                                    <div className="grid grid-cols-2 gap-4">
                                                                        <div className="flex flex-col py-4 px-4 bg-muted/30 rounded-lg border border-border/50">
                                                                            <span className="text-lg font-medium text-muted-foreground mb-2">Present Days</span>
                                                                            <span className="text-3xl font-bold text-foreground">{employee.presentDays}</span>
                                                                        </div>
                                                                        <div className="flex flex-col py-4 px-4 bg-muted/30 rounded-lg border border-border/50">
                                                                            <span className="text-lg font-medium text-muted-foreground mb-2">Full Days</span>
                                                                            <span className="text-3xl font-bold text-foreground">{employee.fullDays}</span>
                                                                        </div>
                                                                        <div className="flex flex-col py-4 px-4 bg-muted/30 rounded-lg border border-border/50">
                                                                            <span className="text-lg font-medium text-muted-foreground mb-2">Half Days</span>
                                                                            <span className="text-3xl font-bold text-foreground">{employee.halfDays}</span>
                                                                        </div>
                                                                        <div className="flex flex-col py-4 px-4 bg-muted/30 rounded-lg border border-border/50">
                                                                            <span className="text-lg font-medium text-muted-foreground mb-2">Absent Days</span>
                                                                            <span className="text-3xl font-bold text-foreground">{employee.absentDays}</span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                
                                                                {/* Separator */}
                                                                <div className="border-t border-border/50 my-6"></div>
                                                                
                                                                {/* Salary Section */}
                                                                <div>
                                                                    <h5 className="text-xl font-semibold text-foreground mb-4 uppercase tracking-wide">
                                                                        Salary Breakdown
                                                                    </h5>
                                                                    <div className="space-y-3">
                                                                        <div className="flex justify-between items-center py-4 px-4 bg-muted/30 rounded-lg border border-border/50">
                                                                            <span className="text-xl font-medium text-muted-foreground">Base Salary</span>
                                                                            <span className="text-2xl font-bold text-foreground">{formatCurrency(employee.baseSalary)}</span>
                                                                        </div>
                                                                        <div className="flex justify-between items-center py-4 px-4 bg-muted/30 rounded-lg border border-border/50">
                                                                            <span className="text-xl font-medium text-muted-foreground">Travel Allowance</span>
                                                                            <span className="text-2xl font-bold text-foreground">{formatCurrency(employee.travelAllowance)}</span>
                                                                        </div>
                                                                        <div className="flex justify-between items-center py-4 px-4 bg-muted/30 rounded-lg border border-border/50">
                                                                            <span className="text-xl font-medium text-muted-foreground">Dearness Allowance</span>
                                                                            <span className="text-2xl font-bold text-foreground">{formatCurrency(employee.dearnessAllowance)}</span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </CardContent>
                                                        </Card>
                                                    </motion.div>
                                                ))}
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Desktop view */}
                            <div className="hidden md:block">
                                <div className="rounded-lg border bg-card">
                                    <div className="p-4 border-b">
                                        <h3 className="text-lg font-semibold text-foreground">Employee Salary Summary ({getDateRangeDisplay()})</h3>
                                        <p className="text-sm text-muted-foreground">Overview of employee attendance and salary calculations</p>
                                    </div>
                                    <div className="overflow-x-auto">
                                        {summaryLoading ? (
                                            <div className="p-4 space-y-2">
                                                {/* Header skeleton */}
                                                <div className="flex items-center justify-between p-3 border rounded">
                                                    <Skeleton className="h-4 w-40" />
                                                    <div className="flex gap-4">
                                                        {[...Array(9)].map((_, k) => (
                                                            <Skeleton key={k} className="h-4 w-20" />
                                                        ))}
                                                    </div>
                                                </div>
                                                {/* Rows skeleton */}
                                                {[...Array(6)].map((_, i) => (
                                                    <div key={i} className="flex items-center justify-between p-3 border rounded">
                                                        <Skeleton className="h-4 w-40" />
                                                        <div className="flex gap-4">
                                                            {[...Array(9)].map((_, k) => (
                                                                <Skeleton key={k} className="h-4 w-20" />
                                                            ))}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : filteredSummaryData.length === 0 ? (
                                            <div className="text-center py-8 text-muted-foreground">
                                                {summaryData.length === 0 ? 'No summary data available' : 'No employees found matching your search'}
                                            </div>
                                        ) : (
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead>Employee Name</TableHead>
                                                        <TableHead>Present Days</TableHead>
                                                        <TableHead>Full Days</TableHead>
                                                        <TableHead>Half Days</TableHead>
                                                        <TableHead>Absent Days</TableHead>
                                                        <TableHead>Base Salary</TableHead>
                                                        <TableHead>Travel Allowance</TableHead>
                                                        <TableHead>Dearness Allowance</TableHead>
                                                        <TableHead>Expenses</TableHead>
                                                        <TableHead>Total Salary</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {filteredSummaryData.map((employee) => (
                                                        <TableRow key={employee.employeeId}>
                                                            <TableCell className="font-medium">{employee.employeeName}</TableCell>
                                                            <TableCell>{employee.presentDays}</TableCell>
                                                            <TableCell>{employee.fullDays}</TableCell>
                                                            <TableCell>{employee.halfDays}</TableCell>
                                                            <TableCell>{employee.absentDays}</TableCell>
                                                            <TableCell>{formatCurrency(employee.baseSalary)}</TableCell>
                                                            <TableCell>{formatCurrency(employee.travelAllowance)}</TableCell>
                                                            <TableCell>{formatCurrency(employee.dearnessAllowance)}</TableCell>
                                                            <TableCell>{formatCurrency(employee.approvedExpenses)}</TableCell>
                                                            <TableCell className="font-bold">{formatCurrency(employee.totalSalary)}</TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default EmployeeSummary;
