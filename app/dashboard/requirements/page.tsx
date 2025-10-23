'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { format, subDays, differenceInDays } from 'date-fns';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth-provider';
import { API, type TeamDataDto } from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import { sortBy, uniqBy } from 'lodash';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import SearchableSelect, { SearchableSelectOption } from '@/components/ui/searchable-select';
import { SpacedCalendar } from '@/components/ui/spaced-calendar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Pagination, PaginationContent, PaginationLink, PaginationItem, PaginationPrevious, PaginationNext } from '@/components/ui/pagination';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter } from '@/components/ui/sheet';
import { CalendarIcon, MoreHorizontal, PlusCircle, Search, Filter, Clock, User, Building, MapPin, AlertTriangle, CheckCircle, Loader, FileText, Target, Trash2, Calendar as CalendarIcon2, X, ChevronLeft, ChevronRight } from 'lucide-react';

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
}

interface Employee {
    id: number;
    firstName: string;
    lastName: string;
}

interface Store {
    id: number;
    storeName: string;
}

const Requirements = () => {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [filteredTasks, setFilteredTasks] = useState<Task[]>([]);
    const [newTask, setNewTask] = useState<Task>({
        id: 0,
        taskTitle: '',
        taskDesciption: '',
        dueDate: '',
        assignedToId: 0,
        assignedToName: '',
        assignedById: 86,
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
    const [expandedRequirement, setExpandedRequirement] = useState<number | null>(null);
    const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
    const [selectedStatus, setSelectedStatus] = useState<string>('');
    const [taskToUpdate, setTaskToUpdate] = useState<number | null>(null);
    const [teamId, setTeamId] = useState<number | null>(null);
    const [isManager, setIsManager] = useState(false);
    const [teamMembers, setTeamMembers] = useState<Employee[]>([]);
    const [isTabLoading, setIsTabLoading] = useState(false);
    const [isStoresLoading, setIsStoresLoading] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    
    // SearchableSelect state variables
    const [selectedEmployee, setSelectedEmployee] = useState<string[]>([]);
    const [selectedStore, setSelectedStore] = useState<string[]>([]);
    const [employeeOptions, setEmployeeOptions] = useState<SearchableSelectOption[]>([]);
    const [storeOptions, setStoreOptions] = useState<SearchableSelectOption[]>([]);

    const statusOptions = ['Assigned', 'Work In Progress', 'Complete'] as const;

    const { token, userRole, userData, currentUser } = useAuth();

    // Determine user role and load team data for managers
    useEffect(() => {
        const checkUserRole = () => {
            // Check both userRole and currentUser authorities
            const isManagerRole = userRole === 'MANAGER' || 
                currentUser?.authorities?.some(auth => auth.authority === 'ROLE_MANAGER');
            
            setIsManager(!!isManagerRole);
        };
        checkUserRole();
    }, [userRole, currentUser]);

    // Load team data for managers
    useEffect(() => {
        const loadTeamData = async () => {
            if (!isManager || !userData?.employeeId) return;
            
            try {
                console.log('Loading team data for manager with employeeId:', userData.employeeId);
                const teamData: TeamDataDto[] = await API.getTeamByEmployee(userData.employeeId);
                
                if (teamData && teamData.length > 0) {
                    const team = teamData[0];
                    const teamId = team.id;
                    setTeamId(teamId);
                    console.log('Team ID loaded:', teamId);
                    
                    // Load team members for assignment dropdown
                    const teamMemberIds = team.fieldOfficers.map(fo => fo.id);
                    console.log('Team member IDs:', teamMemberIds);
                    
                    // Filter all employees to only show team members
                    const filteredTeamMembers = allEmployees.filter(emp => 
                        teamMemberIds.includes(emp.id)
                    );
                    setTeamMembers(filteredTeamMembers);
                    console.log('Team members loaded:', filteredTeamMembers.length);
                } else {
                    console.warn('No team data found for manager');
                    setErrorMessage('No team data found for this manager');
                }
            } catch (err) {
                console.error('Failed to load team data:', err);
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

        // Removed 30-day limit per request

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
            sessionStorage.setItem('nav.return.to', JSON.stringify({ page: 'requirements' }));
        } catch {}
        router.push(`/dashboard/customers/${storeId}`);
    };

    const handleViewFieldOfficer = (employeeId: number) => {
        router.push(`/dashboard/employees/${employeeId}`);
    };

    const fetchTasks = useCallback(async () => {
        if (!token) return;
        
        // For managers, wait until we have teamId
        if (isManager && !teamId) {
            console.log('⏳ Manager detected but no teamId yet - waiting for team data');
            return;
        }
        
        console.log('Fetching tasks with:', { userRole, userData, isManager, teamId, token: token ? 'present' : 'missing' });
        
        setIsLoading(true);
        try {
            let url: string;
            
            // Use different API endpoints based on user role
            if (isManager && teamId) {
                // For managers, use team-based API with teamId
                url = `https://api.gajkesaristeels.in/task/getByTeam?id=${teamId}`;
                console.log('Using MANAGER API:', url, 'Team ID:', teamId);
            } else {
                // For admins, use date-based API
                const formattedStartDate = format(new Date(filters.startDate), 'yyyy-MM-dd');
                const formattedEndDate = format(new Date(filters.endDate), 'yyyy-MM-dd');
                url = `https://api.gajkesaristeels.in/task/getByDate?start=${formattedStartDate}&end=${formattedEndDate}`;
                console.log('Using ADMIN API:', url, 'User Role:', userRole);
            }

            const response = await fetch(url, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('API Error:', response.status, errorText);
                throw new Error(`API request failed: ${response.status} ${errorText}`);
            }

            const data = await response.json();
            console.log('API Response:', data);

            // Ensure data is an array
            const tasksArray = Array.isArray(data) ? data : [];
            
            const filteredTasks = tasksArray
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

            // Apply client-side pagination
            const startIndex = currentPage * pageSize;
            const endIndex = startIndex + pageSize;
            const paginatedTasks = filteredTasks.slice(startIndex, endIndex);
            
            setTasks(paginatedTasks);
            setTotalPages(Math.ceil(filteredTasks.length / pageSize));
            setTotalElements(filteredTasks.length);
            setIsLoading(false);
        } catch (error) {
            console.error('Error fetching tasks:', error);
            setIsLoading(false);
        }
    }, [filters, token, userRole, userData, isManager, teamId, currentPage, pageSize]);

    const fetchEmployees = useCallback(async () => {
        if (!token) return;
        
        try {
            const response = await fetch('https://api.gajkesaristeels.in/employee/getAll', {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            const data = await response.json();
            const sortedEmployees = sortBy(data, (emp: Record<string, unknown>) => `${emp.firstName} ${emp.lastName}`);
            setAllEmployees(sortedEmployees);
        } catch (error) {
            console.error('Error fetching employees:', error);
        }
    }, [token]);

    const fetchStores = useCallback(async () => {
        if (!token) return;
        
        setIsStoresLoading(true);
        try {
            const response = await fetch('https://api.gajkesaristeels.in/store/names', {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            const data = await response.json();
            setStores(data);
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
    const assignmentEmployees = isManager && teamMembers.length > 0 ? teamMembers : allEmployees;

    useEffect(() => {
        if (isModalOpen) {
            fetchStores();
        }
    }, [isModalOpen, fetchStores]);

    useEffect(() => {
        if (tasks.length > 0) {
            const uniqueEmployees = uniqBy(tasks.map(task => ({
                id: task.assignedToId,
                name: task.assignedToName
            })), 'id');
            const sortedEmployees = sortBy(uniqueEmployees, 'name');
            setFilterEmployees(sortedEmployees);
        }
    }, [tasks]);

    useEffect(() => {
        applyFilters();
    }, [tasks, filters]);

    // Populate employee options for SearchableSelect
    useEffect(() => {
        const assignmentEmployees = isManager && teamMembers.length > 0 ? teamMembers : allEmployees;
        const options = assignmentEmployees.map(emp => ({
            value: emp.id.toString(),
            label: `${emp.firstName} ${emp.lastName}`
        })).sort((a, b) => a.label.localeCompare(b.label));
        setEmployeeOptions(options);
    }, [allEmployees, teamMembers, isManager]);

    // Populate store options for SearchableSelect
    useEffect(() => {
        const options = stores.map(store => ({
            value: store.id.toString(),
            label: store.storeName
        })).sort((a, b) => a.label.localeCompare(b.label));
        setStoreOptions(options);
    }, [stores]);

    const applyFilters = () => {
        const searchLower = filters.search.toLowerCase();
        const filtered = tasks
            .filter(
                (task) =>
                    task.taskType === 'requirement' &&
                    (
                        (task.taskTitle?.toLowerCase() || '').includes(searchLower) ||
                        (task.taskDesciption?.toLowerCase() || '').includes(searchLower) ||
                        (task.storeName?.toLowerCase() || '').includes(searchLower) ||
                        (task.assignedToName?.toLowerCase() || '').includes(searchLower)
                    ) &&
                    (filters.employee === '' || filters.employee === 'all' ? true : task.assignedToId === parseInt(filters.employee)) &&
                    (filters.priority === '' || filters.priority === 'all' ? true : task.priority === filters.priority) &&
                    (filters.status === '' || filters.status === 'all' ? task.status !== 'Complete' : task.status === filters.status) &&
                    // Only apply date filters for admin users (managers use team-based API)
                    (!isManager ? (
                        (filters.startDate === '' || new Date(task.dueDate) >= new Date(filters.startDate)) &&
                        (filters.endDate === '' || new Date(task.dueDate) <= new Date(filters.endDate))
                    ) : true)
            );

        setFilteredTasks(filtered);
    };

    const createTask = async () => {
        if (!token) return;
        
        setIsCreating(true);
        try {
            const taskToCreate = {
                ...newTask,
                taskDesciption: newTask.taskDesciption, // Use correct field name
                taskType: 'requirement',
            };

            const response = await fetch('https://api.gajkesaristeels.in/task/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(taskToCreate),
            });
            const data = await response.json();

            const createdTask = {
                ...newTask,
                id: data.id,
                assignedToName: assignmentEmployees.find(emp => emp.id === newTask.assignedToId)?.firstName + ' ' + assignmentEmployees.find(emp => emp.id === newTask.assignedToId)?.lastName || 'Unknown',
                storeName: stores.find(store => store.id === newTask.storeId)?.storeName || '',
            };

            setTasks(prevTasks => [createdTask, ...prevTasks]);

            setIsModalOpen(false);
            resetForm();
        } catch (error) {
            console.error('Error creating task:', error);
        } finally {
            setIsCreating(false);
        }
    };

    const handleStatusChange = (task: Task) => {
        setSelectedTask(task);
        setTaskToUpdate(task.id);
        setSelectedStatus(task.status);
        setIsStatusModalOpen(true);
    };

    const resetStatusModal = () => {
        setIsStatusModalOpen(false);
        setTaskToUpdate(null);
        setSelectedStatus('');
        setSelectedTask(null);
    };

    const confirmStatusUpdate = async () => {
        if (!token || taskToUpdate === null) return;

        if (selectedTask && selectedStatus === selectedTask.status) {
            resetStatusModal();
            return;
        }
        
        try {
            const response = await fetch(
                `https://api.gajkesaristeels.in/task/updateTask?taskId=${taskToUpdate}`,
                {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({ status: selectedStatus }),
                }
            );

            if (response.ok) {
                setTasks((prevTasks) =>
                    prevTasks.map((task) =>
                        task.id === taskToUpdate ? { ...task, status: selectedStatus } : task
                    )
                );
                resetStatusModal();
            } else {
                console.error('Failed to update task status');
            }
        } catch (error) {
            console.error('Error updating task status:', error);
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
        applyFilters();
    };

    // SearchableSelect handlers
    const handleEmployeeSelect = (values: string[]) => {
        setSelectedEmployee(values);
        if (values.length > 0) {
            const selectedEmp = assignmentEmployees.find(emp => emp.id.toString() === values[0]);
            setNewTask({ 
                ...newTask, 
                assignedToId: parseInt(values[0]), 
                assignedToName: selectedEmp ? `${selectedEmp.firstName} ${selectedEmp.lastName}` : 'Unknown',
                storeId: 0, // Reset store selection when employee changes
                storeName: ''
            });
            // Clear existing stores and fetch new ones for selected employee
            setStores([]);
            setSelectedStore([]);
            // Fetch stores for the selected employee
            fetchStores();
        } else {
            setNewTask({ 
                ...newTask, 
                assignedToId: 0, 
                assignedToName: '',
                storeId: 0,
                storeName: ''
            });
            setStores([]);
            setSelectedStore([]);
        }
    };

    const handleStoreSelect = (values: string[]) => {
        setSelectedStore(values);
        if (values.length > 0) {
            const selectedStore = stores.find(store => store.id.toString() === values[0]);
            setNewTask({ 
                ...newTask, 
                storeId: parseInt(values[0]), 
                storeName: selectedStore ? selectedStore.storeName : 'Unknown'
            });
        } else {
            setNewTask({ 
                ...newTask, 
                storeId: 0, 
                storeName: ''
            });
        }
    };

    // Reset form function
    const resetForm = () => {
        setNewTask({
            id: 0,
            taskTitle: '',
            taskDesciption: '',
            dueDate: '',
            assignedToId: 0,
            assignedToName: '',
            assignedById: 86,
            status: 'Assigned',
            priority: 'low',
            category: 'Requirement',
            storeId: 0,
            storeName: '',
            storeCity: '',
            taskType: 'requirement'
        });
        setSelectedEmployee([]);
        setSelectedStore([]);
        setStores([]);
        setActiveTab('general');
    };

    const getStatusInfo = (status: string): { icon: React.ReactNode; color: string } => {
        switch (status.toLowerCase()) {
            case 'assigned':
                return { icon: <Clock className="w-4 h-4" />, color: 'bg-purple-100 text-purple-800' };
            case 'work in progress':
                return { icon: <Loader className="w-4 h-4 animate-spin" />, color: 'bg-blue-100 text-blue-800' };
            case 'complete':
                return { icon: <CheckCircle className="w-4 h-4" />, color: 'bg-green-100 text-green-800' };
            default:
                return { icon: <AlertTriangle className="w-4 h-4" />, color: 'bg-gray-100 text-gray-800' };
        }
  };

  return (
        <div className="container mx-auto py-6 px-4 sm:px-6 lg:px-8">
            <div className="mb-6 flex flex-wrap gap-4 items-center">
                <div className="flex-grow lg:flex-grow-0 lg:w-64 flex items-center gap-2">
                    <Input
                        placeholder="Search requirements"
                        value={filters.search}
                        onChange={(e) => handleFilterChange('search', e.target.value)}
                        className="w-full"
                    />
                    <Button onClick={() => setIsModalOpen(true)}>
                        <PlusCircle className="w-4 h-4 mr-2" /> New
          </Button>
        </div>
                <div className="flex-shrink-0">
                    <Button variant="outline" size="sm" className="lg:hidden" onClick={() => setIsFilterDrawerOpen(true)}>
                        <Filter className="w-4 h-4 mr-2" />
                        Filters
                    </Button>
                </div>
                <div className="hidden lg:flex flex-wrap gap-4 items-center">
                    <Select value={filters.employee} onValueChange={(value) => handleFilterChange('employee', value)}>
                        <SelectTrigger className="w-[200px]">
                            <SelectValue placeholder="Filter by employee" />
              </SelectTrigger>
              <SelectContent>
                            <SelectItem value="all">All Employees</SelectItem>
                            {filterEmployees.map((employee) => (
                                <SelectItem key={employee.id} value={employee.id.toString()}>
                                    {employee.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
                    <Select value={filters.priority} onValueChange={(value) => handleFilterChange('priority', value)}>
                        <SelectTrigger className="w-[200px]">
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
                        <SelectTrigger className="w-[200px]">
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
                        <>
                            <div className="flex items-center space-x-2">
                                <Label htmlFor="startDate">From:</Label>
                                <Popover modal={false} open={isStartDatePopoverOpen} onOpenChange={setIsStartDatePopoverOpen}>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            className={`w-[140px] justify-start text-left font-normal ${!filters.startDate && 'text-muted-foreground'}`}
                                        >
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {filters.startDate ? format(new Date(filters.startDate), 'MMM d, yyyy') : <span>Pick start date</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start" side="bottom" onInteractOutside={(e)=>e.preventDefault()} onPointerDownOutside={(e)=>e.preventDefault()}>
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
                            <div className="flex items-center space-x-2">
                                <Label htmlFor="endDate">To:</Label>
                                <Popover modal={false} open={isEndDatePopoverOpen} onOpenChange={setIsEndDatePopoverOpen}>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            className={`w-[140px] justify-start text-left font-normal ${!filters.endDate && 'text-muted-foreground'}`}
                                        >
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {filters.endDate ? format(new Date(filters.endDate), 'MMM d, yyyy') : <span>Pick end date</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start" side="bottom" onInteractOutside={(e)=>e.preventDefault()} onPointerDownOutside={(e)=>e.preventDefault()}>
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
                        </>
                    )}
                </div>
            </div>

            <Dialog open={isModalOpen} onOpenChange={(open: boolean) => {
                setIsModalOpen(open);
                if (!open) {
                    resetForm();
                }
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
                            <div className="grid gap-4">
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
                                                {newTask.dueDate ? format(new Date(newTask.dueDate), 'PPP') : <span>Pick a date</span>}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start" side="bottom" onInteractOutside={(e)=>e.preventDefault()} onPointerDownOutside={(e)=>e.preventDefault()}>
                                            <SpacedCalendar
                                                mode="single"
                                                selected={newTask.dueDate ? new Date(newTask.dueDate) : undefined}
                                                onSelect={(date) => {
                                                    if (date) {
                                                        // Use local date format to avoid timezone issues
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
                                    <SearchableSelect
                                        options={employeeOptions}
                                        value={selectedEmployee}
                                        onChange={handleEmployeeSelect}
                                        placeholder={
                                            isManager && teamMembers.length === 0 && allEmployees.length > 0 ? "Loading team members..." : 
                                            "Select an employee"
                                        }
                                        searchPlaceholder="Search employees..."
                                        className="w-[280px]"
                                    />
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
                                    <SearchableSelect
                                        options={storeOptions}
                                        value={selectedStore}
                                        onChange={handleStoreSelect}
                                        placeholder={isStoresLoading ? "Loading stores..." : "Select a store"}
                                        searchPlaceholder="Search stores..."
                                        className="w-[280px]"
                                        disabled={isStoresLoading}
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
                    <p className="text-gray-500 mt-2">Try adjusting your filters or create a new requirement.</p>
          </div>
        ) : (
                <div className="flex flex-wrap -mx-2">
                    {tasks.map((task, index) => (
                            <motion.div
                                key={task.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.3, delay: index * 0.1 }}
                                className="w-full sm:w-1/2 lg:w-1/3 p-2"
                            >
                                <Card className="relative h-full overflow-visible shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl">
                                    <CardHeader className="pb-2">
                                        <div className="flex justify-between items-center">
                                            <Badge className={`${getStatusInfo(task.status).color} px-3 py-1 rounded-full font-semibold flex items-center space-x-2`}>
                                                {getStatusInfo(task.status).icon} <span>{task.status}</span>
                                            </Badge>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="sm">
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => handleViewStore(task.storeId)}>
                                                        <Building className="mr-2 h-4 w-4" /> View Store
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => handleViewFieldOfficer(task.assignedToId)}>
                                                        <User className="mr-2 h-4 w-4" /> View Field Officer
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem onClick={() => handleStatusChange(task)}>
                                                        <Clock className="mr-2 h-4 w-4" /> Change Status
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem onClick={() => deleteTask(task.id)} className="text-red-600">
                                                        <Trash2 className="mr-2 h-4 w-4" /> Delete Requirement
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                        <CardTitle className="text-xl mt-2">{task.taskTitle || 'Untitled Requirement'}</CardTitle>
                                        <CardDescription className="flex items-center mt-1 text-card-foreground">
                                            <Building className="w-4 h-4 mr-2 text-primary" />
                                            {task.storeName}
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        {task.taskDesciption && (
                                            <div className="relative group mb-4 pb-4 border-b border-border">
                                                <p className="text-sm font-medium text-card-foreground dark:text-white line-clamp-2">
                                                    {task.taskDesciption}
                                                </p>
                                                {task.taskDesciption.length > 80 && (
                                                    <div className="pointer-events-none absolute left-1/2 bottom-full z-50 mb-3 w-full max-w-md -translate-x-1/2 -translate-y-2 rounded-xl border border-primary/40 bg-black p-4 text-white shadow-2xl opacity-0 invisible transition-all duration-200 group-hover:visible group-hover:opacity-100 group-hover:translate-y-0">
                                                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{task.taskDesciption}</p>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        <div className="grid grid-cols-2 gap-4 mb-4">
                                            <div className="flex items-center space-x-2">
                                                <User className="w-4 h-4 text-indigo-500" />
                                                <div>
                                                    <span className="text-sm text-white">Assigned to</span>
                                                    <p className="font-medium">{task.assignedToName}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <Target className="w-4 h-4 text-purple-500" />
                                                <div>
                                                    <span className="text-sm text-white">Priority</span>
                                                    <p className="font-medium capitalize">{task.priority}</p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-2 text-sm text-white">
                                            <CalendarIcon2 className="w-4 h-4" />
                                            <span>Due: {format(new Date(task.dueDate), 'MMM d, yyyy')}</span>
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>
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

            {/* Status Update Modal */}
            <Dialog
                open={isStatusModalOpen}
                onOpenChange={(open) => {
                    if (open) {
                        setIsStatusModalOpen(true);
                    } else {
                        resetStatusModal();
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
                                            {selectedTask.dueDate ? format(new Date(selectedTask.dueDate), 'MMM d, yyyy') : 'Not set'}
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
                                <Button variant="outline" onClick={resetStatusModal}>
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
                        {/* Employee Filter */}
                        <div className="space-y-2">
                            <Label className="text-sm font-medium">Employee</Label>
                            <Select value={filters.employee} onValueChange={(value) => handleFilterChange('employee', value)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Filter by employee" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Employees</SelectItem>
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
                                    <Popover open={isFilterStartDatePopoverOpen} onOpenChange={setIsFilterStartDatePopoverOpen}>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant="outline"
                                                className={`w-full justify-start text-left font-normal ${!filters.startDate && 'text-muted-foreground'}`}
                                            >
                                                <CalendarIcon className="mr-2 h-4 w-4" />
                                                {filters.startDate ? format(new Date(filters.startDate), 'MMM d, yyyy') : <span>Pick start date</span>}
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
                                                {filters.endDate ? format(new Date(filters.endDate), 'MMM d, yyyy') : <span>Pick end date</span>}
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
                        <Button onClick={() => setIsFilterDrawerOpen(false)}>
                            Apply Filters
                        </Button>
                    </SheetFooter>
                </SheetContent>
            </Sheet>
        </div>
    );
};

export default Requirements;
