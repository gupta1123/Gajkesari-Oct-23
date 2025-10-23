"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from "@/components/ui/pagination";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs";
import { useRouter, useParams } from 'next/navigation';
import { CalendarIcon, Edit, Trash2, Search, Check, MessageSquare, ClipboardList, User, Mail, Phone, Store, Tag, MapPin, Building, Flag } from 'lucide-react';
import { format, addDays } from 'date-fns';
import { SpacedCalendar } from '@/components/ui/spaced-calendar';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { API, type StoreDto, type VisitDto, type Note as ApiNote, type BrandProCon } from "@/lib/api";
import BrandTab from "@/components/BrandTab";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { formatDateToUserFriendly } from "@/lib/utils";

const ITEMS_PER_PAGE = 3;

interface CustomerData {
    storeId: number;
    storeName: string;
    clientFirstName: string;
    clientLastName: string;
    primaryContact: number;
    monthlySale: number | null;
    intent: number | null;
    employeeName: string;
    clientType: string | null;
    totalVisitCount: number;
    lastVisitDate: string | null;
    email: string | null;
    city: string;
    state: string;
    country: string | null;
    gstNumber?: string;
    otherClientType?: string;
    addressLine1?: string;
    addressLine2?: string;
    village?: string;
    taluka?: string;
    pincode?: string;
}

interface Visit {
    id: number;
    purpose: string;
    visit_date: string;
    employeeId: number;
    employeeName: string;
    checkinTime?: string;
    checkoutTime?: string;
    state?: string;
}

interface Note {
    id: number;
    content: string;
    createdDate: string;
    employeeName?: string;
}

interface Task {
    id: number;
    taskTitle: string;
    taskDescription: string;
    dueDate: string;
    status: string;
    priority: string;
    assignedToName: string;
    taskType: string;
}

export default function CustomerDetailPage({ customer }: { customer: Record<string, unknown> }) {
    const router = useRouter();
    const params = useParams();
    const storeId = params.id;

    const [customerData, setCustomerData] = useState<Record<string, unknown> | null>(null);
    const [isLoadingCustomer, setIsLoadingCustomer] = useState(true);
    const [notesData, setNotesData] = useState<Note[]>([]);
    const [brandProCons, setBrandProCons] = useState<BrandProCon[]>([]);
    const [visitsData, setVisitsData] = useState<Visit[]>([]);
    const [requirementsData, setRequirementsData] = useState<Task[]>([]);
    const [complaintsData, setComplaintsData] = useState<Task[]>([]);
    const [employees, setEmployees] = useState<Array<Record<string, unknown>>>([]);
    const [stores, setStores] = useState<Array<Record<string, unknown>>>([]);
    const [editingTask, setEditingTask] = useState<Record<string, unknown> | null>(null);
    const [activeInfoTab, setActiveInfoTab] = useState('leads-info');
    const [isEditCustomerModalVisible, setIsEditCustomerModalVisible] = useState(false);
    const [noteContent, setNoteContent] = useState('');
    const [activeActivityTab, setActiveActivityTab] = useState('visits');
    const [editingNoteId, setEditingNoteId] = useState<number | null>(null);
    const [activeTab, setActiveTab] = useState("basic-info");
    const [hasUnlockedAddressTab, setHasUnlockedAddressTab] = useState(false);
    const [formData, setFormData] = useState<Partial<CustomerData>>({
        storeId: 0,
        storeName: '',
        clientFirstName: '',
        clientLastName: '',
        email: '',
        primaryContact: 0,
        gstNumber: '',
        clientType: '',
        otherClientType: '',
        addressLine1: '',
        addressLine2: '',
        village: '',
        taluka: '',
        city: '',
        state: '',
        pincode: '',
    });
    const [isOtherClientType, setIsOtherClientType] = useState(false);

    const [isModalVisible, setIsModalVisible] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [isVisitModalVisible, setIsVisitModalVisible] = useState(false);
    const [isRequirementModalOpen, setIsRequirementModalOpen] = useState(false);
    const [isComplaintModalOpen, setIsComplaintModalOpen] = useState(false);
    const [requirementTask, setRequirementTask] = useState({
        taskTitle: '',
        taskDesciption: '',
        dueDate: '',
        assignedToId: 0,
        assignedToName: '',
        assignedById: 86,
        status: 'Assigned',
        priority: 'low',
        taskType: 'requirement',
        storeId: parseInt(storeId as string),
        category: 'Requirement',
        storeName: ''
    });
    const [requirementActiveTab, setRequirementActiveTab] = useState('general');
    const [complaintTask, setComplaintTask] = useState({
        taskTitle: '',
        taskDesciption: '',
        dueDate: '',
        assignedToId: 0,
        assignedToName: '',
        assignedById: 86,
        status: 'Assigned',
        priority: 'low',
        taskType: 'complaint',
        storeId: parseInt(storeId as string),
        category: 'Complaint',
        storeName: ''
    });
    const [complaintActiveTab, setComplaintActiveTab] = useState('general');
    const [isLoadingStores, setIsLoadingStores] = useState(false);
    const [isLoadingEmployees, setIsLoadingEmployees] = useState(false);
    const [complaintEmployeeSearch, setComplaintEmployeeSearch] = useState('');
    const [requirementEmployeeSearch, setRequirementEmployeeSearch] = useState('');
    const [startDate, setStartDate] = useState(new Date());
    const [endDate, setEndDate] = useState(addDays(new Date(), 5));
    const [showSitesTab, setShowSitesTab] = useState(false);
    const [showMore, setShowMore] = useState({
        visits: true,
        notes: false,
        complaints: false,
        requirements: false,
    });

    const [currentPage, setCurrentPage] = useState({
        visits: 1,
        notes: 1,
        complaints: 1,
        requirements: 1,
    });

    const [filteredVisitsData, setFilteredVisitsData] = useState<Visit[]>([]);
    const [intentData, setIntentData] = useState<Array<Record<string, unknown>>>([]);
    const [salesData, setSalesData] = useState<Array<Record<string, unknown>>>([]);

    const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
    const employeeId = typeof window !== 'undefined' ? localStorage.getItem('employeeId') : null;

    const fetchIntentData = useCallback(async (id: string) => {
        try {
            const response = await fetch(`https://api.gajkesaristeels.in/intent-audit/getByStore?id=${id}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            const data = await response.json();
            setIntentData(data);
        } catch (error) {
            console.error('Error fetching intent data:', error);
        }
    }, [token]);

    const fetchSalesData = useCallback(async (id: string) => {
        try {
            const response = await fetch(`https://api.gajkesaristeels.in/monthly-sale/getByStore?storeId=${id}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            const data = await response.json();
            setSalesData(data);
        } catch (error) {
            console.error('Error fetching sales data:', error);
        }
    }, [token]);

    const fetchCustomerData = useCallback(async (id: string) => {
        try {
            setIsLoadingCustomer(true);
            const response = await fetch(`https://api.gajkesaristeels.in/store/getById?id=${id}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            const data = await response.json();
            setCustomerData(data);

            // Set the visibility of the Sites tab based on clientType
            const validClientTypes = ['builder', 'site visit', 'architect', 'engineer'];
            setShowSitesTab(validClientTypes.includes(data.clientType?.toLowerCase() || ''));
        } catch (error) {
            console.error('Error fetching customer data:', error);
        } finally {
            setIsLoadingCustomer(false);
        }
    }, [token]);

    const fetchNotesData = useCallback(async (id: string) => {
        try {
            const response = await fetch(`https://api.gajkesaristeels.in/notes/getByStore?id=${id}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            const data = await response.json();
            setNotesData(data);
        } catch (error) {
            console.error('Error fetching notes data:', error);
        }
    }, [token]);

    const fetchVisitsData = useCallback(async (id: string) => {
        try {
            const response = await fetch(`https://api.gajkesaristeels.in/visit/getByStore?id=${id}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            const data = await response.json();
            // Sort latest to oldest by visit_date
            const sorted = (data || []).slice().sort((a: Record<string, unknown>, b: Record<string, unknown>) => {
                const da = new Date(a.visit_date as string).getTime();
                const db = new Date(b.visit_date as string).getTime();
                return db - da;
            });
            setVisitsData(sorted);
            setFilteredVisitsData(sorted);
        } catch (error) {
            console.error('Error fetching visits data:', error);
        }
    }, [token]);

    const fetchRequirementsData = useCallback(async (id: string, start: Date, end: Date) => {
        try {
            const response = await fetch(`https://api.gajkesaristeels.in/task/getByStoreAndDate?storeId=${id}&start=${start.toISOString().split('T')[0]}&end=${end.toISOString().split('T')[0]}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            const data = await response.json();
            setRequirementsData(data.filter((task: Record<string, unknown>) => task.taskType === 'requirement'));
        } catch (error) {
            console.error('Error fetching requirements data:', error);
        }
    }, [token]);

    const fetchComplaintsData = useCallback(async (id: string, start: Date, end: Date) => {
        try {
            const response = await fetch(`https://api.gajkesaristeels.in/task/getByStoreAndDate?storeId=${id}&start=${start.toISOString().split('T')[0]}&end=${end.toISOString().split('T')[0]}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            const data = await response.json();
            setComplaintsData(data.filter((task: Record<string, unknown>) => task.taskType === 'complaint'));
        } catch (error) {
            console.error('Error fetching complaints data:', error);
        }
    }, [token]);

    const fetchEmployees = useCallback(async () => {
        try {
            setIsLoadingEmployees(true);
            const response = await fetch('https://api.gajkesaristeels.in/employee/getFieldOfficer', {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            const data = await response.json();
            setEmployees(data);
        } catch (error) {
            console.error('Error fetching field officers:', error);
        } finally {
            setIsLoadingEmployees(false);
        }
    }, [token]);

    const fetchStores = useCallback(async () => {
        try {
            setIsLoadingStores(true);
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
            setIsLoadingStores(false);
        }
    }, [token]);

    const getStoreId = (): string => {
        if (typeof storeId === 'string') {
            return storeId;
        }
        if (Array.isArray(storeId)) {
            return storeId[0];
        }
        return '';
    };

    const getNumericStoreId = useCallback(() => {
        const idString = getStoreId();
        const parsed = parseInt(idString, 10);
        return Number.isNaN(parsed) ? 0 : parsed;
    }, [storeId]);

    const handleCloseNoteModal = useCallback(() => {
        setIsModalVisible(false);
        setIsEditMode(false);
        setNoteContent('');
        setEditingNoteId(null);
    }, []);

    const resetComplaintTaskState = useCallback(() => {
        setComplaintTask({
            taskTitle: '',
            taskDesciption: '',
            dueDate: '',
            assignedToId: 0,
            assignedToName: '',
            assignedById: 86,
            status: 'Assigned',
            priority: 'low',
            taskType: 'complaint',
            storeId: getNumericStoreId(),
            category: 'Complaint',
            storeName: (customerData?.storeName as string) || ''
        });
        setComplaintEmployeeSearch('');
        setComplaintActiveTab('general');
    }, [customerData?.storeName, getNumericStoreId]);

    const resetRequirementTaskState = useCallback(() => {
        setRequirementTask({
            taskTitle: '',
            taskDesciption: '',
            dueDate: '',
            assignedToId: 0,
            assignedToName: '',
            assignedById: 86,
            status: 'Assigned',
            priority: 'low',
            taskType: 'requirement',
            storeId: getNumericStoreId(),
            category: 'Requirement',
            storeName: (customerData?.storeName as string) || ''
        });
        setRequirementEmployeeSearch('');
        setRequirementActiveTab('general');
    }, [customerData?.storeName, getNumericStoreId]);

    const closeComplaintModal = useCallback(() => {
        setIsComplaintModalOpen(false);
        resetComplaintTaskState();
    }, [resetComplaintTaskState]);

    const closeRequirementModal = useCallback(() => {
        setIsRequirementModalOpen(false);
        resetRequirementTaskState();
    }, [resetRequirementTaskState]);

    const closeEditCustomerModal = useCallback(() => {
        setIsEditCustomerModalVisible(false);
        setActiveTab('basic-info');
        setHasUnlockedAddressTab(false);
    }, []);

    const handleCustomerTabChange = useCallback((value: string) => {
        if (value === 'address-info' && !hasUnlockedAddressTab) {
            return;
        }
        setActiveTab(value);
    }, [hasUnlockedAddressTab]);

    const handleAddNote = async () => {
        try {
            const response = await fetch('https://api.gajkesaristeels.in/notes/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    content: noteContent,
                    employeeId: employeeId,
                    storeId: parseInt(storeId as string),
                }),
            });

            if (response.ok) {
                await fetchNotesData(storeId as string);
                handleCloseNoteModal();
                console.log('Note added successfully!');
            }
        } catch (error) {
            console.error('Error creating note:', error);
        }
    };

    const handleEditNote = (note: Note) => {
        setEditingNoteId(note.id);
        setNoteContent(note.content);
        setIsEditMode(true);
        setIsModalVisible(true);
    };

    const handleSaveEditNote = async () => {
        try {
            const response = await fetch(`https://api.gajkesaristeels.in/notes/edit?id=${editingNoteId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    content: noteContent,
                    employeeId: employeeId,
                    storeId: parseInt(storeId as string),
                }),
            });

            if (response.ok) {
                await fetchNotesData(storeId as string);
                handleCloseNoteModal();
                console.log('Note updated successfully!');
            }
        } catch (error) {
            console.error('Error updating note:', error);
        }
    };

    const handleDeleteNote = async (noteId: number) => {
        try {
            const response = await fetch(`https://api.gajkesaristeels.in/notes/delete?id=${noteId}`, {
                method: 'DELETE',
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (response.ok) {
                // Refresh notes data by fetching from API
                await fetchNotesData(storeId as string);
                console.log('Note deleted successfully!');
            }
        } catch (error) {
            console.error('Error deleting note:', error);
        }
    };

    const handleStatusChange = (value: string) => {
        if (value === "All Statuses") {
            setFilteredVisitsData(visitsData);
        } else {
            setFilteredVisitsData(visitsData.filter(visit => getOutcomeStatus(visit).status === value));
        }
    };

    const handlePageChange = (tab: keyof typeof currentPage, page: number) => {
        setCurrentPage(prev => ({ ...prev, [tab]: page }));
    };

    const renderPaginationItems = (tab: keyof typeof currentPage) => {
        const items = [];
        let dataLength;

        switch (tab) {
            case 'visits':
                dataLength = visitsData.length;
                break;
            case 'notes':
                dataLength = notesData.length;
                break;
            case 'complaints':
                dataLength = complaintsData.length;
                break;
            case 'requirements':
                dataLength = requirementsData.length;
                break;
            default:
                dataLength = 0;
        }

        const totalPages = Math.ceil(dataLength / ITEMS_PER_PAGE);

        for (let i = 1; i <= totalPages; i++) {
            if (i === 1 || i === totalPages || (i >= currentPage[tab] - 1 && i <= currentPage[tab] + 1)) {
                items.push(
                    <PaginationItem key={i}>
                        <PaginationLink
                            size="default"
                            isActive={currentPage[tab] === i}
                            onClick={() => handlePageChange(tab, i)}
                        >
                            {i}
                        </PaginationLink>
                    </PaginationItem>
                );
            }
        }
        return items;
    };

    const createTask = async () => {
        try {
            const response = await fetch(`https://api.gajkesaristeels.in/task/getByStoreAndDate?storeId=${storeId}&start=${format(startDate, 'yyyy-MM-dd')}&end=${format(endDate, 'yyyy-MM-dd')}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            const data = await response.json();
            setRequirementsData(data.filter((task: Record<string, unknown>) => task.taskType === 'requirement'));
            setComplaintsData(data.filter((task: Record<string, unknown>) => task.taskType === 'complaint'));
            console.log('Tasks refreshed successfully!');
        } catch (error) {
            console.error('Error fetching updated tasks:', error);
        }
    };

    const getInitials = (name: string) => {
        if (!name) return '';
        const nameParts = name.split(' ');
        return nameParts.map(part => part[0]).join('');
    };

    const handleBackClick = () => {
        if (typeof window !== 'undefined') {
            try {
                const raw = sessionStorage.getItem('nav.return.to');
                if (raw) {
                    const saved = JSON.parse(raw);
                    if (saved?.page === 'complaints') {
                        window.history.back();
                        return;
                    }
                    if (saved?.page === 'requirements') {
                        window.history.back();
                        return;
                    }
                }
            } catch {}
        }
        router.push('/dashboard/customers');
    };

    const addNote = () => {
        setIsEditMode(false);
        setNoteContent('');
        setEditingNoteId(null);
        setIsModalVisible(true);
    };

    const getOutcomeStatus = (visit: Visit) => {
        if (visit.checkinTime && visit.checkoutTime) {
            return { emoji: '✅', status: 'Complete', color: 'bg-purple-100 text-purple-800' };
        } else {
            return { emoji: '📅', status: 'Assigned', color: 'bg-blue-100 text-blue-800' };
        }
    };

    const paginate = <T,>(data: T[], page: number): T[] => {
        const start = (page - 1) * ITEMS_PER_PAGE;
        return data.slice(start, start + ITEMS_PER_PAGE);
    };

    const handleChangeStatus = async (taskId: number, status: string) => {
        try {
            const response = await fetch(`https://api.gajkesaristeels.in/task/updateTask?taskId=${taskId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    status,
                    priority: "Medium",
                }),
            });

            if (response.ok) {
                console.log('Status updated successfully!');
                createTask();
            }
        } catch (error) {
            console.error('Error updating status:', error);
        }
    };

    const handleCustomerEditSubmit = async (data: Partial<CustomerData>) => {
        try {
            const requestData = {
                clientLastName: data.clientLastName,
                email: data.email,
                clientType: data.clientType,
                brandsInUse: [], // Empty array for now
                brandProsCons: [], // Empty array for now
                likes: {} // Empty object for now
            };

            console.log('Sending data:', requestData);

            const response = await fetch(`https://api.gajkesaristeels.in/store/edit?id=${storeId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(requestData),
            });

            if (response.ok) {
                await fetchCustomerData(storeId as string);
                closeEditCustomerModal();
                console.log('Customer updated successfully!');
            } else {
                const errorText = await response.text();
                console.error('Failed to update customer:', response.status, errorText);
            }
        } catch (error) {
            console.error('Error updating customer:', error);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleClientTypeChange = (value: string) => {
        const lowercaseValue = value.toLowerCase();
        setIsOtherClientType(lowercaseValue === 'others');
        setFormData((prev) => ({
            ...prev,
            clientType: lowercaseValue,
            otherClientType: lowercaseValue === 'others' ? prev.otherClientType : '',
        }));
    };

    const handleSubmit = () => {
        const updatedFormData = { ...formData };
        if (isOtherClientType) {
            updatedFormData.clientType = formData.otherClientType || 'Others';
        }
        handleCustomerEditSubmit(updatedFormData);
    };

    const handleComplaintNext = () => {
        setComplaintActiveTab('details');
    };

    const handleComplaintBack = () => {
        setComplaintActiveTab('general');
    };

    const handleCreateComplaint = async () => {
        try {
            const response = await fetch('https://api.gajkesaristeels.in/task/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    ...complaintTask,
                    dueDate: complaintTask.dueDate.split('T')[0],
                    storeId: complaintTask.storeId,
                    taskType: 'complaint'
                }),
            });

            if (response.ok) {
                console.log('Complaint created successfully!');
                await createTask();
                closeComplaintModal();
            } else {
                console.error('Failed to create complaint:', response.statusText);
            }
        } catch (error) {
            console.error('Error creating complaint:', error);
        }
    };

    const handleRequirementNext = () => {
        setRequirementActiveTab('details');
    };

    const handleRequirementBack = () => {
        setRequirementActiveTab('general');
    };

    const handleCreateRequirement = async () => {
        try {
            const response = await fetch('https://api.gajkesaristeels.in/task/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    ...requirementTask,
                    dueDate: requirementTask.dueDate.split('T')[0],
                    storeId: requirementTask.storeId,
                    taskType: 'requirement'
                }),
            });

            if (response.ok) {
                console.log('Requirement created successfully!');
                await createTask();
                closeRequirementModal();
            } else {
                console.error('Failed to create requirement:', response.statusText);
            }
        } catch (error) {
            console.error('Error creating requirement:', error);
        }
    };

    const calculateIntentTrend = () => {
        const dates = intentData.map(item => item.changeDate);
        const intentLevels = intentData.map(item => item.newIntentLevel);
        return { dates, intentLevels };
    };

    const calculateSalesTrend = () => {
        const dates = salesData.map(item => item.visitDate);
        const salesAmounts = salesData.map(item => item.newMonthlySale);
        return { dates, salesAmounts };
    };

    const { dates: intentDates, intentLevels } = calculateIntentTrend();
    const { dates: salesDates, salesAmounts } = calculateSalesTrend();

    const intentChartData = {
        labels: intentDates,
        datasets: [
            {
                label: 'Intent Level',
                data: intentLevels,
                borderColor: 'rgba(75, 192, 192, 1)',
                backgroundColor: 'rgba(75, 192, 192, 0.2)',
                fill: true,
            },
        ],
    };

    const salesChartData = {
        labels: salesDates,
        datasets: [
            {
                label: 'Monthly Sales',
                data: salesAmounts,
                borderColor: 'rgba(153, 102, 255, 1)',
                backgroundColor: 'rgba(153, 102, 255, 0.2)',
                fill: true,
            },
        ],
    };

    useEffect(() => {
        if (token && storeId) {
            fetchCustomerData(storeId as string);
            fetchNotesData(storeId as string);
            fetchVisitsData(storeId as string);
            fetchRequirementsData(storeId as string, startDate, endDate);
            fetchComplaintsData(storeId as string, startDate, endDate);
            fetchEmployees();
            fetchStores();
            fetchIntentData(storeId as string);
            fetchSalesData(storeId as string);
        }
    }, [token, storeId, startDate, endDate, fetchCustomerData, fetchNotesData, fetchVisitsData, fetchRequirementsData, fetchComplaintsData, fetchEmployees, fetchStores, fetchIntentData, fetchSalesData]);

    useEffect(() => {
        if (customerData) {
            const clientType = (customerData.clientType as string)?.toLowerCase() || '';
            const standardClientTypes = ["shop", "site visit", "architect", "engineer"];
            const isStandardType = standardClientTypes.includes(clientType);

            setFormData({
                storeId: customerData.storeId as number,
                storeName: customerData.storeName as string,
                clientFirstName: customerData.clientFirstName as string,
                clientLastName: customerData.clientLastName as string,
                email: (customerData.email as string) || '',
                primaryContact: customerData.primaryContact as number,
                gstNumber: (customerData.gstNumber as string) || '',
                clientType: isStandardType ? clientType : 'others',
                otherClientType: isStandardType ? '' : (customerData.clientType as string) || '',
                addressLine1: (customerData.addressLine1 as string) || '',
                addressLine2: (customerData.addressLine2 as string) || '',
                village: (customerData.district as string) || '',
                taluka: (customerData.subDistrict as string) || '',
                city: customerData.city as string,
                state: customerData.state as string,
                pincode: (customerData.pincode as string) || '',
            });

            setIsOtherClientType(!isStandardType);
        }
    }, [customerData]);

    useEffect(() => {
        const fetchComplaintTaskDetails = async () => {
            if (isComplaintModalOpen && storeId) {
                try {
                    // Fetch employees first
                    await fetchEmployees();

                    // Then fetch task details
                    const response = await fetch(`https://api.gajkesaristeels.in/task/getByStoreAndDate?storeId=${storeId}&start=2024-06-01&end=2024-06-30`, {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                    });
                    const data = await response.json();
                    if (Array.isArray(data) && data.length > 0) {
                        const task = data[0];
                        setComplaintTask(prev => ({
                            ...prev,
                            assignedToId: task.assignedToId,
                            assignedToName: task.assignedToName,
                            storeName: customerData?.storeName || task.storeName
                        }));
                    }
                } catch (error) {
                    console.error('Error fetching task details:', error);
                }
            }
        };

        fetchComplaintTaskDetails();
    }, [isComplaintModalOpen, storeId, token, customerData, fetchEmployees]);

    useEffect(() => {
        const fetchRequirementTaskDetails = async () => {
            if (isRequirementModalOpen && storeId) {
                try {
                    // Fetch employees first
                    await fetchEmployees();

                    // Then fetch task details
                    const response = await fetch(`https://api.gajkesaristeels.in/task/getByStoreAndDate?storeId=${storeId}&start=2024-06-01&end=2024-06-30`, {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                    });
                    const data = await response.json();
                    if (Array.isArray(data) && data.length > 0) {
                        const task = data[0];
                        setRequirementTask(prev => ({
                            ...prev,
                            assignedToId: task.assignedToId,
                            assignedToName: task.assignedToName,
                            storeName: customerData?.storeName || task.storeName
                        }));
                    }
                } catch (error) {
                    console.error('Error fetching requirement task details:', error);
                }
            }
        };

        fetchRequirementTaskDetails();
    }, [isRequirementModalOpen, storeId, token, customerData, fetchEmployees]);

    // Show skeleton loader while customer data is loading
    if (isLoadingCustomer) {
        return (
            <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-1">
                        <Card className="border-0 shadow-sm">
                            <CardHeader className="pb-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <CardTitle className="text-xl font-semibold text-foreground">Customer Details</CardTitle>
                                        <p className="text-sm text-muted-foreground">Customer information and actions</p>
                                    </div>
                                    <Button variant="ghost" size="sm" onClick={handleBackClick}>
                                        <i className="fas fa-arrow-left mr-2"></i> Back
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="flex items-start gap-4">
                                    <Skeleton className="h-14 w-14 rounded-xl" />
                                    <div className="flex-1 min-w-0 space-y-2">
                                        <Skeleton className="h-6 w-32" />
                                        <Skeleton className="h-4 w-24" />
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Skeleton className="h-4 w-16" />
                                        <Skeleton className="h-8 w-full" />
                                    </div>
                                    <div className="space-y-2">
                                        <Skeleton className="h-4 w-20" />
                                        <Skeleton className="h-8 w-full" />
                                    </div>
                                    <div className="space-y-2">
                                        <Skeleton className="h-4 w-24" />
                                        <Skeleton className="h-8 w-full" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                    <div className="lg:col-span-2">
                        <Card className="border-0 shadow-sm">
                            <CardHeader>
                                <CardTitle className="text-xl font-semibold text-foreground">Customer Information</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Skeleton className="h-4 w-20" />
                                        <Skeleton className="h-8 w-full" />
                                    </div>
                                    <div className="space-y-2">
                                        <Skeleton className="h-4 w-16" />
                                        <Skeleton className="h-8 w-full" />
                                    </div>
                                    <div className="space-y-2">
                                        <Skeleton className="h-4 w-24" />
                                        <Skeleton className="h-8 w-full" />
                                    </div>
                                    <div className="space-y-2">
                                        <Skeleton className="h-4 w-18" />
                                        <Skeleton className="h-8 w-full" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1">
                    <Card className="border-0 shadow-sm">
                        <CardContent className="space-y-6">
                            <div className="flex items-start gap-4">
                                <div className="h-14 w-14 rounded-xl border-2 border-dashed bg-muted flex items-center justify-center">
                                    <span className="text-lg font-semibold text-muted-foreground">
                                        {customerData ? getInitials(`${customerData.clientFirstName} ${customerData.clientLastName}`) : ''}
                                    </span>
                                </div>
                                <div className="flex-1 min-w-0 space-y-1">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-lg font-semibold text-foreground truncate max-w-[200px]">
                                            {customerData ? `${customerData.clientFirstName} ${customerData.clientLastName}` : ''}
                                        </h3>
                                        <Button variant="ghost" size="sm" onClick={handleBackClick} className="ml-2 flex-shrink-0">
                                            <i className="fas fa-arrow-left mr-2"></i> Back
                                        </Button>
                                    </div>
                                    <p className="text-sm text-muted-foreground truncate">
                                        {customerData ? (customerData.storeName as string) : ''}
                                    </p>
                                </div>
                            </div>

                            <div className="flex gap-2">
                                <div className="relative group">
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        onClick={() => {
                                            setActiveTab('basic-info');
                                            setHasUnlockedAddressTab(false);
                                            setIsEditCustomerModalVisible(true);
                                        }}
                                        className="h-10 w-10"
                                    >
                                        <Edit className="h-4 w-4" />
                                    </Button>
                                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                                        Edit Customer
                                    </div>
                                </div>

                                <div className="relative group">
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        onClick={() => {
                                            resetComplaintTaskState();
                                            setIsComplaintModalOpen(true);
                                        }}
                                        className="h-10 w-10"
                                    >
                                        <MessageSquare className="h-4 w-4" />
                                    </Button>
                                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                                        Log Complaint
                                    </div>
                                </div>

                                <div className="relative group">
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        onClick={() => {
                                            resetRequirementTaskState();
                                            setIsRequirementModalOpen(true);
                                        }}
                                        className="h-10 w-10"
                                    >
                                        <ClipboardList className="h-4 w-4" />
                                    </Button>
                                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                                        Add Requirement
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="flex border-b">
                                    <button
                                        className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${activeInfoTab === 'leads-info'
                                                ? 'border-primary text-primary'
                                                : 'border-transparent text-muted-foreground hover:text-foreground'
                                            }`}
                                        onClick={() => setActiveInfoTab('leads-info')}
                                    >
                                        Leads Info
                                    </button>
                                    <button
                                        className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${activeInfoTab === 'address-info'
                                                ? 'border-primary text-primary'
                                                : 'border-transparent text-muted-foreground hover:text-foreground'
                                            }`}
                                        onClick={() => setActiveInfoTab('address-info')}
                                    >
                                        Address Info
                                    </button>
                                </div>

                                {activeInfoTab === 'leads-info' && customerData && (
                                    <div className="space-y-3">
                                        <div className="flex items-start gap-3">
                                            <User className="h-4 w-4 text-muted-foreground mt-0.5" />
                                            <div className="min-w-0">
                                                <p className="text-sm font-medium text-muted-foreground">Customer Name</p>
                                                <p className="text-sm text-foreground">{(customerData.clientFirstName as string)} {(customerData.clientLastName as string)}</p>
                                            </div>
                                        </div>
                                        {(customerData.email as string) && (
                                            <div className="flex items-start gap-3">
                                                <Mail className="h-4 w-4 text-muted-foreground mt-0.5" />
                                                <div className="min-w-0">
                                                    <p className="text-sm font-medium text-muted-foreground">Email</p>
                                                    <p className="text-sm text-foreground">{customerData.email as string}</p>
                                                </div>
                                            </div>
                                        )}
                                        <div className="flex items-start gap-3">
                                            <Phone className="h-4 w-4 text-muted-foreground mt-0.5" />
                                            <div className="min-w-0">
                                                <p className="text-sm font-medium text-muted-foreground">Phone</p>
                                                <p className="text-sm text-foreground">{customerData.primaryContact as number}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-3">
                                            <Store className="h-4 w-4 text-muted-foreground mt-0.5" />
                                            <div className="min-w-0">
                                                <p className="text-sm font-medium text-muted-foreground">Store Name</p>
                                                <p className="text-sm text-foreground">{customerData.storeName as string}</p>
                                            </div>
                                        </div>
                                        {(customerData.clientType as string) && (
                                            <div className="flex items-start gap-3">
                                                <Tag className="h-4 w-4 text-muted-foreground mt-0.5" />
                                                <div className="min-w-0">
                                                    <p className="text-sm font-medium text-muted-foreground">Client Type</p>
                                                    <p className="text-sm text-foreground">{customerData.clientType as string}</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {activeInfoTab === 'address-info' && customerData && (
                                    <div className="space-y-3">
                                        {(() => {
                                            const addressParts = [];
                                            if (customerData.addressLine1) addressParts.push(customerData.addressLine1);
                                            if (customerData.addressLine2) addressParts.push(customerData.addressLine2);
                                            if (customerData.village) addressParts.push(customerData.village);
                                            if (customerData.taluka) addressParts.push(customerData.taluka);
                                            if (customerData.city) addressParts.push(customerData.city);
                                            if (customerData.district) addressParts.push(customerData.district);
                                            if (customerData.state) addressParts.push(customerData.state);
                                            if (customerData.pincode) addressParts.push(customerData.pincode);

                                            return addressParts.length > 0 ? (
                                                <div className="flex items-start gap-3">
                                                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-medium text-muted-foreground">Address</p>
                                                        <p className="text-sm text-foreground">{addressParts.join(', ')}</p>
                                                    </div>
                                                </div>
                                            ) : null;
                                        })()}
                                        {(customerData.city as string) && (
                                            <div className="flex items-start gap-3">
                                                <Building className="h-4 w-4 text-muted-foreground mt-0.5" />
                                                <div className="min-w-0">
                                                    <p className="text-sm font-medium text-muted-foreground">City</p>
                                                    <p className="text-sm text-foreground">{customerData.city as string}</p>
                                                </div>
                                            </div>
                                        )}
                                        {(customerData.state as string) && (
                                            <div className="flex items-start gap-3">
                                                <Flag className="h-4 w-4 text-muted-foreground mt-0.5" />
                                                <div className="min-w-0">
                                                    <p className="text-sm font-medium text-muted-foreground">State</p>
                                                    <p className="text-sm text-foreground">{customerData.state as string}</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
                <div className="lg:col-span-2">
                    <Card className="border-0 shadow-sm">
                        <CardHeader className="pb-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="text-xl font-semibold text-foreground">Customer Activity</CardTitle>
                                    <p className="text-sm text-muted-foreground">View visits, notes, complaints, and requirements</p>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-6">
                                <div className="flex border-b">
                                    <button
                                        className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeActivityTab === 'visits'
                                                ? 'border-primary text-primary'
                                                : 'border-transparent text-muted-foreground hover:text-foreground'
                                            }`}
                                        onClick={() => setActiveActivityTab('visits')}
                                    >
                                        <i className="fas fa-calendar-check"></i> Visits
                                    </button>
                                    <button
                                        className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeActivityTab === 'brands'
                                                ? 'border-primary text-primary'
                                                : 'border-transparent text-muted-foreground hover:text-foreground'
                                                }`}
                                        onClick={() => setActiveActivityTab('brands')}
                                    >
                                        <i className="fas fa-building"></i> Brands
                                    </button>
                                    <button
                                        className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeActivityTab === 'notes'
                                                ? 'border-primary text-primary'
                                                : 'border-transparent text-muted-foreground hover:text-foreground'
                                            }`}
                                        onClick={() => setActiveActivityTab('notes')}
                                    >
                                        <i className="fas fa-sticky-note"></i> Notes
                                    </button>
                                    <button
                                        className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeActivityTab === 'complaints'
                                                ? 'border-primary text-primary'
                                                : 'border-transparent text-muted-foreground hover:text-foreground'
                                            }`}
                                        onClick={() => setActiveActivityTab('complaints')}
                                    >
                                        <i className="fas fa-exclamation-circle"></i> Complaints
                                    </button>
                                    <button
                                        className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeActivityTab === 'requirements'
                                                ? 'border-primary text-primary'
                                                : 'border-transparent text-muted-foreground hover:text-foreground'
                                            }`}
                                        onClick={() => setActiveActivityTab('requirements')}
                                    >
                                        <i className="fas fa-tasks"></i> Requirements
                                    </button>
                                    {showSitesTab && (
                                        <button
                                            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeActivityTab === 'sites'
                                                    ? 'border-primary text-primary'
                                                    : 'border-transparent text-muted-foreground hover:text-foreground'
                                                }`}
                                            onClick={() => setActiveActivityTab('sites')}
                                        >
                                            <i className="fas fa-map-marker-alt"></i> Sites
                                        </button>
                                    )}
                                </div>

                                {activeActivityTab === 'visits' && (
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-4">
                                            <select
                                                onChange={(e) => handleStatusChange(e.target.value)}
                                                className="px-3 py-2 border border-input bg-background rounded-md text-sm"
                                            >
                                                <option value="All Statuses">All Statuses</option>
                                                <option value="Assigned">Assigned</option>
                                                <option value="On Going">On Going</option>
                                                <option value="Complete">Complete</option>
                                            </select>
                                        </div>
                                        <div className="space-y-3">
                                            {paginate(filteredVisitsData, currentPage.visits).map((visit, index) => {
                                                const { emoji, status, color } = getOutcomeStatus(visit);
                                                return (
                                                    <div key={index} className="rounded-lg border bg-card p-4">
                                                        <div className="flex items-center justify-between mb-2">
                                                            <div className="flex items-center gap-2">
                                                                <i className="fas fa-calendar-alt text-muted-foreground"></i>
                                                                <span className="text-sm font-medium">Visit scheduled by {visit.employeeName}</span>
                                                            </div>
                                                            <span className="text-xs text-muted-foreground">{formatDateToUserFriendly(visit.visit_date)}</span>
                                                        </div>
                                                        <p className="text-sm text-foreground mb-3">{visit.purpose}</p>
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-4">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-xs text-muted-foreground">Status:</span>
                                                                    <Badge variant="secondary" className={color}>{emoji} {status}</Badge>
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-xs text-muted-foreground">Purpose:</span>
                                                                    <span className="text-xs text-primary">{visit.purpose}</span>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                                                                    {getInitials(visit.employeeName)}
                                                                </div>
                                                                <span className="text-xs text-muted-foreground">{visit.employeeName}</span>
                                                            </div>
                                                        </div>
                                                        <div className="flex justify-end mt-3">
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => router.push(`/dashboard/visits/${visit.id}`)}
                                                                className="text-xs"
                                                            >
                                                                View Visit
                                                            </Button>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                        {showMore.visits && visitsData.length > ITEMS_PER_PAGE && (
                                            <Pagination>
                                                <PaginationPrevious
                                                    size="default"
                                                    onClick={currentPage.visits === 1 ? undefined : () => setCurrentPage(prev => ({ ...prev, visits: Math.max(prev.visits - 1, 1) }))}
                                                />
                                                <PaginationContent>
                                                    {renderPaginationItems('visits')}
                                                </PaginationContent>
                                                <PaginationNext
                                                    size="default"
                                                    onClick={currentPage.visits === Math.ceil(visitsData.length / ITEMS_PER_PAGE) ? undefined : () => setCurrentPage(prev => ({ ...prev, visits: Math.min(prev.visits + 1, Math.ceil(visitsData.length / ITEMS_PER_PAGE)) }))}
                                                />
                                            </Pagination>
                                        )}
                                        {visitsData.length > 3 && (
                                            <Button variant="outline" onClick={() => setShowMore(prev => ({ ...prev, visits: !prev.visits }))}>
                                                {showMore.visits ? 'Show Less' : 'Show More'}
                                            </Button>
                                        )}
                                    </div>
                                )}

                                {activeActivityTab === 'brands' && (
                                    <div className="space-y-4">
                                        <BrandTab
                                            brands={brandProCons}
                                            setBrands={setBrandProCons}
                                            visitId={String(visitsData[0]?.id || '')}
                                            token={localStorage.getItem('authToken')}
                                            fetchVisitDetail={async () => {
                                                // Refresh visits/brands after any change
                                                if (storeId) {
                                                    await fetchVisitsData(String(storeId));
                                                }
                                            }}
                                        />
                                    </div>
                                )}

                                {activeActivityTab === 'notes' && (
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-4">
                                            <Button onClick={addNote}>
                                                <i className="fas fa-plus mr-2"></i> Add Note
                                            </Button>
                                        </div>
                                        <div className="space-y-3">
                                            {paginate(notesData, currentPage.notes).map((note) => (
                                                <div key={note.id} className="rounded-lg border bg-card p-4">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <span className="text-xs text-muted-foreground">{formatDateToUserFriendly(note.createdDate)}</span>
                                                        <div className="flex items-center gap-2">
                                                            <Button variant="ghost" size="sm" onClick={() => handleEditNote(note)}>
                                                                <Edit className="h-3 w-3 mr-1" />
                                                                Edit
                                                            </Button>
                                                            <Button variant="ghost" size="sm" onClick={() => handleDeleteNote(note.id)}>
                                                                <Trash2 className="h-3 w-3 mr-1" />
                                                                Delete
                                                            </Button>
                                                        </div>
                                                    </div>
                                                    <div className="text-sm text-foreground">{note.content}</div>
                                                </div>
                                            ))}
                                        </div>
                                        {showMore.notes && notesData.length > ITEMS_PER_PAGE && (
                                            <Pagination>
                                                <PaginationPrevious
                                                    size="default"
                                                    onClick={currentPage.notes === 1 ? undefined : () => setCurrentPage(prev => ({ ...prev, notes: Math.max(prev.notes - 1, 1) }))}
                                                />
                                                <PaginationContent>
                                                    {renderPaginationItems('notes')}
                                                </PaginationContent>
                                                <PaginationNext
                                                    size="default"
                                                    onClick={currentPage.notes === Math.ceil(notesData.length / ITEMS_PER_PAGE) ? undefined : () => setCurrentPage(prev => ({ ...prev, notes: Math.min(prev.notes + 1, Math.ceil(notesData.length / ITEMS_PER_PAGE)) }))}
                                                />
                                            </Pagination>
                                        )}
                                        {notesData.length > 3 && (
                                            <Button variant="outline" onClick={() => setShowMore(prev => ({ ...prev, notes: !prev.notes }))}>
                                                {showMore.notes ? 'Show Less' : 'Show More'}
                                            </Button>
                                        )}
                                    </div>
                                )}

                                {activeActivityTab === 'complaints' && (
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-4">
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <Button variant="outline" className={`w-[200px] justify-start text-left font-normal ${!startDate && 'text-muted-foreground'}`}>
                                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                                        {startDate ? format(new Date(startDate), 'PPP') : <span>Start Date</span>}
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-auto p-0">
                                                    <SpacedCalendar
                                                        mode="single"
                                                        selected={startDate}
                                                        onSelect={(date: Date | undefined) => {
                                                            setStartDate(date || new Date());
                                                            setEndDate(addDays(date || new Date(), 5));
                                                        }}
                                                        initialFocus
                                                    />
                                                </PopoverContent>
                                            </Popover>
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <Button variant="outline" className={`w-[200px] justify-start text-left font-normal ${!endDate && 'text-muted-foreground'}`}>
                                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                                        {endDate ? format(new Date(endDate), 'PPP') : <span>End Date</span>}
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-auto p-0">
                                                    <SpacedCalendar
                                                        mode="single"
                                                        selected={endDate}
                                                        onSelect={(date) => setEndDate(date || new Date())}
                                                        initialFocus
                                                    />
                                                </PopoverContent>
                                            </Popover>
                                        </div>
                                        <div className="space-y-3">
                                            {paginate(complaintsData, currentPage.complaints).map((complaint) => (
                                                <div key={complaint.id} className="rounded-lg border bg-card p-4">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <div className="flex items-center gap-2">
                                                            <i className="fas fa-exclamation-circle text-muted-foreground"></i>
                                                            <span className="text-sm font-medium">{complaint.taskTitle}</span>
                                                        </div>
                                                        <span className="text-xs text-muted-foreground">Due: {new Date(complaint.dueDate).toLocaleDateString()}</span>
                                                    </div>
                                                    <p className="text-sm text-foreground mb-3">{complaint.taskDescription}</p>
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-4">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-xs text-muted-foreground">Status:</span>
                                                                <select
                                                                    onChange={(e) => handleChangeStatus(complaint.id, e.target.value)}
                                                                    value={complaint.status}
                                                                    className="px-2 py-1 border border-input bg-background rounded text-xs"
                                                                >
                                                                    <option value="Assigned">Assigned</option>
                                                                    <option value="On Going">On Going</option>
                                                                    <option value="Complete">Complete</option>
                                                                </select>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-xs text-muted-foreground">Priority:</span>
                                                                <Badge variant="outline">{complaint.priority}</Badge>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                                                                {getInitials(complaint.assignedToName)}
                                                            </div>
                                                            <span className="text-xs text-muted-foreground">{complaint.assignedToName}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        {showMore.complaints && complaintsData.length > ITEMS_PER_PAGE && (
                                            <Pagination>
                                                <PaginationPrevious
                                                    size="default"
                                                    onClick={currentPage.complaints === 1 ? undefined : () => setCurrentPage(prev => ({ ...prev, complaints: Math.max(prev.complaints - 1, 1) }))}
                                                />
                                                <PaginationContent>
                                                    {renderPaginationItems('complaints')}
                                                </PaginationContent>
                                                <PaginationNext
                                                    size="default"
                                                    onClick={currentPage.complaints === Math.ceil(complaintsData.length / ITEMS_PER_PAGE) ? undefined : () => setCurrentPage(prev => ({ ...prev, complaints: Math.min(prev.complaints + 1, Math.ceil(complaintsData.length / ITEMS_PER_PAGE)) }))}
                                                />
                                            </Pagination>
                                        )}
                                        {complaintsData.length > 3 && (
                                            <Button variant="outline" onClick={() => setShowMore(prev => ({ ...prev, complaints: !prev.complaints }))}>
                                                {showMore.complaints ? 'Show Less' : 'Show More'}
                                            </Button>
                                        )}
                                    </div>
                                )}

                                {activeActivityTab === 'requirements' && (
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-4">
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <Button variant="outline" className={`w-[200px] justify-start text-left font-normal ${!startDate && 'text-muted-foreground'}`}>
                                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                                        {startDate ? format(new Date(startDate), 'PPP') : <span>Start Date</span>}
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-auto p-0">
                                                    <SpacedCalendar
                                                        mode="single"
                                                        selected={startDate}
                                                        onSelect={(date: Date | undefined) => {
                                                            setStartDate(date || new Date());
                                                            setEndDate(addDays(date || new Date(), 5));
                                                        }}
                                                        initialFocus
                                                    />
                                                </PopoverContent>
                                            </Popover>
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <Button variant="outline" className={`w-[200px] justify-start text-left font-normal ${!endDate && 'text-muted-foreground'}`}>
                                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                                        {endDate ? format(new Date(endDate), 'PPP') : <span>End Date</span>}
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-auto p-0">
                                                    <SpacedCalendar
                                                        mode="single"
                                                        selected={endDate}
                                                        onSelect={(date) => setEndDate(date || new Date())}
                                                        initialFocus
                                                    />
                                                </PopoverContent>
                                            </Popover>
                                        </div>
                                        <div className="space-y-3">
                                            {paginate(requirementsData, currentPage.requirements).map((requirement) => (
                                                <div key={requirement.id} className="rounded-lg border bg-card p-4">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <div className="flex items-center gap-2">
                                                            <i className="fas fa-tasks text-muted-foreground"></i>
                                                            <span className="text-sm font-medium">{requirement.taskTitle}</span>
                                                        </div>
                                                        <span className="text-xs text-muted-foreground">Due: {new Date(requirement.dueDate).toLocaleDateString()}</span>
                                                    </div>
                                                    <p className="text-sm text-foreground mb-3">{requirement.taskDescription}</p>
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-4">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-xs text-muted-foreground">Status:</span>
                                                                <select
                                                                    onChange={(e) => handleChangeStatus(requirement.id, e.target.value)}
                                                                    value={requirement.status}
                                                                    className="px-2 py-1 border border-input bg-background rounded text-xs"
                                                                >
                                                                    <option value="Assigned">Assigned</option>
                                                                    <option value="On Going">On Going</option>
                                                                    <option value="Complete">Complete</option>
                                                                </select>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-xs text-muted-foreground">Priority:</span>
                                                                <Badge variant="outline">{requirement.priority}</Badge>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                                                                {getInitials(requirement.assignedToName)}
                                                            </div>
                                                            <span className="text-xs text-muted-foreground">{requirement.assignedToName}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        {showMore.requirements && requirementsData.length > ITEMS_PER_PAGE && (
                                            <Pagination>
                                                <PaginationPrevious
                                                    size="default"
                                                    onClick={currentPage.requirements === 1 ? undefined : () => setCurrentPage(prev => ({ ...prev, requirements: Math.max(prev.requirements - 1, 1) }))}
                                                />
                                                <PaginationContent>
                                                    {renderPaginationItems('requirements')}
                                                </PaginationContent>
                                                <PaginationNext
                                                    size="default"
                                                    onClick={currentPage.requirements === Math.ceil(requirementsData.length / ITEMS_PER_PAGE) ? undefined : () => setCurrentPage(prev => ({ ...prev, requirements: Math.min(prev.requirements + 1, Math.ceil(requirementsData.length / ITEMS_PER_PAGE)) }))}
                                                />
                                            </Pagination>
                                        )}
                                        {requirementsData.length > 3 && (
                                            <Button variant="outline" onClick={() => setShowMore(prev => ({ ...prev, requirements: !prev.requirements }))}>
                                                {showMore.requirements ? 'Show Less' : 'Show More'}
                                            </Button>
                                        )}
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Modals */}
            <Dialog
                open={isModalVisible}
                onOpenChange={(open) => {
                    if (!open) {
                        handleCloseNoteModal();
                    }
                }}
            >
                <DialogContent className="max-w-md border-0 shadow-lg max-h-[85vh] overflow-y-auto">
                    <DialogHeader className="gap-1">
                        <DialogTitle>{isEditMode ? "Edit Note" : "Add Note"}</DialogTitle>
                        <DialogDescription>
                            Add quick context so everyone stays aligned on this customer.
                        </DialogDescription>
                    </DialogHeader>
                    <Textarea
                        placeholder="Write a note that teammates can follow up on..."
                        value={noteContent}
                        onChange={(e) => setNoteContent(e.target.value)}
                        className="min-h-[140px]"
                    />
                    <DialogFooter>
                        <Button variant="outline" onClick={handleCloseNoteModal}>
                            Cancel
                        </Button>
                        <Button onClick={isEditMode ? handleSaveEditNote : handleAddNote}>
                            {isEditMode ? "Update Note" : "Add Note"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog
                open={isEditCustomerModalVisible}
                onOpenChange={(open) => {
                    if (!open) {
                        closeEditCustomerModal();
                    }
                }}
            >
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader className="gap-1">
                        <DialogTitle>Edit Customer</DialogTitle>
                        <DialogDescription>
                            Update customer contact or address details.
                        </DialogDescription>
                    </DialogHeader>
                    <Tabs value={activeTab} onValueChange={handleCustomerTabChange} className="w-full">
                        <TabsList className="grid w-full grid-cols-2 mb-6">
                            <TabsTrigger value="basic-info" className="flex items-center gap-2">
                                <span>Basic Info</span>
                            </TabsTrigger>
                            <TabsTrigger
                                value="address-info"
                                className="flex items-center gap-2"
                                disabled={!hasUnlockedAddressTab && activeTab !== "address-info"}
                            >
                                <span>Address Info</span>
                            </TabsTrigger>
                        </TabsList>
                        <TabsContent value="basic-info">
                            <div className="space-y-6 py-2">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-3">
                                        <Label htmlFor="storeName" className="text-sm font-medium text-foreground">
                                            Store Name
                                        </Label>
                                        <Input
                                            id="storeName"
                                            name="storeName"
                                            value={formData.storeName}
                                            disabled
                                            className="h-11 bg-muted text-muted-foreground font-medium cursor-not-allowed"
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            Store name is managed centrally; contact your admin to update it.
                                        </p>
                                    </div>
                                    <div className="space-y-3">
                                        <Label htmlFor="gstNumber" className="text-sm font-medium text-foreground">
                                            GST Number
                                        </Label>
                                        <Input
                                            id="gstNumber"
                                            name="gstNumber"
                                            value={formData.gstNumber}
                                            onChange={handleInputChange}
                                            placeholder="Enter GST number"
                                            className="h-11"
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-3">
                                        <Label htmlFor="clientFirstName" className="text-sm font-medium text-foreground">
                                            First Name *
                                        </Label>
                                        <Input
                                            id="clientFirstName"
                                            name="clientFirstName"
                                            value={formData.clientFirstName}
                                            onChange={handleInputChange}
                                            placeholder="Enter first name"
                                            className="h-11"
                                        />
                                    </div>
                                    <div className="space-y-3">
                                        <Label htmlFor="clientLastName" className="text-sm font-medium text-foreground">
                                            Last Name *
                                        </Label>
                                        <Input
                                            id="clientLastName"
                                            name="clientLastName"
                                            value={formData.clientLastName}
                                            onChange={handleInputChange}
                                            placeholder="Enter last name"
                                            className="h-11"
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-3">
                                        <Label htmlFor="email" className="text-sm font-medium text-foreground">
                                            Email
                                        </Label>
                                        <Input
                                            id="email"
                                            name="email"
                                            type="email"
                                            value={formData.email || ""}
                                            onChange={handleInputChange}
                                            placeholder="Enter email address"
                                            className="h-11"
                                        />
                                    </div>
                                    <div className="space-y-3">
                                        <Label htmlFor="primaryContact" className="text-sm font-medium text-foreground">
                                            Phone
                                        </Label>
                                        <Input
                                            id="primaryContact"
                                            name="primaryContact"
                                            value={formData.primaryContact}
                                            disabled
                                            className="h-11 bg-muted text-muted-foreground font-medium cursor-not-allowed"
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            Phone numbers sync from customer master and can’t be changed here.
                                        </p>
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <Label htmlFor="clientType" className="text-sm font-medium text-foreground">
                                        Client Type
                                    </Label>
                                    <Select onValueChange={handleClientTypeChange} value={formData.clientType || ""}>
                                        <SelectTrigger className="h-11">
                                            <SelectValue placeholder="Select Client Type" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="shop">Shop</SelectItem>
                                            <SelectItem value="site visit">Site Visit</SelectItem>
                                            <SelectItem value="architect">Architect</SelectItem>
                                            <SelectItem value="engineer">Engineer</SelectItem>
                                            <SelectItem value="others">Others</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                {isOtherClientType && (
                                    <div className="space-y-3">
                                        <Label htmlFor="otherClientType" className="text-sm font-medium text-foreground">
                                            Other Client Type
                                        </Label>
                                        <Input
                                            id="otherClientType"
                                            name="otherClientType"
                                            value={formData.otherClientType}
                                            placeholder="Enter client type"
                                            className="h-11"
                                            onChange={handleInputChange}
                                        />
                                    </div>
                                )}
                                <div className="flex items-center justify-between pt-4 border-t">
                                    <Button variant="ghost" onClick={closeEditCustomerModal}>
                                        Cancel
                                    </Button>
                                    <Button
                                        className="h-11 px-6"
                                        onClick={() => {
                                            setHasUnlockedAddressTab(true);
                                            setActiveTab("address-info");
                                        }}
                                    >
                                        Continue
                                    </Button>
                                </div>
                            </div>
                        </TabsContent>
                        <TabsContent value="address-info">
                            <div className="space-y-6 py-2">
                                <div className="space-y-3">
                                    <Label htmlFor="addressLine1" className="text-sm font-medium text-foreground">
                                        Address Line 1
                                    </Label>
                                    <Input
                                        id="addressLine1"
                                        name="addressLine1"
                                        value={formData.addressLine1}
                                        onChange={handleInputChange}
                                        placeholder="Enter address line 1"
                                        className="h-11"
                                    />
                                </div>
                                <div className="space-y-3">
                                    <Label htmlFor="addressLine2" className="text-sm font-medium text-foreground">
                                        Address Line 2
                                    </Label>
                                    <Input
                                        id="addressLine2"
                                        name="addressLine2"
                                        value={formData.addressLine2}
                                        onChange={handleInputChange}
                                        placeholder="Enter address line 2"
                                        className="h-11"
                                    />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-3">
                                        <Label htmlFor="village" className="text-sm font-medium text-foreground">
                                            Village (District)
                                        </Label>
                                        <Input
                                            id="village"
                                            name="village"
                                            value={formData.village}
                                            onChange={handleInputChange}
                                            placeholder="Enter village"
                                            className="h-11"
                                        />
                                    </div>
                                    <div className="space-y-3">
                                        <Label htmlFor="taluka" className="text-sm font-medium text-foreground">
                                            Taluka (Sub District)
                                        </Label>
                                        <Input
                                            id="taluka"
                                            name="taluka"
                                            value={formData.taluka}
                                            onChange={handleInputChange}
                                            placeholder="Enter taluka"
                                            className="h-11"
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="space-y-3">
                                        <Label htmlFor="city" className="text-sm font-medium text-foreground">
                                            City
                                        </Label>
                                        <Input
                                            id="city"
                                            name="city"
                                            value={formData.city}
                                            onChange={handleInputChange}
                                            placeholder="Enter city"
                                            className="h-11"
                                        />
                                    </div>
                                    <div className="space-y-3">
                                        <Label htmlFor="state" className="text-sm font-medium text-foreground">
                                            State
                                        </Label>
                                        <Input
                                            id="state"
                                            name="state"
                                            value={formData.state}
                                            onChange={handleInputChange}
                                            placeholder="Enter state"
                                            className="h-11"
                                        />
                                    </div>
                                    <div className="space-y-3">
                                        <Label htmlFor="pincode" className="text-sm font-medium text-foreground">
                                            Pincode
                                        </Label>
                                        <Input
                                            id="pincode"
                                            name="pincode"
                                            value={formData.pincode}
                                            onChange={handleInputChange}
                                            placeholder="Enter pincode"
                                            className="h-11"
                                        />
                                    </div>
                                </div>
                                <div className="flex flex-wrap items-center justify-between gap-2 pt-4 border-t">
                                    <div className="flex gap-2">
                                        <Button variant="outline" onClick={() => setActiveTab("basic-info")} className="h-11 px-6">
                                            Back
                                        </Button>
                                        <Button variant="ghost" onClick={closeEditCustomerModal} className="h-11 px-6">
                                            Cancel
                                        </Button>
                                    </div>
                                    <Button onClick={handleSubmit} className="h-11 px-6">
                                        Save Changes
                                    </Button>
                                </div>
                            </div>
                        </TabsContent>
                    </Tabs>
                </DialogContent>
            </Dialog>

            {/* Log Complaint Modal */}
            {isComplaintModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <Card className="w-full max-w-2xl border-0 shadow-lg max-h-[90vh] overflow-y-auto">
                        <CardHeader className="pb-4">
                            <CardTitle className="text-lg md:text-xl font-semibold text-foreground">Log Complaint</CardTitle>
                            <p className="text-xs md:text-sm text-muted-foreground">
                                Capture the complaint details and assign the right teammate to resolve it.
                            </p>
                        </CardHeader>
                        <CardContent>
                            <Tabs value={complaintActiveTab} onValueChange={setComplaintActiveTab} className="w-full">
                                <TabsList className="grid w-full grid-cols-2 mb-4">
                                    <TabsTrigger value="general">General</TabsTrigger>
                                    <TabsTrigger value="details">Details</TabsTrigger>
                                </TabsList>
                                <TabsContent value="general">
                                    <div className="space-y-6 py-2">
                                        <div className="space-y-3">
                                            <Label htmlFor="complaintTitle" className="text-sm font-medium text-foreground">
                                                Complaint Title *
                                            </Label>
                                            <Input
                                                id="complaintTitle"
                                                placeholder="Add a short title"
                                                value={complaintTask.taskTitle}
                                                onChange={(e) => setComplaintTask({ ...complaintTask, taskTitle: e.target.value })}
                                                className="w-full h-11"
                                            />
                                        </div>
                                        <div className="space-y-3">
                                            <Label htmlFor="complaintDescription" className="text-sm font-medium text-foreground">
                                                Complaint Description *
                                            </Label>
                                            <Textarea
                                                id="complaintDescription"
                                                placeholder="Describe the complaint so the assignee has the right context..."
                                                value={complaintTask.taskDesciption}
                                                onChange={(e) => setComplaintTask({ ...complaintTask, taskDesciption: e.target.value })}
                                                className="min-h-[140px]"
                                            />
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="complaintCategory" className="text-sm font-medium text-foreground">
                                                    Category
                                                </Label>
                                                <Input
                                                    id="complaintCategory"
                                                    value="Complaint"
                                                    readOnly
                                                    className="h-11 bg-muted text-muted-foreground font-medium cursor-not-allowed"
                                                />
                                                <p className="text-xs text-muted-foreground">
                                                    Category is fixed for complaint records.
                                                </p>
                                            </div>
                                            <div className="space-y-3">
                                                <Label htmlFor="complaintStoreName" className="text-sm font-medium text-foreground">
                                                    Store
                                                </Label>
                                                <Input
                                                    id="complaintStoreName"
                                                    value={(customerData?.storeName as string) || 'Loading...'}
                                                    disabled
                                                    className="w-full h-11 bg-muted text-muted-foreground font-medium cursor-not-allowed"
                                                />
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between pt-4 border-t">
                                            <Button variant="ghost" onClick={closeComplaintModal}>
                                                Cancel
                                            </Button>
                                            <Button onClick={handleComplaintNext} className="h-11 px-6">
                                                Continue
                                            </Button>
                                        </div>
                                    </div>
                                </TabsContent>
                                <TabsContent value="details">
                                    <div className="space-y-6 py-2">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-3">
                                                <Label htmlFor="complaintDueDate" className="text-sm font-medium text-foreground">
                                                    Due Date
                                                </Label>
                                                <Popover>
                                                    <PopoverTrigger asChild>
                                                        <Button
                                                            variant="outline"
                                                            className={`w-full h-11 justify-start text-left font-normal ${!complaintTask.dueDate && 'text-muted-foreground'}`}
                                                        >
                                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                                            {complaintTask.dueDate ? format(new Date(complaintTask.dueDate), 'PPP') : <span>Select due date</span>}
                                                        </Button>
                                                    </PopoverTrigger>
                                                    <PopoverContent className="w-auto p-0">
                                                        <SpacedCalendar
                                                            mode="single"
                                                            selected={complaintTask.dueDate ? new Date(complaintTask.dueDate + 'T00:00:00') : undefined}
                                                            onSelect={(date: Date | undefined) => {
                                                                if (date) {
                                                                    const year = date.getFullYear();
                                                                    const month = String(date.getMonth() + 1).padStart(2, '0');
                                                                    const day = String(date.getDate()).padStart(2, '0');
                                                                    const dateString = `${year}-${month}-${day}`;
                                                                    setComplaintTask({ ...complaintTask, dueDate: dateString });
                                                                }
                                                            }}
                                                            initialFocus
                                                        />
                                                    </PopoverContent>
                                                </Popover>
                                            </div>
                                            <div className="space-y-3">
                                                <Label htmlFor="complaintPriority" className="text-sm font-medium text-foreground">
                                                    Priority
                                                </Label>
                                                <Select value={complaintTask.priority} onValueChange={(value) => setComplaintTask({ ...complaintTask, priority: value })}>
                                                    <SelectTrigger className="w-full h-11">
                                                        <SelectValue placeholder="Select a priority" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="low">Low</SelectItem>
                                                        <SelectItem value="medium">Medium</SelectItem>
                                                        <SelectItem value="high">High</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                        <div className="space-y-3">
                                            <Label htmlFor="complaintAssignedTo" className="text-sm font-medium text-foreground">
                                                Assigned To
                                            </Label>
                                            {isLoadingEmployees ? (
                                                <div className="w-full h-11 bg-muted rounded-md flex items-center justify-center">
                                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                                                    <span className="ml-2 text-sm text-muted-foreground">Loading employees...</span>
                                                </div>
                                            ) : (
                                                <Popover>
                                                    <PopoverTrigger asChild>
                                                        <Button
                                                            variant="outline"
                                                            role="combobox"
                                                            className="w-full h-11 justify-between"
                                                        >
                                                            {complaintTask.assignedToId > 0
                                                                ? employees.find(emp => emp.id === complaintTask.assignedToId)
                                                                    ? `${employees.find(emp => emp.id === complaintTask.assignedToId)?.firstName} ${employees.find(emp => emp.id === complaintTask.assignedToId)?.lastName}${employees.find(emp => emp.id === complaintTask.assignedToId)?.employeeId ? ` (${employees.find(emp => emp.id === complaintTask.assignedToId)?.employeeId})` : ''}`
                                                                    : "Select an employee"
                                                                : "Select an employee"}
                                                            <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                        </Button>
                                                    </PopoverTrigger>
                                                    <PopoverContent className="w-[--radix-popover-trigger-width] max-h-[200px] p-0">
                                                        <div className="p-2 border-b">
                                                            <div className="relative">
                                                                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                                                <Input
                                                                    placeholder="Search employees..."
                                                                    value={complaintEmployeeSearch}
                                                                    onChange={(e) => setComplaintEmployeeSearch(e.target.value)}
                                                                    className="pl-8 border-0 focus-visible:ring-0"
                                                                />
                                                            </div>
                                                        </div>
                                                        <ScrollArea className="max-h-[150px]">
                                                            <div className="p-1">
                                                                {employees
                                                                    .filter((employee) =>
                                                                        `${employee.firstName} ${employee.lastName}`.toLowerCase().includes(complaintEmployeeSearch.toLowerCase())
                                                                    )
                                                                    .map((employee) => (
                                                                        <Button
                                                                            key={employee.id as string}
                                                                            variant="ghost"
                                                                            className="w-full justify-start font-normal h-9 px-2"
                                                                            onClick={() => {
                                                                                setComplaintTask({
                                                                                    ...complaintTask,
                                                                                    assignedToId: employee.id as number,
                                                                                    assignedToName: `${employee.firstName} ${employee.lastName}`
                                                                                });
                                                                                setComplaintEmployeeSearch('');
                                                                            }}
                                                                        >
                                                                            <Check
                                                                                className={`mr-2 h-4 w-4 ${complaintTask.assignedToId === employee.id ? "opacity-100" : "opacity-0"
                                                                                    }`}
                                                                            />
                                                                            <span className="truncate">
                                                                                {(employee.firstName as string)} {(employee.lastName as string)}
                                                                                {employee.employeeId ? ` (${employee.employeeId})` : ''}
                                                                            </span>
                                                                        </Button>
                                                                    ))}
                                                                {employees.filter((employee) =>
                                                                    `${employee.firstName} ${employee.lastName}`.toLowerCase().includes(complaintEmployeeSearch.toLowerCase())
                                                                ).length === 0 && (
                                                                        <div className="p-2 text-sm text-muted-foreground text-center">
                                                                            No employees found
                                                                        </div>
                                                                    )}
                                                            </div>
                                                        </ScrollArea>
                                                    </PopoverContent>
                                                </Popover>
                                            )}
                                        </div>
                                        <div className="flex flex-wrap items-center justify-between gap-2 pt-4 border-t">
                                            <Button variant="outline" onClick={handleComplaintBack} className="h-11 px-6">
                                                Back
                                            </Button>
                                            <div className="flex gap-2">
                                                <Button variant="ghost" onClick={closeComplaintModal} className="h-11 px-6">
                                                    Cancel
                                                </Button>
                                                <Button onClick={handleCreateComplaint} className="h-11 px-6">
                                                    Save Complaint
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </TabsContent>
                            </Tabs>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Add Requirement Modal */}
            {isRequirementModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <Card className="w-full max-w-2xl border-0 shadow-lg max-h-[90vh] overflow-y-auto">
                        <CardHeader className="pb-4">
                            <CardTitle className="text-lg md:text-xl font-semibold text-foreground">Add Requirement</CardTitle>
                            <p className="text-xs md:text-sm text-muted-foreground">
                                Capture the requirement and assign it to the right teammate.
                            </p>
                        </CardHeader>
                        <CardContent>
                            <Tabs value={requirementActiveTab} onValueChange={setRequirementActiveTab} className="w-full">
                                <TabsList className="grid w-full grid-cols-2 mb-4">
                                    <TabsTrigger value="general">General</TabsTrigger>
                                    <TabsTrigger value="details">Details</TabsTrigger>
                                </TabsList>
                                <TabsContent value="general">
                                    <div className="space-y-6 py-2">
                                        <div className="space-y-3">
                                            <Label htmlFor="requirementTitle" className="text-sm font-medium text-foreground">
                                                Requirement Title *
                                            </Label>
                                            <Input
                                                id="requirementTitle"
                                                placeholder="What does the customer need?"
                                                value={requirementTask.taskTitle}
                                                onChange={(e) => setRequirementTask({ ...requirementTask, taskTitle: e.target.value })}
                                                className="w-full h-11"
                                            />
                                        </div>
                                        <div className="space-y-3">
                                            <Label htmlFor="requirementDescription" className="text-sm font-medium text-foreground">
                                                Requirement Description *
                                            </Label>
                                            <Textarea
                                                id="requirementDescription"
                                                placeholder="Document the requirement so the assignee understands the scope..."
                                                value={requirementTask.taskDesciption}
                                                onChange={(e) => setRequirementTask({ ...requirementTask, taskDesciption: e.target.value })}
                                                className="min-h-[140px]"
                                            />
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="requirementCategory" className="text-sm font-medium text-foreground">
                                                    Category
                                                </Label>
                                                <Input
                                                    id="requirementCategory"
                                                    value="Requirement"
                                                    readOnly
                                                    className="h-11 bg-muted text-muted-foreground font-medium cursor-not-allowed"
                                                />
                                                <p className="text-xs text-muted-foreground">
                                                    Category stays fixed for requirements.
                                                </p>
                                            </div>
                                            <div className="space-y-3">
                                                <Label htmlFor="requirementStoreName" className="text-sm font-medium text-foreground">
                                                    Store
                                                </Label>
                                                <Input
                                                    id="requirementStoreName"
                                                    value={(customerData?.storeName as string) || 'Loading...'}
                                                    disabled
                                                    className="w-full h-11 bg-muted text-muted-foreground font-medium cursor-not-allowed"
                                                />
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between pt-4 border-t">
                                            <Button variant="ghost" onClick={closeRequirementModal}>
                                                Cancel
                                            </Button>
                                            <Button onClick={handleRequirementNext} className="h-11 px-6">
                                                Continue
                                            </Button>
                                        </div>
                                    </div>
                                </TabsContent>
                                <TabsContent value="details">
                                    <div className="space-y-6 py-2">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-3">
                                                <Label htmlFor="requirementDueDate" className="text-sm font-medium text-foreground">
                                                    Due Date
                                                </Label>
                                                <Popover>
                                                    <PopoverTrigger asChild>
                                                        <Button
                                                            variant="outline"
                                                            className={`w-full h-11 justify-start text-left font-normal ${!requirementTask.dueDate && 'text-muted-foreground'}`}
                                                        >
                                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                                            {requirementTask.dueDate ? format(new Date(requirementTask.dueDate), 'PPP') : <span>Select due date</span>}
                                                        </Button>
                                                    </PopoverTrigger>
                                                    <PopoverContent className="w-auto p-0">
                                                        <SpacedCalendar
                                                            mode="single"
                                                            selected={requirementTask.dueDate ? new Date(requirementTask.dueDate + 'T00:00:00') : undefined}
                                                            onSelect={(date: Date | undefined) => {
                                                                if (date) {
                                                                    const year = date.getFullYear();
                                                                    const month = String(date.getMonth() + 1).padStart(2, '0');
                                                                    const day = String(date.getDate()).padStart(2, '0');
                                                                    const dateString = `${year}-${month}-${day}`;
                                                                    setRequirementTask({ ...requirementTask, dueDate: dateString });
                                                                }
                                                            }}
                                                            initialFocus
                                                        />
                                                    </PopoverContent>
                                                </Popover>
                                            </div>
                                            <div className="space-y-3">
                                                <Label htmlFor="requirementPriority" className="text-sm font-medium text-foreground">
                                                    Priority
                                                </Label>
                                                <Select value={requirementTask.priority} onValueChange={(value) => setRequirementTask({ ...requirementTask, priority: value })}>
                                                    <SelectTrigger className="w-full h-11">
                                                        <SelectValue placeholder="Select a priority" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="low">Low</SelectItem>
                                                        <SelectItem value="medium">Medium</SelectItem>
                                                        <SelectItem value="high">High</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                        <div className="space-y-3">
                                            <Label htmlFor="requirementAssignedTo" className="text-sm font-medium text-foreground">
                                                Assigned To
                                            </Label>
                                            {isLoadingEmployees ? (
                                                <div className="w-full h-11 bg-muted rounded-md flex items-center justify-center">
                                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                                                    <span className="ml-2 text-sm text-muted-foreground">Loading employees...</span>
                                                </div>
                                            ) : (
                                                <Popover>
                                                    <PopoverTrigger asChild>
                                                        <Button
                                                            variant="outline"
                                                            role="combobox"
                                                            className="w-full h-11 justify-between"
                                                        >
                                                            {requirementTask.assignedToId > 0
                                                                ? employees.find(emp => emp.id === requirementTask.assignedToId)
                                                                    ? `${employees.find(emp => emp.id === requirementTask.assignedToId)?.firstName} ${employees.find(emp => emp.id === requirementTask.assignedToId)?.lastName}${employees.find(emp => emp.id === requirementTask.assignedToId)?.employeeId ? ` (${employees.find(emp => emp.id === requirementTask.assignedToId)?.employeeId})` : ''}`
                                                                    : "Select an employee"
                                                                : "Select an employee"}
                                                            <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                        </Button>
                                                    </PopoverTrigger>
                                                    <PopoverContent className="w-[--radix-popover-trigger-width] max-h-[200px] p-0">
                                                        <div className="p-2 border-b">
                                                            <div className="relative">
                                                                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                                                <Input
                                                                    placeholder="Search employees..."
                                                                    value={requirementEmployeeSearch}
                                                                    onChange={(e) => setRequirementEmployeeSearch(e.target.value)}
                                                                    className="pl-8 border-0 focus-visible:ring-0"
                                                                />
                                                            </div>
                                                        </div>
                                                        <ScrollArea className="max-h-[150px]">
                                                            <div className="p-1">
                                                                {employees
                                                                    .filter((employee) =>
                                                                        `${employee.firstName} ${employee.lastName}`.toLowerCase().includes(requirementEmployeeSearch.toLowerCase())
                                                                    )
                                                                    .map((employee) => (
                                                                        <Button
                                                                            key={employee.id as string}
                                                                            variant="ghost"
                                                                            className="w-full justify-start font-normal h-9 px-2"
                                                                            onClick={() => {
                                                                                setRequirementTask({
                                                                                    ...requirementTask,
                                                                                    assignedToId: employee.id as number,
                                                                                    assignedToName: `${employee.firstName} ${employee.lastName}`
                                                                                });
                                                                                setRequirementEmployeeSearch('');
                                                                            }}
                                                                        >
                                                                            <Check
                                                                                className={`mr-2 h-4 w-4 ${requirementTask.assignedToId === employee.id ? "opacity-100" : "opacity-0"
                                                                                    }`}
                                                                            />
                                                                            <span className="truncate">
                                                                                {(employee.firstName as string)} {(employee.lastName as string)}
                                                                                {employee.employeeId ? ` (${employee.employeeId})` : ''}
                                                                            </span>
                                                                        </Button>
                                                                    ))}
                                                                {employees.filter((employee) =>
                                                                    `${employee.firstName} ${employee.lastName}`.toLowerCase().includes(requirementEmployeeSearch.toLowerCase())
                                                                ).length === 0 && (
                                                                        <div className="p-2 text-sm text-muted-foreground text-center">
                                                                            No employees found
                                                                        </div>
                                                                    )}
                                                            </div>
                                                        </ScrollArea>
                                                    </PopoverContent>
                                                </Popover>
                                            )}
                                        </div>
                                        <div className="flex flex-wrap items-center justify-between gap-2 pt-4 border-t">
                                            <Button variant="outline" onClick={handleRequirementBack} className="h-11 px-6">
                                                Back
                                            </Button>
                                            <div className="flex gap-2">
                                                <Button variant="ghost" onClick={closeRequirementModal} className="h-11 px-6">
                                                    Cancel
                                                </Button>
                                                <Button onClick={handleCreateRequirement} className="h-11 px-6">
                                                    Save Requirement
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </TabsContent>
                            </Tabs>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}
