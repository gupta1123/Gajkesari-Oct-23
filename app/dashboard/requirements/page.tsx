'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import ReactSelect, { type SingleValue, type StylesConfig } from 'react-select';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth-provider';
import { API, type TeamDataDto } from '@/lib/api';
import { hasManagerPrivileges } from '@/lib/auth';
import { getEmployeeRoleCategory } from '@/lib/employee-role';
import { getTeamIds, getUniqueFieldOfficersFromTeams } from '@/lib/team-access';
import { sortBy } from 'lodash';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SearchableSelectOption } from '@/components/ui/searchable-select';
import { SpacedCalendar } from '@/components/ui/spaced-calendar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { CalendarIcon, MoreHorizontal, PlusCircle, Search, Filter, Clock, User, Building, MapPin, AlertTriangle, Loader, Trash2, Calendar as CalendarIcon2, ChevronLeft, ChevronRight, Check, ChevronsUpDown } from 'lucide-react';
import { DateRangeError, isDateRangeInvalid } from '@/components/date-range-error';

const API_BASE_URL = 'https://api.gajkesaristeels.in';

interface Task {
    id: number;
    taskTitle: string;
    taskDesciption: string;
    dueDate: string;
    assignedToId: number;
    assignedToName: string;
    assignedById: number;
    status: string;
    priority: string;
    category: string;
    storeId: number;
    storeName: string;
    storeCity: string;
    taskType: string;
}

interface Employee {
    id: number;
    firstName: string;
    lastName: string;
    role: string;
}

interface Store {
    id: number;
    storeName: string;
}

const Requirements = () => {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [newTask, setNewTask] = useState<Task>({
        id: 0,
        taskTitle: '',
        taskDesciption: '',
        dueDate: '',
        assignedToId: 0,
        assignedToName: '',
        assignedById: 0,
        status: 'Assigned',
        priority: 'low',
        category: 'Requirement',
        storeId: 0,
        storeName: '',
        storeCity: '',
        taskType: 'requirement'
    });
    const router = useRouter();
    const FILTER_STATE_KEY = 'requirements.filters.v1';
    const [isFiltersHydrated, setIsFiltersHydrated] = useState(false);
    const [activeTab, setActiveTab] = useState('general');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDatePopoverOpen, setIsDatePopoverOpen] = useState(false);
    const [isStartDatePopoverOpen, setIsStartDatePopoverOpen] = useState(false);
    const [isEndDatePopoverOpen, setIsEndDatePopoverOpen] = useState(false);
    const [isFilterStartDatePopoverOpen, setIsFilterStartDatePopoverOpen] = useState(false);
    const [isFilterEndDatePopoverOpen, setIsFilterEndDatePopoverOpen] = useState(false);
    const [currentPage, setCurrentPage] = useState(0);
    const [pageSize, setPageSize] = useState(10);
    const [filters, setFilters] = useState({
        employee: '',
        priority: '',
        status: '',
        search: '',
        startDate: format(new Date(), 'yyyy-MM-dd'),
        endDate: format(new Date(), 'yyyy-MM-dd')
    });
    const [isLoading, setIsLoading] = useState(true);
    const [allEmployees, setAllEmployees] = useState<Employee[]>([]);
    const [filterEmployees, setFilterEmployees] = useState<{ id: number; name: string }[]>([]);
    const [stores, setStores] = useState<Store[]>([]);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
    const [selectedStatus, setSelectedStatus] = useState<string>('');
    const [teamId, setTeamId] = useState<number | null>(null);
    const [teamIds, setTeamIds] = useState<number[]>([]);
    const [isManager, setIsManager] = useState(false);
    const dateRangeInvalid = !isManager && isDateRangeInvalid(filters.startDate, filters.endDate);
    const [teamMembers, setTeamMembers] = useState<Employee[]>([]);
    const [isTabLoading, setIsTabLoading] = useState(false);
    const [isStoresLoading, setIsStoresLoading] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [updatingTaskFields, setUpdatingTaskFields] = useState<Set<string>>(new Set());
    
    // SearchableSelect state variables
    const [selectedStore, setSelectedStore] = useState<string[]>([]);
    const [employeeOptions, setEmployeeOptions] = useState<SearchableSelectOption[]>([]);
    const [storeOptions, setStoreOptions] = useState<SearchableSelectOption[]>([]);
    const [isAssignPopoverOpen, setIsAssignPopoverOpen] = useState(false);
    const [assignSearchTerm, setAssignSearchTerm] = useState("");
    const [filterEmployeeSearch, setFilterEmployeeSearch] = useState("");
    const [filterEmployeePopoverOpen, setFilterEmployeePopoverOpen] = useState(false);

    const statusOptions = ['Assigned', 'Work In Progress', 'Complete'] as const;

    const { token, userRole, userData, currentUser } = useAuth();

    useEffect(() => {
        const checkUserRole = () => {
            const isManagerRole = hasManagerPrivileges(userRole, currentUser);
            setIsManager(isManagerRole);
        };
        checkUserRole();
    }, [userRole, currentUser]);

    useEffect(() => {
        const loadTeamData = async () => {
            if (!isManager || !userData?.employeeId) return;
            
            try {
                const teamData: TeamDataDto[] = await API.getTeamByEmployee(userData.employeeId);
                
                if (teamData && teamData.length > 0) {
                    const accessibleTeamIds = getTeamIds(teamData);
                    setTeamIds(accessibleTeamIds);
                    setTeamId(accessibleTeamIds[0] ?? null);

                    const teamMemberIds = new Set(getUniqueFieldOfficersFromTeams(teamData).map((fo) => fo.id));
                    const filteredTeamMembers = allEmployees.filter((emp) => teamMemberIds.has(emp.id));
                    setTeamMembers(filteredTeamMembers);
                } else {
                    setTeamId(null);
                    setTeamIds([]);
                    setTeamMembers([]);
                    setErrorMessage('No team data found for this manager');
                }
            } catch (err) {
                console.error('Failed to load team data:', err);
                setTeamId(null);
                setTeamIds([]);
                setTeamMembers([]);
                setErrorMessage('Failed to load team data');
            }
        };
        
        if (isManager && userData?.employeeId && allEmployees.length > 0) {
            loadTeamData();
        }
    }, [isManager, userData?.employeeId, allEmployees]);

    useEffect(() => {
        if (errorMessage) {
            const timer = setTimeout(() => {
                setErrorMessage(null);
            }, 20000);
            return () => clearTimeout(timer);
        }
    }, [errorMessage]);

    const formatDateForFilter = (date: Date | undefined): string => {
        if (!date) return '';
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const handleDateChange = (key: string, value: string) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    const handleNext = () => {
        setIsTabLoading(true);
        setTimeout(() => {
            setActiveTab('details');
            setIsTabLoading(false);
        }, 500);
    };

    const handleBack = () => {
        setActiveTab('general');
    };

    const handleViewStore = (storeId: number) => {
        try {
            sessionStorage.setItem('nav.return.to', JSON.stringify({ page: 'requirements' }));
        } catch {}
        router.push(`/dashboard/customers/${storeId}`);
    };

    const fetchTasks = useCallback(async () => {
        if (!token) return;
        if (dateRangeInvalid) {
            setIsLoading(false);
            return;
        }
        
        if (isManager && teamIds.length === 0) {
            return;
        }
        
        setIsLoading(true);
        try {
            let url: string;
            
            if (isManager) {
                const responses = await Promise.all(teamIds.map((id) =>
                    fetch(`${API_BASE_URL}/task/getByTeam?id=${id}`, {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                    })
                ));

                const failedResponse = responses.find((response) => !response.ok);
                if (failedResponse) {
                    const errorText = await failedResponse.text();
                    throw new Error(`API request failed: ${failedResponse.status} ${errorText}`);
                }

                const payloads = await Promise.all(responses.map((response) => response.json()));
                const uniqueTasks = new Map<number, Record<string, unknown>>();
                payloads.flatMap((payload) => Array.isArray(payload) ? payload : []).forEach((task) => {
                    uniqueTasks.set(Number(task.id) || uniqueTasks.size, task);
                });
                const data = Array.from(uniqueTasks.values());
                const tasksArray = data
                    .filter((task: Record<string, unknown>) => task.taskType === 'requirement')
                    .map((task: Record<string, unknown>) => ({
                        id: Number(task.id) || 0,
                        taskTitle: String(task.taskTitle || ''),
                        taskDesciption: String(task.taskDesciption || task.taskDescription || ''),
                        dueDate: String(task.dueDate || ''),
                        assignedToId: Number(task.assignedToId) || 0,
                        assignedToName: String(task.assignedToName || 'Unknown'),
                        assignedById: Number(task.assignedById) || 0,
                        status: String(task.status || ''),
                        priority: String(task.priority || ''),
                        category: String(task.category || ''),
                        storeId: Number(task.storeId) || 0,
                        storeName: String(task.storeName || ''),
                        storeCity: String(task.storeCity || ''),
                        taskType: String(task.taskType || ''),
                    } as Task))
                    .sort((a: Task, b: Task) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime());

                setTasks(tasksArray);
                setIsLoading(false);
                return;
            } else {
                const formattedStartDate = format(new Date(filters.startDate), 'yyyy-MM-dd');
                const formattedEndDate = format(new Date(filters.endDate), 'yyyy-MM-dd');
                url = `${API_BASE_URL}/task/getByDate?start=${formattedStartDate}&end=${formattedEndDate}`;
            }

            const response = await fetch(url, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`API request failed: ${response.status} ${errorText}`);
            }

            const data = await response.json();

            const tasksArray = (Array.isArray(data) ? data : [])
                .filter((task: Record<string, unknown>) => task.taskType === 'requirement')
                .map((task: Record<string, unknown>) => ({
                    id: Number(task.id) || 0,
                    taskTitle: String(task.taskTitle || ''),
                    taskDesciption: String(task.taskDesciption || task.taskDescription || ''),
                    dueDate: String(task.dueDate || ''),
                    assignedToId: Number(task.assignedToId) || 0,
                    assignedToName: String(task.assignedToName || 'Unknown'),
                    assignedById: Number(task.assignedById) || 0,
                    status: String(task.status || ''),
                    priority: String(task.priority || ''),
                    category: String(task.category || ''),
                    storeId: Number(task.storeId) || 0,
                    storeName: String(task.storeName || ''),
                    storeCity: String(task.storeCity || ''),
                    taskType: String(task.taskType || ''),
                } as Task))
                .sort((a: Task, b: Task) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime());

            setTasks(tasksArray);
            setIsLoading(false);
        } catch (error) {
            console.error('Error fetching tasks:', error);
            setIsLoading(false);
        }
    }, [token, isManager, teamIds, filters.startDate, filters.endDate, dateRangeInvalid]);

    const fetchEmployees = useCallback(async () => {
        if (!token) return;
        
        try {
            const data = await API.getAllEmployees();
            const sortedEmployees = sortBy(data, (emp: Employee) => `${emp.firstName} ${emp.lastName}`);
            setAllEmployees(sortedEmployees);
        } catch (error) {
            console.error('Error fetching employees:', error);
        }
    }, [token]);

    const fetchStores = useCallback(async () => {
        if (!token) return;
        
        setIsStoresLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/store/names`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            const data = await response.json();
            setStores(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Error fetching stores:', error);
        } finally {
            setIsStoresLoading(false);
        }
    }, [token]);

    useEffect(() => {
        try {
            const raw = sessionStorage.getItem(FILTER_STATE_KEY);
            if (raw) {
                const saved = JSON.parse(raw);
                if (saved?.filters) setFilters((prev) => ({ ...prev, ...saved.filters, search: '' }));
                if (typeof saved?.currentPage === 'number') setCurrentPage(saved.currentPage);
                if (typeof saved?.pageSize === 'number') setPageSize(saved.pageSize);
            }
        } catch {}
        setIsFiltersHydrated(true);
    }, []);

    useEffect(() => {
        if (!isFiltersHydrated) return;
        try {
            sessionStorage.setItem(
                FILTER_STATE_KEY,
                JSON.stringify({ filters, currentPage, pageSize })
            );
        } catch {}
    }, [filters, currentPage, pageSize, isFiltersHydrated]);

    useEffect(() => {
        if (!isFiltersHydrated) return;
        fetchTasks();
    }, [fetchTasks, teamId, isFiltersHydrated]);

    useEffect(() => {
        setCurrentPage(0);
    }, [filters]);

    useEffect(() => {
        fetchEmployees();
    }, [fetchEmployees]);

    const assignmentEmployees = useMemo(() => (
        (isManager ? teamMembers : allEmployees).filter(
            (employee) => getEmployeeRoleCategory(employee.role) !== 'admin'
        )
    ), [isManager, teamMembers, allEmployees]);

    useEffect(() => {
        if (isModalOpen) {
            fetchStores();
        }
    }, [isModalOpen, fetchStores]);

    useEffect(() => {
        const directoryEmployees = allEmployees
            .filter((employee) => {
                const category = getEmployeeRoleCategory(employee.role);
                return category === 'field-officer' || category === 'regional-manager';
            })
            .map((employee) => ({
                id: employee.id,
                name: `${employee.firstName} ${employee.lastName}`.trim(),
            }));

        setFilterEmployees(sortBy(directoryEmployees, 'name'));
    }, [allEmployees]);

    useEffect(() => {
        const options = assignmentEmployees.map(emp => ({
            value: emp.id.toString(),
            label: `${emp.firstName} ${emp.lastName}`
        })).sort((a, b) => a.label.localeCompare(b.label));
        setEmployeeOptions(options);
    }, [assignmentEmployees]);

    useEffect(() => {
        const options = stores.map(store => ({
            value: store.id.toString(),
            label: store.storeName
        })).sort((a, b) => a.label.localeCompare(b.label));
        setStoreOptions(options);
    }, [stores]);

    const selectedStoreOption = useMemo(
        () => storeOptions.find((option) => option.value === selectedStore[0]) ?? null,
        [selectedStore, storeOptions]
    );

    const storeSelectStyles: StylesConfig<SearchableSelectOption, false> = {
        control: (base, state) => ({
            ...base,
            minHeight: 40,
            borderRadius: 6,
            backgroundColor: 'hsl(var(--background))',
            borderColor: state.isFocused ? 'hsl(var(--ring))' : 'hsl(var(--input))',
            boxShadow: state.isFocused ? '0 0 0 1px hsl(var(--ring))' : 'none',
            '&:hover': {
                borderColor: state.isFocused ? 'hsl(var(--ring))' : 'hsl(var(--input))',
            },
        }),
        valueContainer: (base) => ({ ...base, paddingLeft: 12, paddingRight: 8 }),
        singleValue: (base) => ({ ...base, color: 'hsl(var(--foreground))' }),
        placeholder: (base) => ({ ...base, color: 'hsl(var(--muted-foreground))' }),
        input: (base) => ({ ...base, color: 'hsl(var(--foreground))' }),
        indicatorSeparator: (base) => ({ ...base, backgroundColor: 'hsl(var(--border))' }),
        dropdownIndicator: (base) => ({
            ...base,
            color: 'hsl(var(--muted-foreground))',
            '&:hover': { color: 'hsl(var(--foreground))' },
        }),
        menu: (base) => ({
            ...base,
            backgroundColor: 'hsl(var(--popover))',
            borderColor: 'hsl(var(--border))',
            borderWidth: 1,
            borderRadius: 6,
            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
            zIndex: 60,
        }),
        menuList: (base) => ({
            ...base,
            padding: 4,
        }),
        option: (base, state) => ({
            ...base,
            borderRadius: 4,
            fontSize: '0.875rem',
            backgroundColor: state.isSelected
                ? 'hsl(var(--primary))'
                : state.isFocused
                ? 'hsl(var(--accent))'
                : 'transparent',
            color: state.isSelected
                ? 'hsl(var(--primary-foreground))'
                : state.isFocused
                ? 'hsl(var(--accent-foreground))'
                : 'hsl(var(--foreground))',
            cursor: 'pointer',
        }),
    };

    const handleFilterChange = (key: string, value: string) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    const applyFilters = useCallback(() => {
        let result = tasks;

        if (filters.employee && filters.employee !== 'all') {
            result = result.filter(task => task.assignedToId === parseInt(filters.employee));
        }

        if (filters.priority && filters.priority !== 'all') {
            result = result.filter(task => task.priority.toLowerCase() === filters.priority.toLowerCase());
        }

        if (filters.status && filters.status !== 'all') {
            result = result.filter(task => task.status.toLowerCase() === filters.status.toLowerCase());
        }

        if (filters.search) {
            const searchTerm = filters.search.toLowerCase();
            result = result.filter(task => 
                task.taskTitle.toLowerCase().includes(searchTerm) ||
                task.taskDesciption.toLowerCase().includes(searchTerm) ||
                task.storeName.toLowerCase().includes(searchTerm) ||
                task.assignedToName.toLowerCase().includes(searchTerm)
            );
        }

        return result;
    }, [tasks, filters]);

    const filteredTasksMemo = useMemo(() => applyFilters(), [applyFilters]);

    const totalElements = filteredTasksMemo.length;
    const totalPages = Math.ceil(totalElements / pageSize);

    const paginatedTasks = useMemo(() => {
        const startIndex = currentPage * pageSize;
        return filteredTasksMemo.slice(startIndex, startIndex + pageSize);
    }, [filteredTasksMemo, currentPage, pageSize]);

    const createTask = async () => {
        if (!token) return;
        
        setIsCreating(true);
        try {
            const payload = {
                ...newTask,
                taskType: 'requirement',
                assignedById: userData?.employeeId || 0
            };

            const response = await fetch(`${API_BASE_URL}/task/create`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to create task: ${response.status} ${errorText}`);
            }

            setIsModalOpen(false);
            setNewTask({
                id: 0,
                taskTitle: '',
                taskDesciption: '',
                dueDate: '',
                assignedToId: 0,
                assignedToName: '',
                assignedById: 0,
                status: 'Assigned',
                priority: 'low',
                category: 'Requirement',
                storeId: 0,
                storeName: '',
                storeCity: '',
                taskType: 'requirement'
            });
            setSelectedStore([]);
            setActiveTab('general');
            fetchTasks();
        } catch (error) {
            console.error('Error creating requirement:', error);
            setErrorMessage('Failed to create requirement. Please check required fields.');
        } finally {
            setIsCreating(false);
        }
    };

    const deleteTask = async (id: number) => {
        if (!token) return;

        try {
            const response = await fetch(`${API_BASE_URL}/task/delete?id=${id}`, {
                method: 'DELETE',
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                throw new Error('Failed to delete requirement');
            }

            setTasks(prev => prev.filter(t => t.id !== id));
        } catch (error) {
            console.error('Error deleting requirement:', error);
        }
    };

    const updateTaskField = async (taskId: number, field: 'status' | 'priority', value: string) => {
        if (!token) return;

        const fieldKey = `${taskId}-${field}`;
        setUpdatingTaskFields(prev => new Set(prev).add(fieldKey));

        try {
            const targetTask = tasks.find(t => t.id === taskId);
            if (!targetTask) return;

            const payload = {
                ...targetTask,
                [field]: value
            };

            const response = await fetch(`${API_BASE_URL}/task/edit?id=${taskId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                throw new Error(`Failed to update requirement ${field}`);
            }

            setTasks(prev => prev.map(t => t.id === taskId ? { ...t, [field]: value } : t));
        } catch (error) {
            console.error(`Error updating requirement ${field}:`, error);
        } finally {
            setUpdatingTaskFields(prev => {
                const next = new Set(prev);
                next.delete(fieldKey);
                return next;
            });
        }
    };

    const confirmStatusUpdate = async () => {
        if (selectedTask && selectedStatus) {
            await updateTaskField(selectedTask.id, 'status', selectedStatus);
            setIsStatusModalOpen(false);
            setSelectedTask(null);
            setSelectedStatus('');
        }
    };

    const closeCreateModal = () => {
        setIsModalOpen(false);
        setActiveTab('general');
        setNewTask({
            id: 0,
            taskTitle: '',
            taskDesciption: '',
            dueDate: '',
            assignedToId: 0,
            assignedToName: '',
            assignedById: 0,
            status: 'Assigned',
            priority: 'low',
            category: 'Requirement',
            storeId: 0,
            storeName: '',
            storeCity: '',
            taskType: 'requirement'
        });
        setSelectedStore([]);
    };

    const closeStatusModal = () => {
        setIsStatusModalOpen(false);
        setSelectedTask(null);
        setSelectedStatus('');
    };

    const handleEmployeeSelect = (value: string) => {
        const empId = parseInt(value);
        const emp = assignmentEmployees.find(e => e.id === empId);
        setNewTask(prev => ({
            ...prev,
            assignedToId: empId,
            assignedToName: emp ? `${emp.firstName} ${emp.lastName}` : ''
        }));
        setIsAssignPopoverOpen(false);
        setAssignSearchTerm('');
    };

    const handleStoreOptionSelect = (option: SingleValue<SearchableSelectOption>) => {
        if (option) {
            const stId = parseInt(option.value);
            const st = stores.find(s => s.id === stId);
            setSelectedStore([option.value]);
            setNewTask(prev => ({
                ...prev,
                storeId: stId,
                storeName: st?.storeName || option.label
            }));
        } else {
            setSelectedStore([]);
            setNewTask(prev => ({
                ...prev,
                storeId: 0,
                storeName: ''
            }));
        }
    };

    const getStatusInfo = (status: string) => {
        switch (status) {
            case 'Complete':
                return { label: 'Complete', color: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300' };
            case 'Work In Progress':
                return { label: 'Work In Progress', color: 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-300' };
            default:
                return { label: 'Assigned', color: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300' };
        }
    };

    const selectedFilterEmployeeLabel = useMemo(() => {
        if (!filters.employee || filters.employee === 'all') return 'All employees';
        const found = filterEmployees.find(e => e.id.toString() === filters.employee);
        return found ? found.name : 'All employees';
    }, [filters.employee, filterEmployees]);

    const filteredTopEmployeeOptions = useMemo(() => {
        const query = filterEmployeeSearch.trim().toLowerCase();
        if (!query) return filterEmployees;
        return filterEmployees.filter(e => e.name.toLowerCase().includes(query));
    }, [filterEmployees, filterEmployeeSearch]);

    const selectedAssignLabel = useMemo(() => {
        if (!newTask.assignedToId) return '';
        const found = employeeOptions.find(o => o.value === newTask.assignedToId.toString());
        return found ? found.label : '';
    }, [newTask.assignedToId, employeeOptions]);

    const filteredAssignEmployeeOptions = useMemo(() => {
        const query = assignSearchTerm.trim().toLowerCase();
        if (!query) return employeeOptions;
        return employeeOptions.filter(o => o.label.toLowerCase().includes(query));
    }, [employeeOptions, assignSearchTerm]);

    return (
        <div className="space-y-4 py-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="hidden flex-wrap items-center gap-2 lg:flex">
                    <div className="relative w-60 shrink-0">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            placeholder="Search requirement title, store..."
                            value={filters.search}
                            onChange={(e) => handleFilterChange('search', e.target.value)}
                            className="h-9 pl-9 pr-4 text-xs shadow-none"
                        />
                    </div>
                    <Popover open={filterEmployeePopoverOpen} onOpenChange={setFilterEmployeePopoverOpen}>
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                className="h-9 w-[170px] justify-between text-xs font-normal shadow-none"
                            >
                                <span className="truncate">{selectedFilterEmployeeLabel}</span>
                                <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[280px] p-0" align="start">
                            <div className="p-3 border-b">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                    <Input
                                        placeholder="Search employees..."
                                        value={filterEmployeeSearch}
                                        onChange={(event) => setFilterEmployeeSearch(event.target.value)}
                                        className="pl-9 text-xs"
                                    />
                                </div>
                            </div>
                            <div className="max-h-64 overflow-y-auto">
                                <button
                                    type="button"
                                    className={`flex w-full items-center justify-between px-4 py-2 text-xs ${
                                        filters.employee === '' || filters.employee === 'all'
                                            ? 'bg-primary/10 text-primary font-semibold'
                                            : 'hover:bg-muted/40'
                                    }`}
                                    onClick={() => {
                                        handleFilterChange('employee', 'all');
                                        setFilterEmployeePopoverOpen(false);
                                        setFilterEmployeeSearch('');
                                    }}
                                >
                                    <span>All employees</span>
                                    {(filters.employee === '' || filters.employee === 'all') && <Check className="h-4 w-4 text-primary" />}
                                </button>
                                {filteredTopEmployeeOptions.map((employee) => {
                                    const value = employee.id.toString();
                                    const isSelected = filters.employee === value;
                                    return (
                                        <button
                                            key={employee.id}
                                            type="button"
                                            className={`flex w-full items-center justify-between px-4 py-2 text-xs ${
                                                isSelected ? 'bg-primary/10 text-primary font-semibold' : 'hover:bg-muted/40'
                                            }`}
                                            onClick={() => {
                                                handleFilterChange('employee', value);
                                                setFilterEmployeePopoverOpen(false);
                                                setFilterEmployeeSearch('');
                                            }}
                                        >
                                            <span className="truncate text-left">{employee.name}</span>
                                            {isSelected && <Check className="h-4 w-4 text-primary" />}
                                        </button>
                                    );
                                })}
                            </div>
                        </PopoverContent>
                    </Popover>
                    <Select value={filters.priority} onValueChange={(value) => handleFilterChange('priority', value)}>
                        <SelectTrigger className="h-9 w-[150px] shrink-0 text-xs shadow-none">
                            <SelectValue placeholder="Filter by priority" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Priorities</SelectItem>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                        </SelectContent>
                    </Select>
                    <Select value={filters.status} onValueChange={(value) => handleFilterChange('status', value)}>
                        <SelectTrigger className="h-9 w-[140px] shrink-0 text-xs shadow-none">
                            <SelectValue placeholder="Filter by status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Open Statuses</SelectItem>
                            <SelectItem value="Assigned">Assigned</SelectItem>
                            <SelectItem value="Work In Progress">Work In Progress</SelectItem>
                            <SelectItem value="Complete">Complete</SelectItem>
                        </SelectContent>
                    </Select>
                    {!isManager && (
                        <div className="flex shrink-0 items-center gap-2">
                            <div>
                                <Label htmlFor="startDate" className="sr-only">From date</Label>
                                <Popover modal={false} open={isStartDatePopoverOpen} onOpenChange={setIsStartDatePopoverOpen}>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            className={`h-9 w-[165px] justify-start gap-2 overflow-hidden px-3 text-left text-xs font-normal shadow-none ${!filters.startDate && 'text-muted-foreground'}`}
                                        >
                                            <CalendarIcon className="h-3.5 w-3.5 shrink-0" />
                                            <span className="shrink-0 text-muted-foreground">From</span>
                                            <span className="min-w-0 truncate text-foreground">
                                                {filters.startDate ? format(new Date(filters.startDate), 'MMM dd, yyyy') : 'Pick date'}
                                            </span>
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start" side="bottom">
                                        <SpacedCalendar
                                            mode="single"
                                            selected={filters.startDate ? new Date(filters.startDate) : undefined}
                                            onSelect={(date) => {
                                                handleDateChange('startDate', formatDateForFilter(date));
                                                setIsStartDatePopoverOpen(false);
                                            }}
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>
                            <div>
                                <Label htmlFor="endDate" className="sr-only">To date</Label>
                                <Popover modal={false} open={isEndDatePopoverOpen} onOpenChange={setIsEndDatePopoverOpen}>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            className={`h-9 w-[165px] justify-start gap-2 overflow-hidden px-3 text-left text-xs font-normal shadow-none ${!filters.endDate && 'text-muted-foreground'}`}
                                        >
                                            <CalendarIcon className="h-3.5 w-3.5 shrink-0" />
                                            <span className="shrink-0 text-muted-foreground">To</span>
                                            <span className="min-w-0 truncate text-foreground">
                                                {filters.endDate ? format(new Date(filters.endDate), 'MMM dd, yyyy') : 'Pick date'}
                                            </span>
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start" side="bottom">
                                        <SpacedCalendar
                                            mode="single"
                                            selected={filters.endDate ? new Date(filters.endDate) : undefined}
                                            onSelect={(date) => {
                                                handleDateChange('endDate', formatDateForFilter(date));
                                                setIsEndDatePopoverOpen(false);
                                            }}
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>
                            <DateRangeError fromDate={filters.startDate} toDate={filters.endDate} className="w-full" />
                        </div>
                    )}
                </div>
                <div className="flex items-center gap-2 lg:ml-auto lg:shrink-0">
                    <Button variant="outline" size="sm" className="lg:hidden" onClick={() => setIsFilterDrawerOpen(true)}>
                        <Filter className="mr-2 h-4 w-4" />
                        Filters
                    </Button>
                    <Button size="sm" className="h-9 text-xs" onClick={() => setIsModalOpen(true)}>
                        <PlusCircle className="mr-2 h-4 w-4" /> New
                    </Button>
                </div>
            </div>

            <Dialog open={isModalOpen} onOpenChange={(open: boolean) => {
                if (open) setIsModalOpen(true);
                else closeCreateModal();
            }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Create New Requirement</DialogTitle>
                        <DialogDescription>Fill in the details to create a new requirement.</DialogDescription>
                    </DialogHeader>
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="general" disabled={isTabLoading}>General</TabsTrigger>
                            <TabsTrigger value="details" disabled={isTabLoading}>Details</TabsTrigger>
                        </TabsList>
                        <TabsContent value="general">
                            <div className="grid gap-4 py-2">
                                <div className="grid gap-2">
                                    <Label htmlFor="taskTitle">Requirement Title</Label>
                                    <Input
                                        id="taskTitle"
                                        placeholder="Enter requirement title"
                                        value={newTask.taskTitle}
                                        onChange={(e) => setNewTask({ ...newTask, taskTitle: e.target.value })}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="taskDesciption">Requirement Description</Label>
                                    <Input
                                        id="taskDesciption"
                                        placeholder="Enter requirement description"
                                        value={newTask.taskDesciption}
                                        onChange={(e) => setNewTask({ ...newTask, taskDesciption: e.target.value })}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="category">Category</Label>
                                    <Select value={newTask.category} onValueChange={(value) => setNewTask({ ...newTask, category: value })}>
                                        <SelectTrigger className="w-[280px]">
                                            <SelectValue placeholder="Select a category" />
                                        </SelectTrigger>
                                        <SelectContent position="popper" sideOffset={4}>
                                            <SelectItem value="Requirement">Requirement</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="flex justify-between mt-4">
                                    <Button variant="outline" onClick={closeCreateModal}>Cancel</Button>
                                    <Button onClick={handleNext} disabled={isTabLoading}>
                                        {isTabLoading ? (
                                            <>
                                                <Loader className="w-4 h-4 mr-2 animate-spin" />
                                                Loading...
                                            </>
                                        ) : (
                                            'Next'
                                        )}
                                    </Button>
                                </div>
                            </div>
                        </TabsContent>
                        <TabsContent value="details">
                            <div className="grid gap-4 py-2">
                                <div className="grid gap-2">
                                    <Label htmlFor="dueDate">Due Date</Label>
                                    <Popover modal={false} open={isDatePopoverOpen} onOpenChange={setIsDatePopoverOpen}>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant="outline"
                                                className={`w-[280px] justify-start text-left font-normal ${!newTask.dueDate && 'text-muted-foreground'}`}
                                            >
                                                <CalendarIcon className="mr-2 h-4 w-4" />
                                                {newTask.dueDate ? format(new Date(newTask.dueDate), 'MMM dd, yyyy') : <span>Pick a date</span>}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start" side="bottom">
                                            <SpacedCalendar
                                                mode="single"
                                                selected={newTask.dueDate ? new Date(newTask.dueDate) : undefined}
                                                onSelect={(date) => {
                                                    if (date) {
                                                        const year = date.getFullYear();
                                                        const month = String(date.getMonth() + 1).padStart(2, '0');
                                                        const day = String(date.getDate()).padStart(2, '0');
                                                        setNewTask({ ...newTask, dueDate: `${year}-${month}-${day}` });
                                                    } else {
                                                        setNewTask({ ...newTask, dueDate: '' });
                                                    }
                                                    setIsDatePopoverOpen(false);
                                                }}
                                                initialFocus
                                            />
                                        </PopoverContent>
                                    </Popover>
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="assignedToId">
                                        Assigned To {isManager && teamMembers.length > 0 && <span className="text-xs text-muted-foreground">(Team Members Only)</span>}
                                    </Label>
                                    <Popover
                                        open={isAssignPopoverOpen}
                                        onOpenChange={(open) => {
                                            if (employeeOptions.length === 0) return;
                                            setIsAssignPopoverOpen(open);
                                        }}
                                    >
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant="outline"
                                                className="w-[280px] justify-between text-left font-normal text-xs"
                                                disabled={employeeOptions.length === 0}
                                            >
                                                <span className={`truncate ${selectedAssignLabel ? 'text-foreground' : 'text-muted-foreground'}`}>
                                                    {selectedAssignLabel ||
                                                        (isManager && teamMembers.length === 0 && allEmployees.length > 0
                                                            ? "Loading team members..."
                                                            : employeeOptions.length === 0
                                                            ? "No employees available"
                                                            : "Select an employee")}
                                                </span>
                                                <Search className="h-4 w-4 text-muted-foreground" />
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-[320px] p-0" align="start">
                                            <div className="p-3 border-b">
                                                <div className="relative">
                                                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                                    <Input
                                                        placeholder="Search employees..."
                                                        value={assignSearchTerm}
                                                        onChange={(event) => setAssignSearchTerm(event.target.value)}
                                                        className="pl-9 text-xs"
                                                    />
                                                </div>
                                            </div>
                                            <div className="max-h-64 overflow-y-auto">
                                                {filteredAssignEmployeeOptions.length === 0 ? (
                                                    <div className="px-4 py-6 text-center text-xs text-muted-foreground">
                                                        {employeeOptions.length === 0 ? "No employees available" : "No matches found"}
                                                    </div>
                                                ) : (
                                                    filteredAssignEmployeeOptions.map((option) => {
                                                        const isSelected = option.value === newTask.assignedToId.toString();
                                                        return (
                                                            <button
                                                                key={option.value}
                                                                type="button"
                                                                className={`flex w-full items-center justify-between px-4 py-2 text-xs ${
                                                                    isSelected ? 'bg-primary/10 text-primary font-semibold' : 'hover:bg-muted/40'
                                                                }`}
                                                                onClick={() => handleEmployeeSelect(option.value)}
                                                            >
                                                                <span className="truncate text-left">{option.label}</span>
                                                                {isSelected && <Check className="h-4 w-4 text-primary" />}
                                                            </button>
                                                        );
                                                    })
                                                )}
                                            </div>
                                        </PopoverContent>
                                    </Popover>
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="priority">Priority</Label>
                                    <Select value={newTask.priority} onValueChange={(value) => setNewTask({ ...newTask, priority: value })}>
                                        <SelectTrigger className="w-[280px]">
                                            <SelectValue placeholder="Select a priority" />
                                        </SelectTrigger>
                                        <SelectContent position="popper" sideOffset={4}>
                                            <SelectItem value="low">Low</SelectItem>
                                            <SelectItem value="medium">Medium</SelectItem>
                                            <SelectItem value="high">High</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="storeId">Store</Label>
                                    <ReactSelect
                                        options={storeOptions}
                                        value={selectedStoreOption}
                                        onChange={handleStoreOptionSelect}
                                        placeholder={isStoresLoading ? "Loading stores..." : "Select a store"}
                                        className="w-[280px]"
                                        classNamePrefix="select"
                                        styles={storeSelectStyles}
                                        isSearchable
                                        isClearable
                                        isLoading={isStoresLoading}
                                        backspaceRemovesValue
                                        noOptionsMessage={() => "No matching stores found"}
                                    />
                                </div>
                                <div className="flex justify-between mt-4">
                                    <Button variant="outline" onClick={handleBack}>Back</Button>
                                    <Button onClick={createTask} disabled={isCreating}>
                                        {isCreating ? (
                                            <>
                                                <Loader className="w-4 h-4 mr-2 animate-spin" />
                                                Creating...
                                            </>
                                        ) : (
                                            'Create Requirement'
                                        )}
                                    </Button>
                                </div>
                            </div>
                        </TabsContent>
                    </Tabs>
                </DialogContent>
            </Dialog>

            {isLoading ? (
                <div className="flex justify-center items-center h-64">
                    <Loader className="w-8 h-8 animate-spin text-primary" />
                </div>
            ) : totalElements === 0 ? (
                <div className="text-center py-10">
                    <AlertTriangle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
                    <p className="text-xl font-semibold">No requirements found.</p>
                    <p className="text-muted-foreground mt-2">Try adjusting your filters or create a new requirement.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {paginatedTasks.map((task) => (
                        <div key={task.id}>
                            <Card className="relative h-full gap-0 overflow-visible border-border/70 py-0 shadow-sm transition-shadow hover:shadow-md">
                                <CardHeader className="px-4 pb-2 pt-4">
                                    <div className="flex items-start justify-between gap-3">
                                        <CardTitle className="line-clamp-1 min-w-0 text-sm font-semibold leading-5">
                                            {task.taskTitle || 'Untitled Requirement'}
                                        </CardTitle>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="-mr-2 -mt-1 h-7 w-7 shrink-0 text-muted-foreground">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={() => handleViewStore(task.storeId)}>
                                                    <Building className="mr-2 h-4 w-4" /> View Store
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem onClick={() => deleteTask(task.id)} className="text-red-600">
                                                    <Trash2 className="mr-2 h-4 w-4" /> Delete Requirement
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                    <div className="mt-1 flex min-w-0 items-center gap-1.5 text-xs text-foreground">
                                        <Building className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                                        <span className="truncate">{task.storeName || 'No store assigned'}</span>
                                    </div>
                                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                                        {task.storeCity && (
                                            <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-[10px] text-muted-foreground">
                                                <MapPin className="h-3 w-3" />
                                                {task.storeCity}
                                            </span>
                                        )}
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-3 px-4 pb-4 pt-1">
                                    <div className="flex items-center justify-between gap-3 rounded-lg border border-border/70 bg-muted/20 px-3 py-2 text-xs">
                                        <div className="flex min-w-0 items-center gap-1.5">
                                            <User className="h-3.5 w-3.5 shrink-0 text-primary" />
                                            <span className="truncate font-medium text-foreground">{task.assignedToName || 'Unassigned'}</span>
                                        </div>
                                        <div className="flex shrink-0 items-center gap-1.5 text-muted-foreground">
                                            <CalendarIcon2 className="h-3.5 w-3.5" />
                                            <span>{task.dueDate ? format(new Date(task.dueDate), 'MMM dd, yyyy') : 'No due date'}</span>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="min-w-0 space-y-1">
                                            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Priority</p>
                                            <Select
                                                value={task.priority?.toLowerCase() || 'low'}
                                                onValueChange={(value) => updateTaskField(task.id, 'priority', value)}
                                                disabled={updatingTaskFields.has(`${task.id}-priority`)}
                                            >
                                                <SelectTrigger className="h-9 w-full border-emerald-200 bg-emerald-50 px-3 text-xs font-medium capitalize text-emerald-800 shadow-none dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300">
                                                    <SelectValue placeholder="Priority" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="low">Low</SelectItem>
                                                    <SelectItem value="medium">Medium</SelectItem>
                                                    <SelectItem value="high">High</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="min-w-0 space-y-1">
                                            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Status</p>
                                            <Select
                                                value={task.status}
                                                onValueChange={(value) => updateTaskField(task.id, 'status', value)}
                                                disabled={updatingTaskFields.has(`${task.id}-status`)}
                                            >
                                                <SelectTrigger className={`h-9 w-full px-3 text-xs font-medium shadow-none ${getStatusInfo(task.status).color}`}>
                                                    <SelectValue placeholder="Status" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {statusOptions.map((status) => (
                                                        <SelectItem key={status} value={status}>{status}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    ))}
                </div>
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                    <div className="flex items-center space-x-2">
                        <Label htmlFor="pageSize" className="text-xs text-muted-foreground">Rows per page:</Label>
                        <Select value={pageSize.toString()} onValueChange={(value) => setPageSize(parseInt(value))}>
                            <SelectTrigger className="w-20 h-8 text-xs">
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
                            className="h-8 text-xs"
                        >
                            <ChevronLeft className="h-4 w-4" />
                            Previous
                        </Button>
                        <span className="text-xs text-muted-foreground">
                            Page {currentPage + 1} of {totalPages}
                        </span>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 1))}
                            disabled={currentPage >= totalPages - 1}
                            className="h-8 text-xs"
                        >
                            Next
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            )}

            {/* Status Update Modal */}
            <Dialog
                open={isStatusModalOpen}
                onOpenChange={(open) => {
                    if (open) {
                        setIsStatusModalOpen(true);
                    } else {
                        closeStatusModal();
                    }
                }}
            >
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Change Status</DialogTitle>
                        <DialogDescription>
                            Update the workflow state for{" "}
                            <strong>{selectedTask?.taskTitle || "this requirement"}</strong>.
                        </DialogDescription>
                    </DialogHeader>
                    {selectedTask && (
                        <div className="space-y-6">
                            <div className="space-y-3 rounded-xl border border-border/60 bg-muted/30 p-4">
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Requirement</p>
                                    <p className="text-lg font-semibold text-card-foreground">
                                        {selectedTask.taskTitle || "Untitled Requirement"}
                                    </p>
                                    <p className="text-sm text-muted-foreground">{selectedTask.storeName}</p>
                                </div>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <p className="text-xs uppercase text-muted-foreground">Assigned To</p>
                                        <p className="font-semibold text-card-foreground">{selectedTask.assignedToName}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs uppercase text-muted-foreground">Due Date</p>
                                        <p className="font-semibold text-card-foreground">
                                            {selectedTask.dueDate ? format(new Date(selectedTask.dueDate), 'MMM dd, yyyy') : 'Not set'}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <p className="text-xs uppercase text-muted-foreground">Current Status</p>
                                    <Badge variant="secondary" className="text-xs">
                                        {selectedTask.status}
                                    </Badge>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="status">New Status</Label>
                                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                                    <SelectTrigger id="status" className="w-full">
                                        <SelectValue placeholder="Select new status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {statusOptions.map((status) => (
                                            <SelectItem key={status} value={status}>
                                                {status}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="flex justify-end gap-3">
                                <Button variant="outline" onClick={closeStatusModal}>
                                    Cancel
                                </Button>
                                <Button
                                    onClick={confirmStatusUpdate}
                                    disabled={!selectedStatus || selectedStatus === selectedTask.status}
                                >
                                    Update Status
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Mobile Filter Sheet */}
            <Sheet open={isFilterDrawerOpen} onOpenChange={setIsFilterDrawerOpen}>
                <SheetContent side="right" className="w-[300px] sm:w-[400px]">
                    <SheetHeader>
                        <SheetTitle>Filter Requirements</SheetTitle>
                    </SheetHeader>
                    <div className="space-y-6 py-4">
                        <div className="space-y-2">
                            <Label className="text-sm font-medium">Employee</Label>
                            <Select value={filters.employee} onValueChange={(value) => handleFilterChange('employee', value)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="All employees" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All employees</SelectItem>
                                    {filterEmployees.map((employee) => (
                                        <SelectItem key={employee.id} value={employee.id.toString()}>
                                            {employee.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-sm font-medium">Priority</Label>
                            <Select value={filters.priority} onValueChange={(value) => handleFilterChange('priority', value)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Filter by priority" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Priorities</SelectItem>
                                    <SelectItem value="low">Low</SelectItem>
                                    <SelectItem value="medium">Medium</SelectItem>
                                    <SelectItem value="high">High</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-sm font-medium">Status</Label>
                            <Select value={filters.status} onValueChange={(value) => handleFilterChange('status', value)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Filter by status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Open Statuses</SelectItem>
                                    <SelectItem value="Assigned">Assigned</SelectItem>
                                    <SelectItem value="Work In Progress">Work In Progress</SelectItem>
                                    <SelectItem value="Complete">Complete</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {!isManager && (
                            <>
                                <div className="space-y-2">
                                    <Label className="text-sm font-medium">Start Date</Label>
                                    <Popover open={isFilterStartDatePopoverOpen} onOpenChange={setIsFilterStartDatePopoverOpen}>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant="outline"
                                                className={`w-full justify-start text-left font-normal ${!filters.startDate && 'text-muted-foreground'}`}
                                            >
                                                <CalendarIcon className="mr-2 h-4 w-4" />
                                                {filters.startDate ? format(new Date(filters.startDate), 'MMM dd, yyyy') : <span>Pick start date</span>}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0">
                                            <SpacedCalendar
                                                mode="single"
                                                selected={filters.startDate ? new Date(filters.startDate) : undefined}
                                                onSelect={(date) => {
                                                    handleDateChange('startDate', formatDateForFilter(date));
                                                    setIsFilterStartDatePopoverOpen(false);
                                                }}
                                                initialFocus
                                            />
                                        </PopoverContent>
                                    </Popover>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-sm font-medium">End Date</Label>
                                    <Popover open={isFilterEndDatePopoverOpen} onOpenChange={setIsFilterEndDatePopoverOpen}>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant="outline"
                                                className={`w-full justify-start text-left font-normal ${!filters.endDate && 'text-muted-foreground'}`}
                                            >
                                                <CalendarIcon className="mr-2 h-4 w-4" />
                                                {filters.endDate ? format(new Date(filters.endDate), 'MMM dd, yyyy') : <span>Pick end date</span>}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0">
                                            <SpacedCalendar
                                                mode="single"
                                                selected={filters.endDate ? new Date(filters.endDate) : undefined}
                                                onSelect={(date) => {
                                                    handleDateChange('endDate', formatDateForFilter(date));
                                                    setIsFilterEndDatePopoverOpen(false);
                                                }}
                                                initialFocus
                                            />
                                        </PopoverContent>
                                    </Popover>
                                </div>
                                <DateRangeError fromDate={filters.startDate} toDate={filters.endDate} className="col-span-full" />
                            </>
                        )}
                    </div>
                    <SheetFooter className="flex gap-2">
                        <Button variant="outline" onClick={() => {
                            setFilters({
                                search: '',
                                employee: 'all',
                                priority: 'all',
                                status: 'all',
                                startDate: '',
                                endDate: ''
                            });
                        }}>
                            Clear All
                        </Button>
                        <Button onClick={() => setIsFilterDrawerOpen(false)} disabled={dateRangeInvalid}>
                            Apply Filters
                        </Button>
                    </SheetFooter>
                </SheetContent>
            </Sheet>
        </div>
    );
};

export default Requirements;
