"use client";

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from "@/components/ui/pagination";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuCheckboxItem,
    DropdownMenuTrigger,
    DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Check, ChevronDown, ChevronUp, Phone, User, DollarSign, Target, Filter, X, Download, Columns, Home, MoreHorizontal, ChevronLeft, ChevronRight, Briefcase } from "lucide-react";
import { API, type StoreDto, type StoreResponse, type TeamDataDto, type EmployeeUserDto } from "@/lib/api";
import AddCustomerModal from "@/components/AddCustomerModal";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/components/auth-provider";
import { formatDateToUserFriendly } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { SearchableSelect, type SearchableOption } from "@/components/ui/searchable-select2";

const CUSTOMER_LIST_STORAGE_KEY = "customers.list.state.v1";

export default function CustomerListPage() {
    return <CustomerListContent />;
}

type Customer = StoreDto & {
    storeId: number;
    clientFirstName: string;
    clientLastName: string;
    employeeName: string;
    totalVisitCount: number;
};

function CustomerListContent() {
    const router = useRouter();
    const hasHydratedRef = useRef(false);
    const [isStateHydrated, setIsStateHydrated] = useState(false);
    const { token, userData } = useAuth();
    const [selectedColumns, setSelectedColumns] = useState<string[]>([
        'shopName', 'ownerName', 'city', 'state', 'phone', 'monthlySales', 'intentLevel', 'fieldOfficer',
        'clientType', 'totalVisits', 'lastVisitDate',
    ]);
    const [desktopFilters, setDesktopFilters] = useState({
        storeName: '',
        primaryContact: '',
        ownerName: '',
        city: '',
        state: '',
        clientType: '',
        employeeName: '',
    });
    const [mobileFilters, setMobileFilters] = useState({
        storeName: '',
        primaryContact: '',
        ownerName: '',
        city: '',
        state: '',
        clientType: '',
        employeeName: '',
    });
    const [isDesktopFilterExpanded, setIsDesktopFilterExpanded] = useState(false);
    const [isMobileFilterExpanded, setIsMobileFilterExpanded] = useState(false);
    const [expandedCards, setExpandedCards] = useState<number[]>([]);
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [pageSize, setPageSize] = useState<number>(10);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);
    const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
    const [sortColumn, setSortColumn] = useState<string>('storeName');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
    const [isExporting, setIsExporting] = useState<boolean>(false);
    const [exportMessage, setExportMessage] = useState<string>('Please wait, downloading...');
    const [customers, setCustomers] = useState<Customer[]>([]);
   const [totalPages, setTotalPages] = useState<number>(1);
   const [isLoading, setIsLoading] = useState<boolean>(true);
   const [error, setError] = useState<string | null>(null);
    const [employees, setEmployees] = useState<EmployeeUserDto[]>([]);
    const [isLoadingEmployees, setIsLoadingEmployees] = useState(false);
    const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("all");
    const [mobileSelectedEmployeeId, setMobileSelectedEmployeeId] = useState<string>("all");
    
    // State for role checking
    const [isManager, setIsManager] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);
    const [isFieldOfficer, setIsFieldOfficer] = useState(false);
    const [userRoleFromAPI, setUserRoleFromAPI] = useState<string | null>(null);
    const [teamId, setTeamId] = useState<number | null>(null);
    const [teamLoading, setTeamLoading] = useState(false);
    const [teamError, setTeamError] = useState<string | null>(null);
    const [isRoleDetermined, setIsRoleDetermined] = useState(false);

    // Mock auth data - replace with actual auth context
    const employeeId = typeof window !== 'undefined' ? localStorage.getItem('employeeId') : null;
    const role = typeof window !== 'undefined' ? localStorage.getItem('role') : null;

    useEffect(() => {
        let isMounted = true;

        const loadEmployees = async () => {
            try {
                setIsLoadingEmployees(true);
                const data = await API.getAllEmployees();
                if (!isMounted) {
                    return;
                }
                setEmployees(data);
            } catch (error) {
                console.error('Failed to load employees:', error);
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
            const storedState = sessionStorage.getItem(CUSTOMER_LIST_STORAGE_KEY);
            if (storedState) {
                const parsed = JSON.parse(storedState) as {
                    selectedColumns?: string[];
                    desktopFilters?: typeof desktopFilters;
                    mobileFilters?: typeof mobileFilters;
                    isDesktopFilterExpanded?: boolean;
                    isMobileFilterExpanded?: boolean;
                    expandedCards?: number[];
                    currentPage?: number;
                    pageSize?: number;
                    sortColumn?: string;
                    sortDirection?: 'asc' | 'desc';
                    selectedEmployeeId?: string;
                    mobileSelectedEmployeeId?: string;
                };

                if (Array.isArray(parsed.selectedColumns) && parsed.selectedColumns.length > 0) {
                    setSelectedColumns(parsed.selectedColumns);
                }

                if (parsed.desktopFilters && typeof parsed.desktopFilters === 'object') {
                    setDesktopFilters((prev) => ({ ...prev, ...parsed.desktopFilters }));
                }

                if (parsed.mobileFilters && typeof parsed.mobileFilters === 'object') {
                    setMobileFilters((prev) => ({ ...prev, ...parsed.mobileFilters }));
                }

                if (typeof parsed.isDesktopFilterExpanded === 'boolean') {
                    setIsDesktopFilterExpanded(parsed.isDesktopFilterExpanded);
                }

                if (typeof parsed.isMobileFilterExpanded === 'boolean') {
                    setIsMobileFilterExpanded(parsed.isMobileFilterExpanded);
                }

                if (Array.isArray(parsed.expandedCards)) {
                    setExpandedCards(parsed.expandedCards);
                }

                if (typeof parsed.currentPage === 'number' && parsed.currentPage >= 1) {
                    setCurrentPage(parsed.currentPage);
                }

                if (typeof parsed.pageSize === 'number' && parsed.pageSize > 0) {
                    setPageSize(parsed.pageSize);
                }

                if (typeof parsed.sortColumn === 'string' && parsed.sortColumn.trim() !== '') {
                    setSortColumn(parsed.sortColumn);
                }

                if (parsed.sortDirection === 'asc' || parsed.sortDirection === 'desc') {
                    setSortDirection(parsed.sortDirection);
                }

                if (typeof parsed.selectedEmployeeId === 'string') {
                    setSelectedEmployeeId(parsed.selectedEmployeeId || 'all');
                }

                if (typeof parsed.mobileSelectedEmployeeId === 'string') {
                    setMobileSelectedEmployeeId(parsed.mobileSelectedEmployeeId || 'all');
                }
            }
        } catch (error) {
            console.error('Failed to restore customer list state:', error);
        } finally {
            setIsStateHydrated(true);
        }
    }, []);

    useEffect(() => {
        if (!isStateHydrated || typeof window === 'undefined') {
            return;
        }

        const payload = {
            selectedColumns,
            desktopFilters,
            mobileFilters,
            isDesktopFilterExpanded,
            isMobileFilterExpanded,
            expandedCards,
            currentPage,
            pageSize,
            sortColumn,
            sortDirection,
            selectedEmployeeId,
            mobileSelectedEmployeeId,
        };

        try {
            sessionStorage.setItem(CUSTOMER_LIST_STORAGE_KEY, JSON.stringify(payload));
        } catch (error) {
            console.error('Failed to persist customer list state:', error);
        }
    }, [
        isStateHydrated,
        selectedColumns,
        desktopFilters,
        mobileFilters,
        isDesktopFilterExpanded,
        isMobileFilterExpanded,
        expandedCards,
        currentPage,
        pageSize,
        sortColumn,
        sortDirection,
        selectedEmployeeId,
        mobileSelectedEmployeeId,
    ]);

    const employeeOptions = useMemo<SearchableOption<{ fullName: string }>[]>(() => {
        const base = employees.map((employee) => {
            const fullName = [employee.firstName, employee.lastName].filter(Boolean).join(" ").trim();
            const identifier = employee.userDto?.employeeId ?? null;
            const fallbackName =
                fullName || employee.userName || employee.email || `Employee ${identifier ?? employee.id}`;
            const label = identifier !== null ? `${fallbackName} (${identifier})` : fallbackName;
            const filterName = fullName || fallbackName;
            return {
                value: String(employee.id),
                label,
                data: { fullName: filterName },
            };
        });

        base.sort((a, b) => a.label.localeCompare(b.label));

        return [{ value: "all", label: "All Field Officers" }, ...base];
    }, [employees]);

    useEffect(() => {
        if (employees.length === 0) {
            return;
        }

        const filterName = desktopFilters.employeeName;

        if (!filterName) {
            if (selectedEmployeeId !== "all") {
                setSelectedEmployeeId("all");
            }
            return;
        }

        const match = employeeOptions.find(
            (option) => option.value !== "all" && option.data?.fullName === filterName,
        );

        if (match) {
            if (selectedEmployeeId !== match.value) {
                setSelectedEmployeeId(match.value);
            }
        } else if (selectedEmployeeId !== "all") {
            setSelectedEmployeeId("all");
        }
    }, [desktopFilters.employeeName, employeeOptions, employees, selectedEmployeeId]);

    useEffect(() => {
        if (employees.length === 0) {
            return;
        }

        const filterName = mobileFilters.employeeName;

        if (!filterName) {
            if (mobileSelectedEmployeeId !== "all") {
                setMobileSelectedEmployeeId("all");
            }
            return;
        }

        const match = employeeOptions.find(
            (option) => option.value !== "all" && option.data?.fullName === filterName,
        );

        if (match) {
            if (mobileSelectedEmployeeId !== match.value) {
                setMobileSelectedEmployeeId(match.value);
            }
        } else if (mobileSelectedEmployeeId !== "all") {
            setMobileSelectedEmployeeId("all");
        }
    }, [mobileFilters.employeeName, employeeOptions, employees, mobileSelectedEmployeeId]);

    // Fetch current user data to determine role
    useEffect(() => {
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
                    const userData = await response.json();
                    console.log('Current user data:', userData);
                    
                    // Extract role from authorities
                    const authorities = userData.authorities || [];
                    const role = authorities.length > 0 ? authorities[0].authority : null;
                    setUserRoleFromAPI(role);
                    
                    // Set role flags
                    setIsManager(role === 'ROLE_MANAGER');
                    setIsAdmin(role === 'ROLE_ADMIN');
                    setIsFieldOfficer(role === 'ROLE_FIELD OFFICER');
                    
                    console.log('Role from API:', role);
                    console.log('isManager:', role === 'ROLE_MANAGER');
                    console.log('isAdmin:', role === 'ROLE_ADMIN');
                    console.log('isFieldOfficer:', role === 'ROLE_FIELD OFFICER');
                    
                    // Mark role as determined
                    setIsRoleDetermined(true);
                } else {
                    console.error('Failed to fetch current user data');
                }
            } catch (error) {
                console.error('Error fetching current user:', error);
            }
        };

        fetchCurrentUser();
    }, [token]);

    // Fetch team data for managers and field officers
    useEffect(() => {
        const loadTeamData = async () => {
            if ((!isManager && !isFieldOfficer) || !userData?.employeeId) {
                // For admins or users without employeeId, mark role as determined
                setIsRoleDetermined(true);
                return;
            }
            
            setTeamLoading(true);
            setTeamError(null);
            
            try {
                const teamData: TeamDataDto[] = await API.getTeamByEmployee(userData.employeeId);
                
                // Get the first team ID (assuming manager/field officer has one primary team)
                if (teamData.length > 0) {
                    setTeamId(teamData[0].id);
                } else {
                    setTeamError('No team data found for this user');
                    // Fallback to hardcoded team ID
                    setTeamId(6);
                }
            } catch (err) {
                console.error('Failed to load team data:', err);
                setTeamError('Failed to load team data');
                // Fallback to hardcoded team ID if API fails
                setTeamId(6);
            } finally {
                setTeamLoading(false);
                // Mark role as determined after team data is loaded (or failed)
                setIsRoleDetermined(true);
            }
        };

        loadTeamData();
    }, [isManager, isFieldOfficer, userData?.employeeId]);

    const handleSort = (column: string) => {
        let mappedColumn = column;
        if (column === 'ownerName') {
            mappedColumn = 'ownerFirstName';
        } else if (column === 'totalVisits') {
            mappedColumn = 'visitCount';
        }
        
        // If clicking the same column, toggle direction
        if (sortColumn === mappedColumn) {
            setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            // If clicking a different column, set to alphabetical (ascending) by default
            setSortColumn(mappedColumn);
            setSortDirection('asc');
        }
    };

    const fetchFilteredCustomers = async () => {
        if (!isStateHydrated || !isRoleDetermined) {
            return;
        }
        setIsLoading(true);
        setError(null);
        try {
            // For managers and field officers, wait until teamId is available
            if ((isManager || isFieldOfficer) && (teamId === null || teamId === undefined)) return;
            
            let data: StoreResponse;
            
            if (isManager) {
                // For managers, use team-based API call only
                if (!teamId) {
                    console.log('Manager role detected but no teamId available, skipping API call');
                    setCustomers([]);
                    setTotalPages(1);
                    return;
                }
                console.log('Manager API call for team:', teamId);
                data = await API.getStoresForTeam(teamId, currentPage - 1, pageSize);
                console.log('Manager API response:', data);
            } else if (isFieldOfficer) {
                // For field officers, use team-based API call only
                if (!teamId) {
                    console.log('Field Officer role detected but no teamId available, skipping API call');
                    setCustomers([]);
                    setTotalPages(1);
                    return;
                }
                console.log('Field Officer API call for team:', teamId);
                data = await API.getStoresForTeam(teamId, currentPage - 1, pageSize);
                console.log('Field Officer API response:', data);
            } else if (isAdmin) {
                // For admins, use the original API logic
                console.log('Admin API call');
                if (desktopFilters.employeeName && employeeId) {
                    // Use employee-specific endpoint
                    data = await API.getStoresByEmployee(Number(employeeId), {
                        sortBy: sortColumn,
                        sortOrder: sortDirection,
                    });
                } else {
                    // Use general filtered endpoint
                    data = await API.getStoresFilteredPaginated({
                        storeName: desktopFilters.storeName || undefined,
                        ownerName: desktopFilters.ownerName || undefined,
                        city: desktopFilters.city || undefined,
                        state: desktopFilters.state || undefined,
                        clientType: desktopFilters.clientType || undefined,
                        employeeName: desktopFilters.employeeName || undefined,
                        primaryContact: desktopFilters.primaryContact || undefined,
                        page: currentPage - 1,
                        size: pageSize,
                        sortBy: sortColumn,
                        sortOrder: sortDirection,
                    });
                }
            } else {
                // Default to admin API call for unknown roles
                console.log('Default (Admin) API call for unknown role');
                data = await API.getStoresFilteredPaginated({
                    storeName: desktopFilters.storeName || undefined,
                    ownerName: desktopFilters.ownerName || undefined,
                    city: desktopFilters.city || undefined,
                    state: desktopFilters.state || undefined,
                    clientType: desktopFilters.clientType || undefined,
                    employeeName: desktopFilters.employeeName || undefined,
                    primaryContact: desktopFilters.primaryContact || undefined,
                    page: currentPage - 1,
                    size: pageSize,
                    sortBy: sortColumn,
                    sortOrder: sortDirection,
                });
            }
            
            // Transform StoreDto to Customer format
            const transformedCustomers: Customer[] = (data.content || []).map((store: StoreDto) => ({
                ...store,
                storeId: store.storeId,
                clientFirstName: store.clientFirstName || '',
                clientLastName: store.clientLastName || '',
                employeeName: store.employeeName || '',
                totalVisitCount: store.totalVisitCount || 0,
            }));
            setCustomers(transformedCustomers);
            const resolvedTotalPages = data.totalPages && data.totalPages > 0 ? data.totalPages : 1;
            setTotalPages(resolvedTotalPages);
            if (currentPage > resolvedTotalPages) {
                const nextPage = Math.max(resolvedTotalPages, 1);
                if (nextPage !== currentPage) {
                    setCurrentPage(nextPage);
                }
            }
        } catch (err) {
            setError((err as Error)?.message || 'Failed to load customers');
            setCustomers([]);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (!isStateHydrated || !isRoleDetermined) {
            return;
        }
        fetchFilteredCustomers();
    }, [isStateHydrated, isRoleDetermined, desktopFilters, currentPage, pageSize, sortColumn, sortDirection, teamId]);

    const openDeleteModal = (customerId: string) => {
        setSelectedCustomerId(customerId);
        setIsDeleteModalOpen(true);
    };

    const closeDeleteModal = () => {
        setSelectedCustomerId(null);
        setIsDeleteModalOpen(false);
    };

    const handleDesktopFilterChange = (filterName: keyof typeof desktopFilters, value: string) => {
        if (filterName === 'ownerName') {
            setDesktopFilters((prevFilters) => ({
                ...prevFilters,
                [filterName]: value.toLowerCase(),
            }));
        } else {
            setDesktopFilters((prevFilters) => ({
                ...prevFilters,
                [filterName]: value,
            }));
        }
        setCurrentPage(1);
    };

    const handleMobileFilterChange = (filterName: keyof typeof mobileFilters, value: string) => {
        if (filterName === 'ownerName') {
            setMobileFilters((prevFilters) => ({
                ...prevFilters,
                [filterName]: value.toLowerCase(),
            }));
        } else {
            setMobileFilters((prevFilters) => ({
                ...prevFilters,
                [filterName]: value,
            }));
        }
    };

    const handleDesktopEmployeeSelect = (option: SearchableOption<{ fullName: string }> | null) => {
        if (!option || option.value === "all") {
            setSelectedEmployeeId("all");
            handleDesktopFilterChange('employeeName', '');
        } else {
            setSelectedEmployeeId(option.value);
            const nextName = option.data?.fullName ?? '';
            handleDesktopFilterChange('employeeName', nextName);
        }
    };

    const handleMobileEmployeeSelect = (option: SearchableOption<{ fullName: string }> | null) => {
        if (!option || option.value === "all") {
            setMobileSelectedEmployeeId("all");
            handleMobileFilterChange('employeeName', '');
        } else {
            setMobileSelectedEmployeeId(option.value);
            const nextName = option.data?.fullName ?? '';
            handleMobileFilterChange('employeeName', nextName);
        }
    };

    const handleFilterClear = (filterName: keyof typeof desktopFilters) => {
        setDesktopFilters((prevFilters) => ({
            ...prevFilters,
            [filterName]: '',
        }));
        if (filterName === 'employeeName') {
            setSelectedEmployeeId('all');
        }
        setCurrentPage(1);
    };

    const toggleCardExpansion = (storeId: number) => {
        setExpandedCards(prev =>
            prev.includes(storeId)
                ? prev.filter(id => id !== storeId)
                : [...prev, storeId]
        );
    };

    const handleDeleteConfirm = async () => {
        if (selectedCustomerId) {
            try {
                console.log('Attempting to delete customer with ID:', selectedCustomerId);
                console.log('Using token:', token ? 'Token present' : 'No token');
                
                // Try using the API service first
                try {
                    await API.deleteStore(Number(selectedCustomerId));
                    console.log('Customer deleted successfully via API service');
                    fetchFilteredCustomers();
                    closeDeleteModal();
                    return;
                } catch (apiError) {
                    console.log('API service failed, trying direct fetch:', apiError);
                }
                
                // Fallback to direct fetch
                const response = await fetch(`https://api.gajkesaristeels.in/store/deleteById?id=${selectedCustomerId}`, {
                    method: 'DELETE',
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                });
                
                console.log('Delete response status:', response.status);
                console.log('Delete response ok:', response.ok);
                
                if (response.ok) {
                    console.log('Customer deleted successfully via direct fetch');
                    fetchFilteredCustomers();
                    closeDeleteModal();
                } else {
                    const errorText = await response.text();
                    console.error('Failed to delete customer. Status:', response.status);
                    console.error('Error response:', errorText);
                }
            } catch (error) {
                console.error('Error deleting customer:', error);
            }
        }
    };


    const handleSelectColumn = (column: string) => {
        setSelectedColumns(prev =>
            prev.includes(column)
                ? prev.filter(col => col !== column)
                : [...prev, column]
        );
    };

    const getInitials = (firstName: string, lastName: string) => {
        const firstInitial = firstName?.charAt(0) || '';
        const lastInitial = lastName?.charAt(0) || '';
        return `${firstInitial}${lastInitial}`.toUpperCase();
    };

    const handleExport = useCallback(async () => {
        setIsExporting(true);
        setExportMessage('Please wait, downloading...');
        try {
            console.log('Starting export process...');
            
            const response = await fetch('https://api.gajkesaristeels.in/store/export', {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
    
            console.log('Export response status:', response.status);
            console.log('Export response ok:', response.ok);
    
            if (!response.ok) {
                console.error('Failed to fetch export data');
                setExportMessage('Failed to download. Please try again.');
                return;
            }
    
            const csvContent = await response.text();
            console.log('CSV content received, length:', csvContent.length);
    
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            if (link.download !== undefined) {
                const url = URL.createObjectURL(blob);
                link.setAttribute('href', url);
                link.setAttribute('download', 'customers_export.csv');
                link.style.visibility = 'hidden';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                setExportMessage('Download complete!');
                console.log('Export completed successfully');
            }
        } catch (error) {
            console.error('Error exporting data:', error);
            setExportMessage('Failed to download. Please try again.');
        } finally {
            setTimeout(() => {
                setIsExporting(false);
                setExportMessage('Please wait, downloading...');
            }, 2000);
        }
    }, [token]);

    const openModal = () => {
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
    };

    const handleCustomerAdded = () => {
        // Refresh the customers list after adding a new customer
        fetchFilteredCustomers();
    };

    const applyMobileFilters = () => {
        setDesktopFilters(mobileFilters);
        setSelectedEmployeeId(mobileSelectedEmployeeId);
        setIsMobileFilterExpanded(false);
        setCurrentPage(1);
    };

    const clearAllFilters = () => {
        const emptyFilters = {
            storeName: '',
            primaryContact: '',
            ownerName: '',
            city: '',
            state: '',
            clientType: '',
            employeeName: '',
        };
        setDesktopFilters(emptyFilters);
        setMobileFilters(emptyFilters);
        setSelectedEmployeeId('all');
        setMobileSelectedEmployeeId('all');
        setCurrentPage(1);
    };

    const renderPagination = () => {
        return (
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
                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1}
                    >
                        <ChevronLeft className="h-4 w-4" />
                        Previous
                    </Button>
                    
                    <span className="text-sm text-muted-foreground">
                        Page {currentPage} of {totalPages}
                    </span>
                    
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                        disabled={currentPage >= totalPages}
                    >
                        Next
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        );
    };

    const renderFilterInput = (name: keyof typeof desktopFilters, label: string, icon: React.ReactNode, isMobile: boolean) => (
        <div className="space-y-1">
            <Label htmlFor={name} className="sr-only">{label}</Label>
            <div className="relative">
                <Input
                    id={name}
                    placeholder={label}
                    value={isMobile ? mobileFilters[name] : desktopFilters[name]}
                    onChange={(e) => isMobile ? handleMobileFilterChange(name, e.target.value) : handleDesktopFilterChange(name, e.target.value)}
                    className="pl-8 pr-8 h-9"
                />
                <div className="absolute inset-y-0 left-0 flex items-center pl-2 pointer-events-none text-gray-400">
                    {icon}
                </div>
                {!isMobile && desktopFilters[name] && (
                    <button
                        onClick={() => handleFilterClear(name)}
                        className="absolute inset-y-0 right-0 flex items-center pr-2 text-gray-400 hover:text-gray-600"
                    >
                        <X className="h-4 w-4" />
                    </button>
                )}
            </div>
        </div>
    );

  return (
        <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
            <div>
                <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                    <div className="flex flex-wrap items-center gap-2">
                        <Button variant="outline" size="sm" onClick={openModal}>
                            Add Customer
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setIsDesktopFilterExpanded(!isDesktopFilterExpanded)}
                            className="hidden md:inline-flex"
                        >
                            <Filter className="mr-2 h-4 w-4" />
                            {isDesktopFilterExpanded ? 'Hide Filters' : 'Show Filters'}
                        </Button>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm">
                                    <Columns className="mr-2 h-4 w-4" />
                                    Columns
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56">
                                <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                {[
                                    { value: 'shopName', label: 'Shop Name' },
                                    { value: 'ownerName', label: 'Owner Name' },
                                    { value: 'city', label: 'City' },
                                    { value: 'state', label: 'State' },
                                    { value: 'phone', label: 'Phone' },
                                    { value: 'monthlySales', label: 'Monthly Sales' },
                                    { value: 'intentLevel', label: 'Intent Level' },
                                    { value: 'fieldOfficer', label: 'Field Officer' },
                                    { value: 'clientType', label: 'Client Type' },
                                    { value: 'totalVisits', label: 'Total Visits' },
                                    { value: 'lastVisitDate', label: 'Last Visit Date' }
                                ].map((column) => (
                                    <DropdownMenuCheckboxItem
                                        key={column.value}
                                        checked={selectedColumns.includes(column.value)}
                                        onCheckedChange={() => handleSelectColumn(column.value)}
                                    >
                                        <div className="flex items-center justify-between w-full">
                                            {column.label}
                                            {selectedColumns.includes(column.value) && (
                                                <Check className="h-4 w-4" />
                                            )}
                                        </div>
                                    </DropdownMenuCheckboxItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
                        <Button variant="outline" size="sm" onClick={handleExport} disabled={isExporting}>
                            {isExporting ? (
                                <>
                                    <svg className="animate-spin h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                                    </svg>
                                    {exportMessage}
                                </>
                            ) : (
                                <>
                                    <Download className="mr-2 h-4 w-4" />
                                    Export
                                </>
                            )}
                        </Button>
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={() => setIsMobileFilterExpanded(true)}
                            className="md:hidden"
                        >
                            <Filter className="h-4 w-4" />
                        </Button>
                    </div>
                </div>

                {isDesktopFilterExpanded && (
                    <Card className="mb-6 hidden md:block">
                        <CardContent className="p-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                {renderFilterInput('storeName', 'Shop Name', <User className="h-4 w-4" />, false)}
                                {renderFilterInput('ownerName', 'Owner Name', <User className="h-4 w-4" />, false)}
                                {renderFilterInput('city', 'City', <Home className="h-4 w-4" />, false)}
                                {renderFilterInput('state', 'State', <Home className="h-4 w-4" />, false)}
                                {renderFilterInput('primaryContact', 'Phone', <Phone className="h-4 w-4" />, false)}
                                {renderFilterInput('clientType', 'Client Type', <Target className="h-4 w-4" />, false)}
                                <div className="space-y-1">
                                    <Label className="sr-only">Field Officer</Label>
                                    <SearchableSelect
                                        options={employeeOptions}
                                        value={selectedEmployeeId}
                                        onSelect={handleDesktopEmployeeSelect}
                                        placeholder="Field Officer"
                                        loading={isLoadingEmployees}
                                        triggerClassName="w-full justify-between h-9"
                                        contentClassName="w-[var(--radix-popover-trigger-width)]"
                                        searchPlaceholder="Search employees..."
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {isManager && (
                    <div className="mb-4">
                        <h2 className="text-xl font-semibold">Team Customers</h2>
                    </div>
                )}

                <Sheet open={isMobileFilterExpanded} onOpenChange={setIsMobileFilterExpanded}>
                    <SheetContent>
                        <SheetHeader>
                            <SheetTitle>Customer Filters</SheetTitle>
                        </SheetHeader>
                        <div className="py-4 space-y-4">
                            {renderFilterInput('storeName', 'Shop Name', <User className="h-4 w-4" />, true)}
                            {renderFilterInput('ownerName', 'Owner Name', <User className="h-4 w-4" />, true)}
                            {renderFilterInput('city', 'City', <Home className="h-4 w-4" />, true)}
                            {renderFilterInput('state', 'State', <Home className="h-4 w-4" />, true)}
                            {renderFilterInput('primaryContact', 'Phone', <Phone className="h-4 w-4" />, true)}
                            {renderFilterInput('clientType', 'Client Type', <Target className="h-4 w-4" />, true)}
                            <div className="space-y-1">
                                <Label className="sr-only">Field Officer</Label>
                                <SearchableSelect
                                    options={employeeOptions}
                                    value={mobileSelectedEmployeeId}
                                    onSelect={handleMobileEmployeeSelect}
                                    placeholder="Field Officer"
                                    loading={isLoadingEmployees}
                                    triggerClassName="w-full justify-between h-11"
                                    contentClassName="w-[var(--radix-popover-trigger-width)]"
                                    searchPlaceholder="Search employees..."
                                />
                            </div>
                        </div>
                        <SheetFooter className="flex gap-2">
                            <Button variant="outline" onClick={clearAllFilters}>Clear All</Button>
                            <Button onClick={applyMobileFilters}>Apply Filters</Button>
                        </SheetFooter>
                    </SheetContent>
                </Sheet>

                {/* Mobile view - Cards for managers/field officers, table for admins */}
                <div className="md:hidden space-y-4">
                    {isLoading || !isRoleDetermined ? (
                        <>
                            {[...Array(5)].map((_, index) => (
                                <Card key={`mobile-skeleton-${index}`} className="overflow-hidden">
                                    <CardHeader className="pb-2">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center space-x-3">
                                                <Skeleton className="h-12 w-12 rounded-full" />
                                                <div className="space-y-2">
                                                    <Skeleton className="h-4 w-40" />
                                                    <Skeleton className="h-3 w-24" />
                                                </div>
                                            </div>
                                            <Skeleton className="h-6 w-16" />
                                        </div>
                                    </CardHeader>
                                    <CardContent className="pt-2">
                                        <div className="flex items-center justify-between">
                                            <Skeleton className="h-4 w-32" />
                                            <Skeleton className="h-8 w-8" />
                                        </div>
                                        <div className="mt-4 flex justify-end">
                                            <Skeleton className="h-8 w-20" />
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </>
                    ) : (
                        customers.map((customer: Customer, index: number) => (
                            <Card key={`mobile-customer-${customer.storeId}-${index}`} className="overflow-hidden">
                                <CardHeader className="pb-2">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-3">
                                            <Avatar>
                                                <AvatarImage src={`https://source.boringavatars.com/beam/120/${customer.clientFirstName}${customer.clientLastName}?colors=264653,2a9d8f,e9c46a,f4a261,e76f51`} />
                                                <AvatarFallback>{getInitials(customer.clientFirstName, customer.clientLastName)}</AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <CardTitle className="text-lg">{customer.storeName}</CardTitle>
                                                <p className="text-sm text-gray-500">{customer.city}, {customer.state}</p>
                                            </div>
                                        </div>
                                        {customer.clientType && (
                                            <Badge variant="outline">
                                                {customer.clientType}
                                            </Badge>
                                        )}
                                    </div>
                                </CardHeader>
                                <CardContent className="pt-2">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-2">
                                            <User className="text-blue-500" />
                                            <span className="font-medium">Owner:</span>
                                            <span>{customer.clientFirstName} {customer.clientLastName}</span>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => toggleCardExpansion(customer.storeId)}
                                        >
                                            {expandedCards.includes(customer.storeId) ? (
                                                <ChevronUp className="h-4 w-4" />
                                            ) : (
                                                <ChevronDown className="h-4 w-4" />
                                            )}
                                        </Button>
                                    </div>

                                    {expandedCards.includes(customer.storeId) && (
                                        <div className="mt-4 space-y-3 text-sm">
                                            <div className="flex items-center space-x-2">
                                                <Phone className="text-green-500" />
                                                <span className="font-medium">Phone:</span>
                                                <span>{customer.primaryContact}</span>
                                            </div>
                                            {customer.monthlySale && (
                                                <div className="flex items-center space-x-2">
                                                    <DollarSign className="text-yellow-500" />
                                                    <span className="font-medium">Monthly Sales:</span>
                                                    <span>{customer.monthlySale.toLocaleString()} tonnes</span>
                                                </div>
                                            )}
                                            {customer.intent && (
                                                <div className="flex items-center space-x-2">
                                                    <Target className="text-red-500" />
                                                    <span className="font-medium">Intent:</span>
                                                    <span>{customer.intent}</span>
                                                </div>
                                            )}
                                            {customer.employeeName && (
                                                <div className="flex items-center space-x-2">
                                                    <Briefcase className="text-purple-500" />
                                                    <span className="font-medium">Field Officer:</span>
                                                    <span>{customer.employeeName}</span>
                                                </div>
                                            )}
                                            <div className="flex items-center space-x-2">
                                                <User className="text-indigo-500" />
                                                <span className="font-medium">Total Visits:</span>
                                                <span>{customer.totalVisitCount}</span>
                                            </div>
                                        </div>
                                    )}

                                    <div className="mt-4 flex justify-end items-center">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="sm">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem
                                                    onSelect={() => {
                                                        router.push(`/dashboard/customers/${customer.storeId}`);
                                                    }}
                                                >
                                                    View
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem onSelect={() => openDeleteModal(customer.storeId.toString())}>
                                                    Delete
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    )}
                </div>

                <div className="hidden md:block">
                    <Table className="text-sm font-poppins">
                        <TableHeader>
                            <TableRow>
                                {selectedColumns.includes('shopName') && (
                                    <TableHead className="cursor-pointer" onClick={() => handleSort('storeName')}>
                                        Shop Name
                                        {sortColumn === 'storeName' && (
                                            <span className="text-black text-sm">{sortDirection === 'asc' ? ' ▲' : ' ▼'}</span>
                                        )}
                                    </TableHead>
                                )}
                                {selectedColumns.includes('ownerName') && (
                                    <TableHead className="cursor-pointer" onClick={() => handleSort('ownerName')}>
                                        Owner Name
                                        {sortColumn === 'ownerFirstName' && (
                                            <span className="text-black text-sm">{sortDirection === 'asc' ? ' ▲' : ' ▼'}</span>
                                        )}
                                    </TableHead>
                                )}
                                {selectedColumns.includes('city') && (
                                    <TableHead className="cursor-pointer" onClick={() => handleSort('city')}>
                                        City
                                        {sortColumn === 'city' && (
                                            <span className="text-black text-sm">{sortDirection === 'asc' ? ' ▲' : ' ▼'}</span>
                                        )}
                                    </TableHead>
                                )}
                                {selectedColumns.includes('state') && (
                                    <TableHead className="cursor-pointer" onClick={() => handleSort('state')}>
                                        State
                                        {sortColumn === 'state' && (
                                            <span className="text-black text-sm">{sortDirection === 'asc' ? ' ▲' : ' ▼'}</span>
                                        )}
                                    </TableHead>
                                )}
                                {selectedColumns.includes('phone') && (
                                    <TableHead className="cursor-pointer" onClick={() => handleSort('primaryContact')}>
                                        Phone
                                        {sortColumn === 'primaryContact' && (
                                            <span className="text-black text-sm">{sortDirection === 'asc' ? ' ▲' : ' ▼'}</span>
                                        )}
                                    </TableHead>
                                )}
                                {selectedColumns.includes('monthlySales') && (
                                    <TableHead className="cursor-pointer" onClick={() => handleSort('monthlySale')}>
                                        Monthly Sales
                                        {sortColumn === 'monthlySale' && (
                                            <span className="text-black text-sm">{sortDirection === 'asc' ? ' ▲' : ' ▼'}</span>
                                        )}
                                    </TableHead>
                                )}
                                {selectedColumns.includes('intentLevel') && (
                                    <TableHead className="cursor-pointer" onClick={() => handleSort('intent')}>
                                        Intent Level
                                        {sortColumn === 'intent' && (
                                            <span className="text-black text-sm">{sortDirection === 'asc' ? ' ▲' : ' ▼'}</span>
                                        )}
                                    </TableHead>
                                )}
                                {selectedColumns.includes('fieldOfficer') && (
                                    <TableHead className="cursor-pointer" onClick={() => handleSort('employeeName')}>
                                        Field Officer
                                        {sortColumn === 'employeeName' && (
                                            <span className="text-black text-sm">{sortDirection === 'asc' ? ' ▲' : ' ▼'}</span>
                                        )}
                                    </TableHead>
                                )}
                                {selectedColumns.includes('clientType') && (
                                    <TableHead className="cursor-pointer" onClick={() => handleSort('clientType')}>
                                        Client Type
                                        {sortColumn === 'clientType' && (
                                            <span className="text-black text-sm">{sortDirection === 'asc' ? ' ▲' : ' ▼'}</span>
                                        )}
                                    </TableHead>
                                )}
                                {selectedColumns.includes('totalVisits') && (
                                    <TableHead className="cursor-pointer" onClick={() => handleSort('totalVisits')}>
                                        Total Visits
                                        {sortColumn === 'visitCount' && (
                                            <span className="text-black text-sm">{sortDirection === 'asc' ? ' ▲' : ' ▼'}</span>
                                        )}
                                    </TableHead>
                                )}
                                {selectedColumns.includes('lastVisitDate') && (
                                    <TableHead className="cursor-pointer" onClick={() => handleSort('lastVisitDate')}>
                                        Last Visit Date
                                        {sortColumn === 'lastVisitDate' && (
                                            <span className="text-black text-sm">{sortDirection === 'asc' ? ' ▲' : ' ▼'}</span>
                                        )}
                                    </TableHead>
                                )}
                                <TableHead className="w-20">Actions</TableHead>
                            </TableRow>
                        </TableHeader>

                        <TableBody>
                            {isLoading || !isRoleDetermined ? (
                                <>
                                    {[...Array(5)].map((_, index) => (
                                        <TableRow key={`skeleton-${index}`}>
                                            {selectedColumns.includes('shopName') && (
                                                <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                                            )}
                                            {selectedColumns.includes('ownerName') && (
                                                <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                                            )}
                                            {selectedColumns.includes('city') && (
                                                <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                                            )}
                                            {selectedColumns.includes('state') && (
                                                <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                                            )}
                                            {selectedColumns.includes('phone') && (
                                                <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                                            )}
                                            {selectedColumns.includes('monthlySales') && (
                                                <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                                            )}
                                            {selectedColumns.includes('intentLevel') && (
                                                <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                                            )}
                                            {selectedColumns.includes('fieldOfficer') && (
                                                <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                                            )}
                                            {selectedColumns.includes('clientType') && (
                                                <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                                            )}
                                            {selectedColumns.includes('totalVisits') && (
                                                <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                                            )}
                                            {selectedColumns.includes('lastVisitDate') && (
                                                <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                                            )}
                                            <TableCell className="w-20">
                                                <Skeleton className="h-8 w-8" />
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </>
                            ) : (
                                customers.map((customer: Customer, index: number) => (
                                    <TableRow key={`customer-${customer.storeId}-${index}`}>
                                        {selectedColumns.includes('shopName') && <TableCell>{customer.storeName || ''}</TableCell>}
                                        {selectedColumns.includes('ownerName') && (
                                            <TableCell>
                                                {customer.clientFirstName || customer.clientLastName
                                                    ? `${customer.clientFirstName || ''} ${customer.clientLastName || ''}`.trim()
                                                    : ''}
                                            </TableCell>
                                        )}
                                        {selectedColumns.includes('city') && <TableCell>{customer.city || ''}</TableCell>}
                                        {selectedColumns.includes('state') && <TableCell>{customer.state || ''}</TableCell>}
                                        {selectedColumns.includes('phone') && <TableCell>{customer.primaryContact || ''}</TableCell>}
                                        {selectedColumns.includes('monthlySales') && (
                                            <TableCell>
                                                {customer.monthlySale !== null && customer.monthlySale !== undefined
                                                    ? `${customer.monthlySale.toLocaleString()} tonnes`
                                                    : ''}
                                            </TableCell>
                                        )}
                                        {selectedColumns.includes('intentLevel') && (
                                            <TableCell>{customer.intent !== null && customer.intent !== undefined ? customer.intent : ''}</TableCell>
                                        )}
                                        {selectedColumns.includes('fieldOfficer') && <TableCell>{customer.employeeName || ''}</TableCell>}
                                        {selectedColumns.includes('clientType') && (
                                            <TableCell>
                                                <Badge variant="outline">
                                                    {customer.clientType || ''}
                                                </Badge>
                                            </TableCell>
                                        )}
                                        {selectedColumns.includes('totalVisits') && <TableCell>{customer.totalVisitCount}</TableCell>}
                                        {selectedColumns.includes('lastVisitDate') && (
                                            <TableCell>
                                                {customer.lastVisitDate
                                                    ? formatDateToUserFriendly(customer.lastVisitDate)
                                                    : ''}
                                            </TableCell>
                                        )}
                                        <TableCell className="w-20">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="sm">
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem
                                                        onSelect={() => {
                                                            router.push(`/dashboard/customers/${customer.storeId}`);
                                                        }}
                                                    >
                                                        View
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem onSelect={() => openDeleteModal(customer.storeId.toString())}>
                                                        Delete
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>

                {isRoleDetermined && customers.length > 0 && renderPagination()}

                {/* Simple delete confirmation modal */}
                {isDeleteModalOpen && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4">
                            <h3 className="text-lg font-semibold mb-4">Confirm Delete</h3>
                            <p className="text-gray-600 mb-6">Are you sure you want to delete this customer? This action cannot be undone.</p>
                            <div className="flex justify-end space-x-3">
                                <Button variant="outline" onClick={closeDeleteModal}>
                                    Cancel
                                </Button>
                                <Button variant="destructive" onClick={handleDeleteConfirm}>
                                    Delete
                                </Button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Add Customer Modal */}
                <AddCustomerModal
                    isOpen={isModalOpen}
                    onClose={closeModal}
                    token={token || ''}
                    employeeId={employeeId ? Number(employeeId) : null}
                    onCustomerAdded={handleCustomerAdded}
                    userRole={userRoleFromAPI || undefined}
                    userData={userData ? (userData as unknown as Record<string, unknown>) : undefined}
                />
            </div>
    </div>
  );
}
