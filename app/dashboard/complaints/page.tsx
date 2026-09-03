'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import ReactSelect, { type SingleValue, type StylesConfig } from 'react-select';
import { format, subDays, differenceInDays } from 'date-fns';
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
import { CalendarIcon, MoreHorizontal, PlusCircle, Search, Filter, Clock, User, Building, MapPin, AlertTriangle, CheckCircle, Loader, Image as ImageIcon, Trash2, Calendar as CalendarIcon2, ChevronLeft, ChevronRight, Check, ChevronsUpDown } from 'lucide-react';
import { DateRangeError, isDateRangeInvalid } from '@/components/date-range-error';

const toast = {
    success: (msg: string, _opts?: Record<string, unknown>) => console.log('SUCCESS:', msg),
    error: (msg: string, _opts?: Record<string, unknown>) => console.error('ERROR:', msg)
};

interface Task {
    id: number;
    taskTitle: string;
    taskDesciption: string; // Note: API uses taskDesciption without 'r'
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
    imageCount: number;
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

interface AttachmentResponse {
    fileName: string;
    fileDownloadUri: string;
    fileType: string;
    tag: string;
    size: number;
}

const Complaints = () => {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [filteredTasks, setFilteredTasks] = useState<Task[]>([]);
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
        category: 'Complaint',
        storeId: 0,
        storeName: '',
        storeCity: '',
        taskType: 'complaint',
        imageCount: 0
    });
    const router = useRouter();
    const FILTER_STATE_KEY = 'complaints.filters.v1';
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
    const [totalPages, setTotalPages] = useState(0);
    const [totalElements, setTotalElements] = useState(0);
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
    const [isImagePreviewOpen, setIsImagePreviewOpen] = useState(false);
    const [taskImages, setTaskImages] = useState<string[]>([]);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [isLoadingImages, setIsLoadingImages] = useState(false);
    const [isTabLoading, setIsTabLoading] = useState(false);
    const [isStoresLoading, setIsStoresLoading] = useState(false);
    const [teamId, setTeamId] = useState<number | null>(null);
    const [teamIds, setTeamIds] = useState<number[]>([]);
    const [isManager, setIsManager] = useState(false);
    const dateRangeInvalid = !isManager && isDateRangeInvalid(filters.startDate, filters.endDate);
    const [teamMembers, setTeamMembers] = useState<Employee[]>([]);
    const [isCreating, setIsCreating] = useState(false);
    const [updatingTaskFields, setUpdatingTaskFields] = useState<Set<string>>(new Set());
    
    // SearchableSelect state variables
    const [selectedStore, setSelectedStore] = useState<string[]>([]);
    const [employeeOptions, setEmployeeOptions] = useState<SearchableSelectOption[]>([]);
    const [storeOptions, setStoreOptions] = useState<SearchableSelectOption[]>([]);
    const [isAssignPopoverOpen, setIsAssignPopoverOpen] = useState(false);
    const [employeeSearchTerm, setEmployeeSearchTerm] = useState("");
    const [filterEmployeeSearch, setFilterEmployeeSearch] = useState("");
    const [filterEmployeePopoverOpen, setFilterEmployeePopoverOpen] = useState(false);

    const statusOptions = ['Assigned', 'Work In Progress', 'Complete'] as const;

    const { token, userRole, userData, currentUser } = useAuth();

    // Determine user role and load team data for managers
    useEffect(() => {
        const checkUserRole = () => {
            const isManagerRole = hasManagerPrivileges(userRole, currentUser);
            setIsManager(isManagerRole);
        };
        checkUserRole();
    }, [userRole, currentUser]);

    // Load team data for managers
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

    // Helper function to format date without timezone issues
    const formatDateForFilter = (date: Date | undefined): string => {
        if (!date) return '';
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const handleDateChange = (key: string, value: string) => {
        const newFilters = { ...filters, [key]: value };
        setFilters(newFilters);
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
            sessionStorage.setItem('nav.return.to', JSON.stringify({ page: 'complaints' }));
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
                    fetch(`https://api.gajkesaristeels.in/task/getByTeam?id=${id}`, {
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

                const tasksArray = Array.from(uniqueTasks.values())
                    .filter((task: Record<string, unknown>) => task.taskType === 'complaint')
                    .map((task: Record<string, unknown>) => ({
                        id: Number(task.id) || 0,
                        taskTitle: String(task.taskTitle || ''),
                        taskDesciption: String(task.taskDesciption || ''),
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
                        imageCount: Number(task.imageCount) || 0,
                    } as Task))
                    .sort((a: Task, b: Task) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime());

                setTasks(tasksArray);
                setIsLoading(false);
                return;
            } else {
                const formattedStartDate = format(new Date(filters.startDate), 'yyyy-MM-dd');
                const formattedEndDate = format(new Date(filters.endDate), 'yyyy-MM-dd');
                url = `https://api.gajkesaristeels.in/task/getByDate?start=${formattedStartDate}&end=${formattedEndDate}`;
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
                .filter((task: Record<string, unknown>) => task.taskType === 'complaint')
                .map((task: Record<string, unknown>) => ({
                    id: Number(task.id) || 0,
                    taskTitle: String(task.taskTitle || ''),
                    taskDesciption: String(task.taskDesciption || ''),
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
                    imageCount: Number(task.imageCount) || 0,
                } as Task))
                .sort((a: Task, b: Task) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime());

            setTasks(tasksArray);
            setIsLoading(false);
        } catch (error) {
            console.error('Error fetching tasks:', error);
            setIsLoading(false);
        }
    }, [token, userRole, userData, isManager, teamIds, filters.startDate, filters.endDate, dateRangeInvalid]);

    const fetchEmployees = useCallback(async () => {
        if (!token) return;
        
        try {
            const data = await API.getAllEmployees();
            const sortedEmployees = sortBy(data as unknown as Employee[], (emp: Employee) => `${emp.firstName} ${emp.lastName}`);
            setAllEmployees(sortedEmployees);
        } catch (error) {
            console.error('Error fetching employees:', error);
        }
    }, [token]);

    const fetchStores = useCallback(async (employeeId?: number, searchTerm: string = '', page: number = 0, size: number = 500, sortByParam: string = 'storeName', sortOrder: string = 'asc') => {
        if (!token || !employeeId) return;
        
        setIsStoresLoading(true);
        try {
            const params = new URLSearchParams({
                employeeId: employeeId.toString(),
                searchTerm,
                page: page.toString(),
                size: size.toString(),
                sortBy: sortByParam,
                sortOrder,
            });
            const url = `https://api.gajkesaristeels.in/store/getStoreNamesByEmployee?${params.toString()}`;
            
            const response = await fetch(url, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            const data = await response.json();
            setStores(data.content || []);
        } catch (error) {
            console.error('Error fetching stores:', error);
        } finally {
            setIsStoresLoading(false);
        }
    }, [token]);

    // Hydrate filters on mount before fetching
    useEffect(() => {
        try {
            const raw = sessionStorage.getItem(FILTER_STATE_KEY);
            if (raw) {
                const saved = JSON.parse(raw);
                if (saved?.filters) setFilters((prev) => ({ ...prev, ...saved.filters }));
                if (typeof saved?.currentPage === 'number') setCurrentPage(saved.currentPage);
                if (typeof saved?.pageSize === 'number') setPageSize(saved.pageSize);
            }
        } catch {}
        setIsFiltersHydrated(true);
    }, []);

    // Persist filters on change
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

    // Reset to first page when filters change
    useEffect(() => {
        setCurrentPage(0);
    }, [filters]);

    useEffect(() => {
        fetchEmployees();
    }, [fetchEmployees]);

    // Get employees for assignment dropdown based on user role
    const assignmentEmployees = useMemo(() => {
        return (isManager ? teamMembers : allEmployees).filter(
            (employee) => getEmployeeRoleCategory(employee.role) !== 'admin'
        );
    }, [isManager, teamMembers, allEmployees]);

    const applyFilters = useCallback(() => {
        const searchLower = filters.search.toLowerCase();
        const filtered = tasks.filter((task) => {
            const matchesType = task.taskType === 'complaint';
            if (!matchesType) return false;

            const matchesSearch =
                (task.taskTitle?.toLowerCase() || '').includes(searchLower) ||
                (task.taskDesciption?.toLowerCase() || '').includes(searchLower) ||
                (task.storeName?.toLowerCase() || '').includes(searchLower) ||
                (task.assignedToName?.toLowerCase() || '').includes(searchLower);

            const matchesEmployee =
                filters.employee === '' ||
                filters.employee === 'all' ||
                task.assignedToId === parseInt(filters.employee, 10);

            const matchesPriority =
                filters.priority === '' ||
                filters.priority === 'all' ||
                task.priority === filters.priority;

            const matchesStatus =
                filters.status === '' ||
                filters.status === 'all'
                    ? task.status !== 'Complete'
                    : task.status === filters.status;

            const matchesDateRange =
                isManager ||
                (
                    (filters.startDate === '' || new Date(task.dueDate) >= new Date(filters.startDate)) &&
                    (filters.endDate === '' || new Date(task.dueDate) <= new Date(filters.endDate))
                );

            return matchesSearch && matchesEmployee && matchesPriority && matchesStatus && matchesDateRange;
        });

        const nextTotalPages = filtered.length === 0 ? 0 : Math.ceil(filtered.length / pageSize);

        setFilteredTasks(filtered);
        setTotalElements(filtered.length);
        setTotalPages(nextTotalPages);
        if (nextTotalPages === 0) {
            if (currentPage !== 0) setCurrentPage(0);
        } else if (currentPage >= nextTotalPages) {
            setCurrentPage(Math.max(0, nextTotalPages - 1));
        }
    }, [tasks, filters, pageSize, isManager, currentPage]);

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
        applyFilters();
    }, [applyFilters]);

    // Populate SearchableSelect options for employee dropdown
    useEffect(() => {
        const assignmentEmployeesList = (isManager ? teamMembers : allEmployees).filter(
            (employee) => getEmployeeRoleCategory(employee.role) !== 'admin'
        );
        const options: SearchableSelectOption[] = assignmentEmployeesList.map(emp => ({
            value: emp.id.toString(),
            label: `${emp.firstName} ${emp.lastName}`
        })).sort((a, b) => a.label.localeCompare(b.label));
        setEmployeeOptions(options);
    }, [allEmployees, teamMembers, isManager]);

    // Populate SearchableSelect options for store dropdown
    useEffect(() => {
        const options: SearchableSelectOption[] = stores.map(store => ({
            value: store.id.toString(),
            label: store.storeName
        })).sort((a, b) => a.label.localeCompare(b.label));
        setStoreOptions(options);
    }, [stores]);

    const createTask = async () => {
        if (!token) return;
        if (isCreating) return;

        try {
            setIsCreating(true);

            let selectedAssignedToName = '';
            if (isManager && teamMembers.length > 0) {
                const assignedEmployee = teamMembers.find(emp => emp.id === newTask.assignedToId);
                selectedAssignedToName = assignedEmployee ? `${assignedEmployee.firstName} ${assignedEmployee.lastName}` : '';
            } else {
                const assignedEmployee = allEmployees.find(emp => emp.id === newTask.assignedToId);
                selectedAssignedToName = assignedEmployee ? `${assignedEmployee.firstName} ${assignedEmployee.lastName}` : '';
            }

            const payload = {
                ...newTask,
                assignedToName: selectedAssignedToName,
                assignedById: userData?.employeeId || 86,
                dueDate: newTask.dueDate.split('T')[0]
            };

            const response = await fetch('https://api.gajkesaristeels.in/task/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(payload),
            });

            if (response.ok) {
                fetchTasks();
                setIsModalOpen(false);
                resetForm();
            } else {
                console.error('Failed to create task:', response.statusText);
            }
        } catch (error) {
            console.error('Error creating task:', error);
        } finally {
            setIsCreating(false);
        }
    };

    const updateTaskField = async (taskId: number, field: 'priority' | 'status', value: string) => {
        if (!token) return;

        const taskKey = `${taskId}-${field}`;
        if (updatingTaskFields.has(taskKey)) return;

        const originalTask = tasks.find((task) => task.id === taskId);
        if (!originalTask || originalTask[field === 'priority' ? 'priority' : 'status'] === value) return;

        setUpdatingTaskFields((current) => new Set(current).add(taskKey));
        setErrorMessage(null);
        setTasks((current) => current.map((task) =>
            task.id === taskId ? { ...task, [field]: value } : task
        ));

        try {
            const response = await fetch(
                `https://api.gajkesaristeels.in/task/updateTask?taskId=${taskId}`,
                {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({ [field]: value }),
                }
            );

            if (!response.ok) {
                throw new Error(`Failed to update task ${field}`);
            }

            toast.success(`${field === 'priority' ? 'Priority' : 'Status'} updated`, {
                duration: 3000,
            });
        } catch (updateError) {
            setTasks((current) => current.map((task) =>
                task.id === taskId ? { ...task, [field]: originalTask[field === 'priority' ? 'priority' : 'status'] } : task
            ));
            setErrorMessage(`Could not update ${field}. Please try again.`);
            toast.error(`Could not update ${field}`, {
                duration: 3000,
            });
            console.error(`Error updating task ${field}:`, updateError);
        } finally {
            setUpdatingTaskFields((current) => {
                const next = new Set(current);
                next.delete(taskKey);
                return next;
            });
        }
    };

    const deleteTask = async (taskId: number) => {
        if (!token) return;
        
        try {
            await fetch(`https://api.gajkesaristeels.in/task/deleteById?taskId=${taskId}`, {
                method: 'DELETE',
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            fetchTasks();
        } catch (error) {
            console.error('Error deleting task:', error);
        }
    };

    const handleFilterChange = (key: string, value: string) => {
        setFilters((prevFilters) => ({
            ...prevFilters,
            [key]: value,
        }));
    };

    const handleEmployeeSelect = (value: string) => {
        if (!value) {
            setNewTask({
                ...newTask,
                assignedToId: 0,
                assignedToName: '',
                storeId: 0,
                storeName: ''
            });
            setStores([]);
            setSelectedStore([]);
            return;
        }

        const employeeId = parseInt(value);
        const selectedEmployee = assignmentEmployees.find(emp => emp.id === employeeId);
        
        if (selectedEmployee) {
            setNewTask({
                ...newTask,
                assignedToId: employeeId,
                assignedToName: `${selectedEmployee.firstName} ${selectedEmployee.lastName}`,
                storeId: 0,
                storeName: ''
            });
            fetchStores(employeeId);
            setSelectedStore([]);
        }
        setIsAssignPopoverOpen(false);
    };

    const handleStoreOptionSelect = (option: SingleValue<{ value: string; label: string }>) => {
        if (!option) {
            setNewTask({
                ...newTask,
                storeId: 0,
                storeName: ''
            });
            setSelectedStore([]);
            return;
        }

        const storeId = parseInt(option.value);
        const selectedStoreObj = stores.find(store => store.id === storeId);
        
        if (selectedStoreObj) {
            setNewTask({
                ...newTask,
                storeId: storeId,
                storeName: selectedStoreObj.storeName
            });
            setSelectedStore([option.value]);
        }
    };

    const selectedStoreOption = useMemo(() => {
        if (!newTask.storeId || !newTask.storeName) return null;
        return {
            value: newTask.storeId.toString(),
            label: newTask.storeName
        };
    }, [newTask.storeId, newTask.storeName]);

    const storeSelectStyles: StylesConfig<{ value: string; label: string }, false> = {
        control: (provided, state) => ({
            ...provided,
            minHeight: '36px',
            height: '36px',
            backgroundColor: state.isDisabled ? 'hsl(var(--muted))' : 'hsl(var(--background))',
            borderColor: state.isFocused ? 'hsl(var(--ring))' : 'hsl(var(--input))',
            boxShadow: 'none',
            '&:hover': {
                borderColor: 'hsl(var(--input))'
            },
            fontSize: '0.875rem',
            borderRadius: 'calc(var(--radius) - 2px)'
        }),
        valueContainer: (provided) => ({
            ...provided,
            height: '36px',
            padding: '0 8px'
        }),
        input: (provided) => ({
            ...provided,
            margin: '0',
            padding: '0'
        }),
        indicatorsContainer: (provided) => ({
            ...provided,
            height: '36px'
        }),
        menu: (provided) => ({
            ...provided,
            backgroundColor: 'hsl(var(--popover))',
            borderColor: 'hsl(var(--border))',
            boxShadow: '0 4px 6px -1px opacity(0.1), 0 2px 4px -2px opacity(0.1)',
            zIndex: 50
        }),
        option: (provided, state) => ({
            ...provided,
            backgroundColor: state.isSelected 
                ? 'hsl(var(--primary))' 
                : state.isFocused 
                ? 'hsl(var(--accent))' 
                : 'transparent',
            color: state.isSelected 
                ? 'hsl(var(--primary-foreground))' 
                : 'hsl(var(--popover-foreground))',
            fontSize: '0.875rem',
            padding: '8px 12px',
            cursor: 'pointer'
        }),
        singleValue: (provided) => ({
            ...provided,
            color: 'hsl(var(--foreground))'
        }),
        placeholder: (provided) => ({
            ...provided,
            color: 'hsl(var(--muted-foreground))'
        })
    };

    const resetForm = () => {
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
            category: 'Complaint',
            storeId: 0,
            storeName: '',
            storeCity: '',
            taskType: 'complaint',
            imageCount: 0
        });
        setSelectedStore([]);
        setStores([]);
        setActiveTab('general');
    };

    const paginatedTasks = useMemo(() => {
        const startIndex = currentPage * pageSize;
        const endIndex = startIndex + pageSize;
        return filteredTasks.slice(startIndex, endIndex);
    }, [filteredTasks, currentPage, pageSize]);

    const getStatusInfo = (status: string): { icon: React.ReactNode; color: string } => {
        switch (status.toLowerCase()) {
            case 'assigned':
                return { icon: <Clock className="w-4 h-4" />, color: 'bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-900' };
            case 'work in progress':
                return { icon: <Loader className="w-4 h-4 animate-spin" />, color: 'bg-yellow-50 text-yellow-800 border-yellow-200 dark:bg-yellow-950/50 dark:text-yellow-300 dark:border-yellow-900' };
            case 'complete':
                return { icon: <CheckCircle className="w-4 h-4" />, color: 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-900' };
            default:
                return { icon: <AlertTriangle className="w-4 h-4" />, color: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300' };
        }
    };

    const fetchTaskImages = async (taskId: number) => {
        setIsLoadingImages(true);
        try {
            const taskResponse = await fetch(`https://api.gajkesaristeels.in/task/getById?id=${taskId}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            if (!taskResponse.ok) {
                throw new Error('Failed to fetch task details');
            }
            const taskData = await taskResponse.json();
    
            const fileNames = taskData.attachmentResponse
                .filter((attachment: AttachmentResponse) => attachment.tag === 'check-in')
                .map((attachment: AttachmentResponse) => attachment.fileName);
    
            const imageUrls = await Promise.all(
                fileNames.map(async (fileName: string) => {
                    const imageResponse = await fetch(
                        `https://api.gajkesaristeels.in/task/downloadFile/${taskId}/check-in/${fileName}`,
                        {
                            headers: {
                                Authorization: `Bearer ${token}`,
                            },
                        }
                    );
                    if (imageResponse.ok) {
                        const blob = await imageResponse.blob();
                        return URL.createObjectURL(blob);
                    }
                    return null;
                })
            );
    
            setTaskImages(imageUrls.filter((url): url is string => url !== null));
            setIsImagePreviewOpen(true);
        } catch (error) {
            console.error('Error fetching task images:', error);
        } finally {
            setIsLoadingImages(false);
        }
    };

    const filteredEmployeeOptions = useMemo(() => {
        const query = employeeSearchTerm.trim().toLowerCase();
        if (!query) return employeeOptions;
        return employeeOptions.filter((option) => option.label.toLowerCase().includes(query));
    }, [employeeOptions, employeeSearchTerm]);

    const selectedEmployeeLabel = useMemo(() => {
        if (!newTask.assignedToId) return '';
        return employeeOptions.find((opt) => opt.value === newTask.assignedToId.toString())?.label ?? '';
    }, [employeeOptions, newTask.assignedToId]);

    const filteredTopEmployeeOptions = useMemo(() => {
        const query = filterEmployeeSearch.trim().toLowerCase();
        if (!query) return filterEmployees;
        return filterEmployees.filter((employee) => employee.name.toLowerCase().includes(query));
    }, [filterEmployees, filterEmployeeSearch]);

    const topEmployeeDisplay = useMemo(() => {
        if (filters.employee === '' || filters.employee === 'all') return 'All employees';
        return filterEmployees.find((emp) => emp.id.toString() === filters.employee)?.name || 'All employees';
    }, [filters.employee, filterEmployees]);

    return (
        <div className="mx-auto w-full max-w-none py-4">
            <div className="mb-4 flex items-center justify-between gap-2">
                <div className="order-2 ml-auto flex items-center gap-2 lg:shrink-0">
                    <Button size="sm" className="h-9" onClick={() => setIsModalOpen(true)}>
                        <PlusCircle className="mr-2 h-4 w-4" /> New
                    </Button>
                </div>
                <div className="order-1 flex-shrink-0">
                    <Button variant="outline" size="sm" className="lg:hidden" onClick={() => setIsFilterDrawerOpen(true)}>
                        <Filter className="mr-2 h-4 w-4" />
                        Filters
                    </Button>
                </div>
                <div className="order-1 hidden min-w-0 flex-1 items-center gap-2 lg:flex">
                    <Popover open={filterEmployeePopoverOpen} onOpenChange={setFilterEmployeePopoverOpen}>
                        <PopoverTrigger asChild>
                            <Button variant="outline" className="h-9 w-[160px] shrink-0 justify-between px-3 text-sm font-normal shadow-none">
                                <span className="truncate text-left">{topEmployeeDisplay}</span>
                                <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted-foreground" />
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
                                        className="pl-9"
                                    />
                                </div>
                            </div>
                            <div className="max-h-64 overflow-y-auto">
                                <button
                                    type="button"
                                    className={`flex w-full items-center justify-between px-4 py-2 text-sm ${
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
                                            className={`flex w-full items-center justify-between px-4 py-2 text-sm ${
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
                        <SelectTrigger className="h-9 w-[140px] shrink-0 text-sm shadow-none">
                            <SelectValue placeholder="Filter by status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Open Statuses</SelectItem>
                            <SelectItem value="Assigned">Assigned</SelectItem>
                            <SelectItem value="Work In Progress">Work In Progress</SelectItem>
                            <SelectItem value="Complete">Complete</SelectItem>
                        </SelectContent>
                    </Select>
                    {/* Only show date filters for admin users */}
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
            </div>

            <Dialog open={isModalOpen} onOpenChange={(open: boolean) => {
                if (open) setIsModalOpen(true);
                else {
                    setIsModalOpen(false);
                    resetForm();
                }
            }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Create New Complaint</DialogTitle>
                        <DialogDescription>Fill in the details to create a new complaint.</DialogDescription>
                    </DialogHeader>
                    <Tabs value={activeTab} className="w-full">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="general" disabled={activeTab === 'details'}>General</TabsTrigger>
                            <TabsTrigger value="details" disabled={activeTab === 'general'}>Details</TabsTrigger>
                        </TabsList>
                        <TabsContent value="general">
                            <div className="grid gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="taskTitle">Complaint Title</Label>
                                    <Input
                                        id="taskTitle"
                                        placeholder="Enter complaint title"
                                        value={newTask.taskTitle}
                                        onChange={(e) => setNewTask({ ...newTask, taskTitle: e.target.value })}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="taskDesciption">Complaint Description</Label>
                                    <Input
                                        id="taskDesciption"
                                        placeholder="Enter complaint description"
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
                                        <SelectContent>
                                            <SelectItem value="Complaint">Complaint</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="flex justify-between mt-4">
                                    <Button variant="outline" onClick={() => {
                                        setIsModalOpen(false);
                                        resetForm();
                                    }}>Cancel</Button>
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
                            <div className="grid gap-4">
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
                                                        const dateString = `${year}-${month}-${day}`;
                                                        setNewTask({ ...newTask, dueDate: dateString });
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
                                                className="w-[280px] justify-between text-left font-normal"
                                                disabled={employeeOptions.length === 0}
                                            >
                                                <span className={`truncate ${selectedEmployeeLabel ? 'text-foreground' : 'text-muted-foreground'}`}>
                                                    {selectedEmployeeLabel ||
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
                                                        value={employeeSearchTerm}
                                                        onChange={(event) => setEmployeeSearchTerm(event.target.value)}
                                                        className="pl-9"
                                                    />
                                                </div>
                                            </div>
                                            <div className="max-h-64 overflow-y-auto">
                                                {filteredEmployeeOptions.length === 0 ? (
                                                    <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                                                        {employeeOptions.length === 0 ? "No employees available" : "No matches found"}
                                                    </div>
                                                ) : (
                                                    filteredEmployeeOptions.map((option) => {
                                                        const isSelected = option.value === newTask.assignedToId.toString();
                                                        return (
                                                            <button
                                                                key={option.value}
                                                                type="button"
                                                                className={`flex w-full items-center justify-between px-4 py-2 text-sm ${
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
                                        <SelectContent>
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
                                        placeholder={
                                            isStoresLoading ? "Loading stores..." : 
                                            !newTask.assignedToId ? "Select employee first" : 
                                            "Select a store"
                                        }
                                        className="w-[280px]"
                                        classNamePrefix="select"
                                        styles={storeSelectStyles}
                                        isSearchable
                                        isClearable
                                        isDisabled={!newTask.assignedToId}
                                        isLoading={isStoresLoading}
                                        backspaceRemovesValue
                                        noOptionsMessage={() => "No matching stores found"}
                                    />
                                </div>
                                <div className="flex justify-between mt-4">
                                    <Button variant="outline" onClick={handleBack}>Back</Button>
                                    <Button onClick={createTask} disabled={isCreating}>
                                        {isCreating && <Loader className="mr-2 h-4 w-4 animate-spin" />}
                                        {isCreating ? 'Creating...' : 'Create Complaint'}
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
                    <p className="text-xl font-semibold">No complaints found.</p>
                    <p className="text-gray-500 mt-2">Try adjusting your filters or create a new complaint.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {paginatedTasks.map((task) => (
                        <div key={task.id}>
                            <Card className="relative h-full gap-0 overflow-visible border-border/70 py-0 shadow-sm transition-shadow hover:shadow-md">
                                <CardHeader className="px-4 pb-2 pt-4">
                                    <div className="flex items-start justify-between gap-3">
                                        <CardTitle className="line-clamp-1 min-w-0 text-sm font-semibold leading-5">
                                            {task.taskTitle || 'Untitled Complaint'}
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
                                                {task.imageCount > 0 && (
                                                    <DropdownMenuItem onClick={() => fetchTaskImages(task.id)}>
                                                        <ImageIcon className="mr-2 h-4 w-4" /> View Images
                                                    </DropdownMenuItem>
                                                )}
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem onClick={() => deleteTask(task.id)} className="text-red-600">
                                                    <Trash2 className="mr-2 h-4 w-4" /> Delete Complaint
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
                                            <span className="truncate font-medium text-foreground">
                                                {task.assignedToName || 'Unassigned'}
                                            </span>
                                        </div>
                                        <div className="flex shrink-0 items-center gap-1.5 text-muted-foreground">
                                            <CalendarIcon2 className="h-3.5 w-3.5" />
                                            <span>
                                                {task.dueDate
                                                    ? format(new Date(task.dueDate), 'MMM dd, yyyy')
                                                    : 'No due date'}
                                            </span>
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

            {isImagePreviewOpen && (
                <Dialog open={isImagePreviewOpen} onOpenChange={setIsImagePreviewOpen}>
                    <DialogContent className="max-w-3xl">
                        <DialogHeader>
                            <DialogTitle>Image Preview</DialogTitle>
                        </DialogHeader>
                        {isLoadingImages ? (
                            <div className="flex justify-center items-center h-64">
                                <Loader className="w-8 h-8 animate-spin text-primary" />
                                <span className="ml-2">Loading images...</span>
                            </div>
                        ) : (
                            <>
                                <div className="relative">
                                    <img
                                        src={taskImages[currentImageIndex]}
                                        alt={`Image ${currentImageIndex + 1}`}
                                        className="w-full h-auto"
                                    />
                                    {taskImages.length > 1 && (
                                        <>
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                className="absolute left-2 top-1/2 transform -translate-y-1/2"
                                                onClick={() => setCurrentImageIndex((prev) => (prev === 0 ? taskImages.length - 1 : prev - 1))}
                                            >
                                                <ChevronLeft className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                className="absolute right-2 top-1/2 transform -translate-y-1/2"
                                                onClick={() => setCurrentImageIndex((prev) => (prev === taskImages.length - 1 ? 0 : prev + 1))}
                                            >
                                                <ChevronRight className="h-4 w-4" />
                                            </Button>
                                        </>
                                    )}
                                </div>
                                <p className="text-center mt-2">
                                    Image {currentImageIndex + 1} of {taskImages.length}
                                </p>
                            </>
                        )}
                    </DialogContent>
                </Dialog>
            )}

            {/* Mobile Filter Sheet */}
            <Sheet open={isFilterDrawerOpen} onOpenChange={setIsFilterDrawerOpen}>
                <SheetContent side="right" className="w-[300px] sm:w-[400px]">
                    <SheetHeader>
                        <SheetTitle>Filter Complaints</SheetTitle>
                    </SheetHeader>
                    <div className="space-y-6 py-4">
                        {/* Employee Filter */}
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

                        {/* Priority Filter */}
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

                        {/* Status Filter */}
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

                        {/* Date Filters - Only show for admin users */}
                        {!isManager && (
                            <>
                                <div className="space-y-2">
                                    <Label className="text-sm font-medium">Start Date</Label>
                                    <Popover modal={false} open={isFilterStartDatePopoverOpen} onOpenChange={setIsFilterStartDatePopoverOpen}>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant="outline"
                                                className={`w-full justify-start text-left font-normal ${!filters.startDate && 'text-muted-foreground'}`}
                                            >
                                                <CalendarIcon className="mr-2 h-4 w-4" />
                                                {filters.startDate ? format(new Date(filters.startDate), 'MMM dd, yyyy') : <span>Pick start date</span>}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start" side="bottom">
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
                                    <Popover modal={false} open={isFilterEndDatePopoverOpen} onOpenChange={setIsFilterEndDatePopoverOpen}>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant="outline"
                                                className={`w-full justify-start text-left font-normal ${!filters.endDate && 'text-muted-foreground'}`}
                                            >
                                                <CalendarIcon className="mr-2 h-4 w-4" />
                                                {filters.endDate ? format(new Date(filters.endDate), 'MMM dd, yyyy') : <span>Pick end date</span>}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start" side="bottom">
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

export default Complaints;
