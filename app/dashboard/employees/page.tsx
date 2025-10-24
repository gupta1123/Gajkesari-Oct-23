"use client";

import React, { useState, useEffect, useMemo, useCallback, Suspense } from "react";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Phone, Mail, MapPin, Calendar, Building, User, ArrowLeft, Eye, EyeOff, CalendarIcon, ChevronLeft, ChevronRight, Archive, Settings, Plus } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from "@/components/ui/button";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import SearchableSelect, { SearchableSelectOption } from "@/components/ui/searchable-select";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SpacedCalendar } from '@/components/ui/spaced-calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import AddTeam from "@/components/AddTeam";
import { Skeleton } from "@/components/ui/skeleton";
import { API } from "@/lib/api";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

interface User {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  departmentName: string;
  userName: string;
  password: string;
  primaryContact: string;
  dateOfJoining: string;
  name: string;
  department: string;
  actions: string;
  city: string;
  state: string;
  userDto: {
    username: string;
    password: string | null;
    roles: string | null;
    employeeId: number | null;
    firstName: string | null;
    lastName: string | null;
  };
}

interface TeamData {
  id: number;
  office: {
    id: number;
    firstName: string;
    lastName: string;
  };
  fieldOfficers: User[];
}

interface OfficeManager {
  id: number;
  firstName: string;
  lastName: string;
  city: string;
  email: string;
  deleted?: boolean;
  role?: string;
}

// Utility function to convert text to sentence case
const toSentenceCase = (text: string): string => {
  if (!text) return text;
  return text.toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
};


function EmployeeList() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchParamsString = searchParams.toString();

  const [users, setUsers] = useState<User[]>([]);
  const [teamData, setTeamData] = useState<TeamData | null>(null);
  const [officeManager, setOfficeManager] = useState<OfficeManager | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const STATE_KEY = 'employees.list.state.v1';
  const [isHydrated, setIsHydrated] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [resetPasswordUserId, setResetPasswordUserId] = useState<number | string | null>(null);
  const [selectedColumns, setSelectedColumns] = useState(['name', 'email', 'city', 'state', 'role', 'department', 'userName', 'dateOfJoining', 'primaryContact', 'actions']);
  const [isResetPasswordOpen, setIsResetPasswordOpen] = useState(false);
  const [selectedRows, setSelectedRows] = useState<number[]>([]);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [sortColumn, setSortColumn] = useState<keyof User>('firstName');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<User | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [assignCityUserId, setAssignCityUserId] = useState<number | null>(null);
  const [assignCityUserName, setAssignCityUserName] = useState<string>("");
  const [city, setCity] = useState("");
  const [assignedCity, setAssignedCity] = useState<string | null>(null);
  const [isAssignCityModalOpen, setIsAssignCityModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [cities, setCities] = useState<string[]>([]);
  const [assignedCities, setAssignedCities] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState('tab1');
  const [archivedEmployees, setArchivedEmployees] = useState<User[]>([]);
  const [isArchivedModalOpen, setIsArchivedModalOpen] = useState(false);
  const [archiveSearchQuery, setArchiveSearchQuery] = useState("");
  const [isEditUsernameModalOpen, setIsEditUsernameModalOpen] = useState(false);
  const [editingUsername, setEditingUsername] = useState<{ id: number; username: string } | null>(null);
  const [isAddingEmployee, setIsAddingEmployee] = useState(false);
  const [primaryContactError, setPrimaryContactError] = useState<string | null>(null);
  const [secondaryContactError, setSecondaryContactError] = useState<string | null>(null);

  // Indian states list
  const indianStates: SearchableSelectOption[] = [
    "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
    "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
    "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram",
    "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu",
    "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
    "Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu",
    "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry"
  ].map(state => ({ value: state, label: state }));

  // Additional state for new employee form
  const initialNewEmployeeState = {
    employeeId: "",
    firstName: "",
    lastName: "",
    primaryContact: "",
    secondaryContact: "",
    departmentName: "",
    email: "",
    role: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    country: "India", // Pre-filled with India
    pincode: "",
    dateOfJoining: "",
    userName: "",
    password: "",
  };
  const [newEmployee, setNewEmployee] = useState(initialNewEmployeeState);
  // State is now a free-text field in Add Employee modal
  const [editSelectedState, setEditSelectedState] = useState<string[]>([]);

  // Add Employee modal uses free-text state input now

  // Handle edit employee state selection
  const handleEditStateChange = (values: string[]) => {
    setEditSelectedState(values);
    if (editingEmployee) {
      if (values.length > 0) {
        setEditingEmployee({ ...editingEmployee, state: values[0] });
      } else {
        setEditingEmployee({ ...editingEmployee, state: "" });
      }
    }
  };

  // Get auth data from localStorage instead of Redux
  const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
  const role = typeof window !== 'undefined' ? localStorage.getItem('role') : null;
  const employeeId = typeof window !== 'undefined' ? localStorage.getItem('employeeId') : null;
  const officeManagerId = typeof window !== 'undefined' ? localStorage.getItem('officeManagerId') : null;

  const fetchEmployees = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      if (role === 'MANAGER') {
        const response = await fetch(`https://api.gajkesaristeels.in/employee/team/getbyEmployee?id=${employeeId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch team data');
        }

        const teamData: TeamData[] = await response.json();
        if (!teamData || teamData.length === 0) {
          throw new Error('No team data found for the manager');
        }

        const team = teamData[0];
        setTeamData(team);
        setUsers(team.fieldOfficers.map((user: User) => ({ ...user, userName: user.userDto?.username || "" })));
      } else {
        const response = await fetch('https://api.gajkesaristeels.in/employee/getAll', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch employees');
        }

        const data: User[] = await response.json();
        if (!data) {
          throw new Error('No data received when fetching all employees');
        }

        setUsers(data.map((user: User) => ({ ...user, userName: user.userDto?.username || "" })));
        setAssignedCities(data.filter((user: User) => user.city).map((user: User) => user.city));
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  }, [token, role, employeeId]);

  // Hydrate filters/paging
  useEffect(() => {
    if (isHydrated) return;

    let saved: { searchQuery?: string; currentPage?: number; itemsPerPage?: number } = {};
    try {
      const raw = sessionStorage.getItem(STATE_KEY);
      if (raw) {
        saved = JSON.parse(raw) ?? {};
      }
    } catch {}

    const querySearch = searchParams.get('q');
    const queryPage = Number(searchParams.get('page'));
    const querySize = Number(searchParams.get('size'));

    const initialSearch = typeof querySearch === 'string' ? querySearch : saved.searchQuery ?? '';
    const initialPage = !Number.isNaN(queryPage) && queryPage > 0
      ? queryPage
      : typeof saved.currentPage === 'number' && saved.currentPage > 0
        ? saved.currentPage
        : 1;
    const initialSize = !Number.isNaN(querySize) && querySize > 0
      ? querySize
      : typeof saved.itemsPerPage === 'number' && saved.itemsPerPage > 0
        ? saved.itemsPerPage
        : 10;

    setSearchQuery(initialSearch);
    setCurrentPage(initialPage);
    setItemsPerPage(initialSize);
    setIsHydrated(true);
  }, [searchParams, isHydrated]);

  // Persist state on change
  useEffect(() => {
    if (!isHydrated) return;

    try {
      sessionStorage.setItem(STATE_KEY, JSON.stringify({ searchQuery, currentPage, itemsPerPage }));
    } catch {}

    const params = new URLSearchParams(searchParamsString);
    if (searchQuery.trim()) {
      params.set('q', searchQuery.trim());
    } else {
      params.delete('q');
    }
    if (currentPage > 1) {
      params.set('page', currentPage.toString());
    } else {
      params.delete('page');
    }
    if (itemsPerPage !== 10) {
      params.set('size', itemsPerPage.toString());
    } else {
      params.delete('size');
    }

    const nextQuery = params.toString();
    if (nextQuery === searchParamsString) {
      return;
    }

    const nextUrl = nextQuery ? `${pathname}?${nextQuery}` : pathname;
    router.replace(nextUrl, { scroll: false });
  }, [searchQuery, currentPage, itemsPerPage, isHydrated, pathname, router, searchParamsString]);

  const fetchArchivedEmployees = async () => {
    try {
      console.log('Fetching archived employees...');
      const response = await fetch('https://api.gajkesaristeels.in/employee/getAllInactive', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch archived employees: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('Archived employees data:', data);
      console.log('Number of archived employees:', data.length);
      setArchivedEmployees(data);
    } catch (error) {
      console.error('Error fetching archived employees:', error);
    }
  };

  const handleDeleteUser = async (userId: number) => {
    try {
      const response = await fetch(
        `https://api.gajkesaristeels.in/employee/delete?id=${userId}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        setUsers((prevUsers) => prevUsers.filter((user) => user.id !== userId));
      } else {
        console.error('Failed to delete employee');
      }
    } catch (error) {
      console.error('Error deleting employee:', error);
    }
  };

  const handleResetPasswordSubmit = async () => {
    if (newPassword !== confirmPassword) {
      console.error('Passwords do not match!');
      return;
    }

    try {
      const response = await fetch(
        "https://api.gajkesaristeels.in/user/manage/update",
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            username: users.find(user => user.id === resetPasswordUserId)?.userName,
            password: newPassword
          })
        }
      );

      if (response.ok) {
        setIsResetPasswordOpen(false);
        setNewPassword('');
        setConfirmPassword('');
      } else {
        console.error('Failed to reset password');
      }
    } catch (error) {
      console.error('Error resetting password:', error);
    }
  };

  const handleSaveEdit = async () => {
    if (editingEmployee) {
      try {
        const response = await fetch(
          `https://api.gajkesaristeels.in/employee/edit?empId=${editingEmployee.id}`,
          {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              firstName: editingEmployee.firstName,
              lastName: editingEmployee.lastName,
              email: editingEmployee.email,
              role: editingEmployee.role,
              departmentName: editingEmployee.departmentName,
              userName: editingEmployee.userName,
              primaryContact: editingEmployee.primaryContact,
              city: editingEmployee.city,
              state: editingEmployee.state,
              dateOfJoining: editingEmployee.dateOfJoining,
            })
          }
        );

        if (response.ok) {
          setUsers(prevUsers =>
            prevUsers.map(user => (user.id === editingEmployee.id ? editingEmployee : user))
          );
          setIsEditModalOpen(false);
          setEditSelectedState([]);
        } else {
          console.error('Failed to update employee');
        }
      } catch (error) {
        console.error('Error updating employee:', error);
      }
    }
  };

  const handleSubmit = async () => {
    try {
      setIsAddingEmployee(true);
      console.log('Starting employee creation...');
      console.log('Token present:', !!token);
      console.log('Employee data:', newEmployee);

      if (!token) {
        alert('Authentication token not found. Please log in again.');
        return;
      }

      const roleForApi = newEmployee.role === 'Manager' ? 'Office Manager' : 
                        newEmployee.role === 'Regional Manager' ? 'Office Manager' : 
                        newEmployee.role;

      // Validate contact numbers
      const primaryContactNum = Number(newEmployee.primaryContact);
      const secondaryContactNum = newEmployee.secondaryContact ? Number(newEmployee.secondaryContact) : null;
      
      if (isNaN(primaryContactNum) || primaryContactNum.toString().length !== 10) {
        alert('Primary contact must be a valid 10-digit number');
        return;
      }
      
      if (secondaryContactNum && (isNaN(secondaryContactNum) || secondaryContactNum.toString().length !== 10)) {
        alert('Secondary contact must be a valid 10-digit number');
        return;
      }

      const requestBody = {
        user: {
          username: newEmployee.userName,
          password: newEmployee.password,
        },
        employee: {
          employeeId: newEmployee.employeeId,
          firstName: newEmployee.firstName,
          lastName: newEmployee.lastName,
          primaryContact: primaryContactNum,
          secondaryContact: secondaryContactNum,
          departmentName: newEmployee.departmentName,
          email: newEmployee.email,
          role: roleForApi,
          addressLine1: newEmployee.addressLine1,
          addressLine2: newEmployee.addressLine2,
          city: newEmployee.city,
          state: newEmployee.state,
          country: newEmployee.country,
          pincode: newEmployee.pincode,
          dateOfJoining: newEmployee.dateOfJoining,
        },
      };

      console.log('Request body:', requestBody);
      console.log('Request URL:', "https://api.gajkesaristeels.in/employee-user/create");
      console.log('Headers:', {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token?.substring(0, 20)}...`,
      });

      await API.createEmployee(requestBody);

      const allEmployees = await API.getAllEmployees();

      const createdEmployee = allEmployees.find(
        (emp) => (emp?.userDto as { username?: string })?.username === newEmployee.userName
      );

      if (createdEmployee) {
        try {
          await API.createAttendanceLog(createdEmployee.id);
          console.log('Employee added successfully and attendance log created!');
        } catch (attendanceError) {
          console.error("Error creating attendance log:", attendanceError);
          console.log('Employee added successfully but failed to create attendance log.');
        }
      }

      setIsModalOpen(false);
      fetchEmployees();
    } catch (error) {
      console.error('Error adding employee:', error);
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        alert('Network error: Unable to connect to the server. Please check your internet connection and try again.');
      } else {
        alert(`Error adding employee: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    } finally {
      setIsAddingEmployee(false);
    }
  };

  const handleUnarchive = async (employeeId: number) => {
    try {
      const response = await fetch(
        `https://api.gajkesaristeels.in/employee/setActive?id=${employeeId}`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      
      if (response.ok) {
        fetchArchivedEmployees();
        fetchEmployees();
      }
    } catch (error) {
      console.error('Error unarchiving employee:', error);
    }
  };

  const handleSaveUsername = async () => {
    if (!editingUsername?.username.trim()) {
      console.error('Username cannot be empty');
      return;
    }

    if (editingUsername) {
      try {
        setIsLoading(true);
        
        const encodedUsername = encodeURIComponent(editingUsername.username.trim());
        const response = await fetch(
          `https://api.gajkesaristeels.in/employee/editUsername?id=${editingUsername.id}&username=${encodedUsername}`,
          {
            method: 'PUT',
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const text = await response.text().catch(() => '');
        if (response.ok) {
          setIsEditUsernameModalOpen(false);
          setEditingUsername(null);
          fetchEmployees();
          if (text) {
            console.log('Username update response:', text);
          }
        }
      } catch (error) {
        console.error('Error updating username:', error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    if (token && isHydrated) {
      fetchEmployees();
    }
  }, [token, role, employeeId, isHydrated, fetchEmployees]);

  // Helper functions
  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const transformRole = (role: string) => {
    return role === 'Manager' ? 'Regional Manager' : 
           role === 'Office Manager' ? 'Regional Manager' : 
           role;
  };

  // Function to generate role tags with pastel colors
  const getRoleTag = (role: string) => {
    const transformedRole = transformRole(role);
    
    if (transformedRole === 'Regional Manager') {
      return (
        <Badge 
          variant="secondary" 
          className="bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200"
        >
          {transformedRole}
        </Badge>
      );
    } else if (transformedRole === 'Field Officer') {
      return (
        <Badge 
          variant="secondary" 
          className="bg-green-100 text-green-800 border-green-200 hover:bg-green-200"
        >
          {transformedRole}
        </Badge>
      );
    } else {
      return (
        <Badge 
          variant="secondary" 
          className="bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-200"
        >
          {transformedRole}
        </Badge>
      );
    }
  };

  const handleSort = (column: keyof User) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name } = e.target;
    let { value } = e.target;

    if (name === 'primaryContact' || name === 'secondaryContact') {
      // Keep only digits and cap to 10 digits
      const digitsOnly = (value || '').replace(/\D/g, '');
      const capped = digitsOnly.slice(0, 10);
      const digitCount = capped.length;

      // Instant validation: show error only when 1-9 digits; none at 10
      const err = digitCount > 0 && digitCount < 10 ? 'Phone number must be 10 digits' : null;
      if (name === 'primaryContact') setPrimaryContactError(err);
      if (name === 'secondaryContact') setSecondaryContactError(err);

      value = capped;
    }

    setNewEmployee((prevEmployee) => ({
      ...prevEmployee,
      [name]: value,
    }));
  };

  const handleEditInputChange = (e: React.ChangeEvent<HTMLInputElement> | React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    setEditingEmployee(prevEmployee => prevEmployee ? { ...prevEmployee, [name]: value } : null);
  };

  const handleEditUser = (user: User) => {
    setEditingEmployee({ ...user, name: `${user.firstName} ${user.lastName}` });
    // Set initial state for SearchableSelect
    setEditSelectedState(user.state ? [user.state] : []);
    setIsEditModalOpen(true);
  };

  const handleResetPassword = (userId: number | string) => {
    setResetPasswordUserId(userId);
    setIsResetPasswordOpen(true);
  };

  const handleEditUsername = (userId: number, currentUsername: string) => {
    setEditingUsername({ id: userId, username: currentUsername });
    setIsEditUsernameModalOpen(true);
  };

  const handleViewUser = (userId: number) => {
    try {
      sessionStorage.setItem('employees.last.view', JSON.stringify({ from: 'list' }));
    } catch {}
    router.push(`/dashboard/employee/${userId}`);
  };

  const handleNextClick = () => {
    setActiveTab('tab2');
  };

  const handleTabChange = (newTab: string) => {
    setActiveTab(newTab);
  };

  const closeUsernameDialog = () => {
    setIsEditUsernameModalOpen(false);
    setEditingUsername(null);
  };

  // Filtering and sorting logic
  const filteredUsers = useMemo(() => {
    return users.filter((user) =>
      (`${user.firstName} ${user.lastName}`).toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.role.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [users, searchQuery]);

  const sortedUsers = useMemo(() => {
    return [...filteredUsers].sort((a, b) => {
      if (a[sortColumn] < b[sortColumn]) return sortDirection === 'asc' ? -1 : 1;
      if (a[sortColumn] > b[sortColumn]) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredUsers, sortColumn, sortDirection]);

  const indexOfLastUser = currentPage * itemsPerPage;
  const indexOfFirstUser = indexOfLastUser - itemsPerPage;
  const currentUsers = sortedUsers.slice(indexOfFirstUser, indexOfLastUser);


  const filteredArchivedEmployees = useMemo(() => {
    console.log('Filtering archived employees:', archivedEmployees.length, 'employees, search query:', archiveSearchQuery);
    const filtered = archivedEmployees.filter((employee) =>
      `${employee.firstName} ${employee.lastName}`.toLowerCase().includes(archiveSearchQuery.toLowerCase()) ||
      employee.role.toLowerCase().includes(archiveSearchQuery.toLowerCase()) ||
      employee.departmentName.toLowerCase().includes(archiveSearchQuery.toLowerCase()) ||
      employee.city.toLowerCase().includes(archiveSearchQuery.toLowerCase())
    );
    console.log('Filtered result:', filtered.length, 'employees');
    return filtered;
  }, [archivedEmployees, archiveSearchQuery]);

  return (
    <div className="container-employee mx-auto py-8 px-4 sm:px-6 lg:px-8">
      {/* Search and Filters Section */}
      <div className="mb-8 space-y-4">
        {/* Search Bar */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex-1 max-w-md">
            <Input
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full"
            />
          </div>
          
          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2">
            <Button 
              variant="outline"
              onClick={() => {
                setIsArchivedModalOpen(true);
                fetchArchivedEmployees();
              }}
              className="flex items-center gap-2"
            >
              <Archive className="h-4 w-4" />
              Archived
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Columns
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56">
                {['name', 'city', 'state', 'role', 'userName', 'primaryContact', 'actions'].map((column) => (
                  <DropdownMenuCheckboxItem
                    key={column}
                    checked={selectedColumns.includes(column)}
                    onCheckedChange={() => {
                      if (selectedColumns.includes(column)) {
                        setSelectedColumns(selectedColumns.filter((col) => col !== column));
                      } else {
                        setSelectedColumns([...selectedColumns, column]);
                      }
                    }}
                  >
                    {column}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            
            <AddTeam />
            
            <Button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add Employee
            </Button>
          </div>
        </div>
      </div>

      {isLoading && (
        <div className="space-y-4">
          {/* Filters skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-10 w-full" />
              </div>
            ))}
            <div className="flex items-end">
              <Skeleton className="h-10 w-full" />
            </div>
          </div>

          {/* Table skeleton */}
          <Card className="w-full">
            <CardContent className="pt-6">
              <div className="rounded-md border overflow-hidden w-full">
                <div className="overflow-x-auto w-full">
                  <Table className="min-w-full">
                    <TableHeader>
                      <TableRow>
                        {['Name','Role','User Name','Phone','City','State','Actions'].map(h => (
                          <TableHead key={h} className="whitespace-nowrap">{h}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {[...Array(6)].map((_, i) => (
                        <TableRow key={i}>
                          <TableCell className="whitespace-nowrap"><Skeleton className="h-4 w-40" /></TableCell>
                          <TableCell className="whitespace-nowrap"><Skeleton className="h-4 w-24" /></TableCell>
                          <TableCell className="whitespace-nowrap"><Skeleton className="h-4 w-28" /></TableCell>
                          <TableCell className="whitespace-nowrap"><Skeleton className="h-4 w-28" /></TableCell>
                          <TableCell className="whitespace-nowrap"><Skeleton className="h-4 w-24" /></TableCell>
                          <TableCell className="whitespace-nowrap"><Skeleton className="h-4 w-20" /></TableCell>
                          <TableCell className="whitespace-nowrap"><Skeleton className="h-8 w-8 rounded" /></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      {error && <div className="text-red-500">Error: {error}</div>}

      {!isLoading && !error && (
        <>
          {/* Mobile view */}
          <div className="md:hidden space-y-4">
            {currentUsers.map((user, index) => (
              <motion.div
                key={user.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
              >
                <Card className="overflow-hidden shadow-md hover:shadow-lg transition-shadow duration-300">
                  <CardHeader className="pb-2">
                    <div className="flex items-center space-x-4">
                      <Avatar className="h-12 w-12">
                        <AvatarFallback className="bg-gray-200 text-gray-700 font-semibold">
                          {getInitials(user.firstName, user.lastName)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <CardTitle className="text-lg font-bold">{`${user.firstName} ${user.lastName}`}</CardTitle>
                        <div className="text-sm">{getRoleTag(user.role)}</div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-3">
                      {selectedColumns.includes('userName') && (
                        <div className="flex items-center space-x-2">
                          <User className="h-5 w-5 text-blue-500" />
                          <span className="text-sm">{user.userName}</span>
                        </div>
                      )}
                      {selectedColumns.includes('primaryContact') && (
                        <div className="flex items-center space-x-2">
                          <Phone className="h-5 w-5 text-green-500" />
                          <span className="text-sm">{user.primaryContact}</span>
                        </div>
                      )}
                      {selectedColumns.includes('email') && (
                        <div className="flex items-center space-x-2">
                          <Mail className="h-5 w-5 text-red-500" />
                          <span className="text-sm">{user.email}</span>
                        </div>
                      )}
                      {selectedColumns.includes('city') && (
                        <div className="flex items-center space-x-2">
                          <MapPin className="h-5 w-5 text-yellow-500" />
                          <span className="text-sm">{toSentenceCase(user.city)}</span>
                        </div>
                      )}
                      {selectedColumns.includes('state') && (
                        <div className="flex items-center space-x-2">
                          <Building className="h-5 w-5 text-purple-500" />
                          <span className="text-sm">{user.state}</span>
                        </div>
                      )}
                      {selectedColumns.includes('dateOfJoining') && (
                        <div className="flex items-center space-x-2">
                          <Calendar className="h-5 w-5 text-indigo-500" />
                          <span className="text-sm">{format(new Date(user.dateOfJoining), 'MMM dd, yyyy')}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                  <div className="px-6 py-3 bg-gray-50 flex justify-end space-x-2">
                    <Button variant="ghost" size="sm" onClick={() => handleEditUser(user)}>
                      Edit
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleViewUser(user.id)}>
                      View
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDeleteUser(user.id)}>
                      Delete
                    </Button>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Desktop view */}
          <div className="hidden md:block">
            <div className="rounded-md border overflow-hidden">
              <Table className="w-full">
              <TableHeader>
                <TableRow>
                  {selectedColumns.includes('name') && (
                    <TableHead className="cursor-pointer px-6 py-3" onClick={() => handleSort('firstName')}>
                      Name
                      {sortColumn === 'firstName' && (
                        <span className="ml-2">
                          {sortDirection === 'asc' ? '▲' : '▼'}
                        </span>
                      )}
                    </TableHead>
                  )}
                  {selectedColumns.includes('role') && (
                    <TableHead className="cursor-pointer px-6 py-3" onClick={() => handleSort('role')}>
                      Role
                      {sortColumn === 'role' && (
                        <span className="ml-2">
                          {sortDirection === 'asc' ? '▲' : '▼'}
                        </span>
                      )}
                    </TableHead>
                  )}
                  {selectedColumns.includes('userName') && (
                    <TableHead className="cursor-pointer px-6 py-3" onClick={() => handleSort('userName')}>
                      User Name
                      {sortColumn === 'userName' && (
                        <span className="ml-2">
                          {sortDirection === 'asc' ? '▲' : '▼'}
                        </span>
                      )}
                    </TableHead>
                  )}
                  {selectedColumns.includes('primaryContact') && (
                    <TableHead className="cursor-pointer px-6 py-3" onClick={() => handleSort('primaryContact')}>
                      Phone
                      {sortColumn === 'primaryContact' && (
                        <span className="ml-2">
                          {sortDirection === 'asc' ? '▲' : '▼'}
                        </span>
                      )}
                    </TableHead>
                  )}
                  {selectedColumns.includes('city') && (
                    <TableHead className="cursor-pointer px-6 py-3" onClick={() => handleSort('city')}>
                      City
                      {sortColumn === 'city' && (
                        <span className="ml-2">
                          {sortDirection === 'asc' ? '▲' : '▼'}
                        </span>
                      )}
                    </TableHead>
                  )}
                  {selectedColumns.includes('state') && (
                    <TableHead className="cursor-pointer px-6 py-3" onClick={() => handleSort('state')}>
                      State
                      {sortColumn === 'state' && (
                        <span className="ml-2">
                          {sortDirection === 'asc' ? '▲' : '▼'}
                        </span>
                      )}
                    </TableHead>
                  )}
                  {selectedColumns.includes('actions') && (
                    <TableHead className="text-right px-6 py-3">Actions</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentUsers.map((user) => (
                  <TableRow key={user.id}>
                    {selectedColumns.includes('name') && (
                      <TableCell className="font-medium px-6 py-3">{`${user.firstName} ${user.lastName}`}</TableCell>
                    )}
                    {selectedColumns.includes('role') && <TableCell className="px-6 py-3">{getRoleTag(user.role)}</TableCell>}
                    {selectedColumns.includes('userName') && <TableCell className="px-6 py-3">{user.userName}</TableCell>}
                    {selectedColumns.includes('primaryContact') && <TableCell className="px-6 py-3">{user.primaryContact}</TableCell>}
                    {selectedColumns.includes('city') && <TableCell className="px-6 py-3">{toSentenceCase(user.city)}</TableCell>}
                    {selectedColumns.includes('state') && <TableCell className="px-6 py-3">{user.state}</TableCell>}
                    {selectedColumns.includes('actions') && (
                      <TableCell className="text-right px-6 py-3">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Open menu</span>
                              <span>•••</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEditUser(user)}>
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEditUsername(user.id, user.userName)}>
                              Edit Username
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleViewUser(user.id)}>
                              View
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleResetPassword(user.id)}>
                              Reset Password
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDeleteUser(user.id)}>
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          </div>

          {/* Pagination Controls */}
          <div className="flex items-center justify-between mt-4">
            <div className="flex items-center space-x-2">
              <Label htmlFor="pageSize">Rows per page:</Label>
              <Select value={itemsPerPage.toString()} onValueChange={(value) => setItemsPerPage(parseInt(value))}>
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
                Page {currentPage} of {Math.ceil(sortedUsers.length / itemsPerPage)}
              </span>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.min(Math.ceil(sortedUsers.length / itemsPerPage), currentPage + 1))}
                disabled={currentPage >= Math.ceil(sortedUsers.length / itemsPerPage)}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </>
      )}

      {/* Reset Password Modal */}
      <Dialog open={isResetPasswordOpen} onOpenChange={setIsResetPasswordOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              Enter a new password for the user.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsResetPasswordOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleResetPasswordSubmit}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Employee Modal */}
      <Dialog open={isModalOpen} onOpenChange={(isOpen) => {
        setIsModalOpen(isOpen);
        if (!isOpen) {
          setNewEmployee(initialNewEmployeeState);
          setIsAddingEmployee(false);
        }
      }}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Add Employee</DialogTitle>
          </DialogHeader>
          <Tabs value={activeTab} className="mt-6 flex-1 flex flex-col">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="tab1">Personal</TabsTrigger>
              <TabsTrigger value="tab2">Work</TabsTrigger>
              <TabsTrigger value="tab3">Address</TabsTrigger>
              <TabsTrigger value="tab4">Credentials</TabsTrigger>
            </TabsList>
            <TabsContent value="tab1" className="flex-1 flex flex-col">
              <div className="flex-1 overflow-y-auto pr-2">
                <div className="space-y-4">
                  <div className="text-lg font-semibold">Personal Information</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">
                        First Name <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="firstName"
                        name="firstName"
                        value={newEmployee.firstName}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">
                        Last Name <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="lastName"
                        name="lastName"
                        value={newEmployee.lastName}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="employeeId">
                        Employee ID <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="employeeId"
                        name="employeeId"
                        value={newEmployee.employeeId}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="primaryContact">
                        Primary Contact <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="primaryContact"
                        name="primaryContact"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={newEmployee.primaryContact}
                        onChange={handleInputChange}
                        required
                      />
                      {primaryContactError && (
                        <p className="text-sm text-red-600">{primaryContactError}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="secondaryContact">Secondary Contact</Label>
                      <Input
                        id="secondaryContact"
                        name="secondaryContact"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={newEmployee.secondaryContact}
                        onChange={handleInputChange}
                      />
                      {secondaryContactError && newEmployee.secondaryContact && (
                        <p className="text-sm text-red-600">{secondaryContactError}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-6 pt-4 border-t bg-white">
                <Button
                  onClick={() => setActiveTab('tab2')}
                  disabled={
                    !newEmployee.employeeId ||
                    !newEmployee.firstName ||
                    !newEmployee.lastName ||
                    !newEmployee.primaryContact ||
                    !!primaryContactError ||
                    (!!newEmployee.secondaryContact && !!secondaryContactError)
                  }
                  className="w-full"
                >
                  Next
                </Button>
              </div>
            </TabsContent>
            <TabsContent value="tab2" className="flex-1 flex flex-col">
              <div className="flex-1 overflow-y-auto pr-2">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <Button
                      variant="ghost"
                      onClick={() => setActiveTab('tab1')}
                      className="p-2"
                    >
                      <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div className="text-lg font-semibold">Work Information</div>
                    <div className="w-10"></div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="departmentName">
                        Department <span className="text-red-500">*</span>
                      </Label>
                      <Select
                        value={newEmployee.departmentName}
                        onValueChange={(value) =>
                          setNewEmployee({ ...newEmployee, departmentName: value })
                        }
                        required
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a department" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Sales">Sales</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="role">Role <span className="text-red-500">*</span></Label>
                      <Select
                        value={newEmployee.role}
                        onValueChange={(value) =>
                          setNewEmployee({ ...newEmployee, role: value })
                        }
                        required
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Field Officer">Field Officer</SelectItem>
                          <SelectItem value="Manager">Regional Manager</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="dateOfJoining">Date of Joining</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={`w-full justify-start text-left font-normal ${!newEmployee.dateOfJoining && 'text-muted-foreground'}`}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {newEmployee.dateOfJoining ? format(new Date(newEmployee.dateOfJoining + 'T00:00:00'), 'MMM d, yyyy') : <span>Pick date</span>}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <SpacedCalendar
                            mode="single"
                            selected={newEmployee.dateOfJoining ? new Date(newEmployee.dateOfJoining + 'T00:00:00') : undefined}
                            onSelect={(date) => {
                              if (date) {
                                // Use local date format to avoid timezone issues
                                const year = date.getFullYear();
                                const month = String(date.getMonth() + 1).padStart(2, '0');
                                const day = String(date.getDate()).padStart(2, '0');
                                const dateString = `${year}-${month}-${day}`;
                                setNewEmployee({ ...newEmployee, dateOfJoining: dateString });
                              }
                            }}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-6 pt-4 border-t bg-white flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setActiveTab('tab1')}
                  className="flex-1"
                >
                  Previous
                </Button>
                <Button
                  onClick={() => setActiveTab('tab3')}
                  disabled={
                    !newEmployee.departmentName ||
                    !newEmployee.role
                  }
                  className="flex-1"
                >
                  Next
                </Button>
              </div>
            </TabsContent>

            {/* Address and Credentials Tab */}
            <TabsContent value="tab3" className="flex-1 flex flex-col">
              <div className="flex-1 overflow-y-auto pr-2">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <Button
                      variant="ghost"
                      onClick={() => setActiveTab('tab2')}
                      className="p-2"
                    >
                      <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div className="text-lg font-semibold">Address Information</div>
                    <div className="w-10"></div>
                  </div>
                  <div className="text-lg font-semibold">Address Information</div>
                  <div className="space-y-2">
                    <Label htmlFor="addressLine1">Address Line 1</Label>
                    <Input
                      id="addressLine1"
                      name="addressLine1"
                      value={newEmployee.addressLine1}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="addressLine2">Address Line 2</Label>
                    <Input
                      id="addressLine2"
                      name="addressLine2"
                      value={newEmployee.addressLine2}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="city">City</Label>
                      <Input
                        id="city"
                        name="city"
                        value={newEmployee.city}
                        onChange={handleInputChange}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="state">State</Label>
                      <Input
                        id="state"
                        name="state"
                        value={newEmployee.state}
                        onChange={handleInputChange}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="country">Country</Label>
                      <Input
                        id="country"
                        name="country"
                        value={newEmployee.country}
                        disabled
                        className="bg-muted text-muted-foreground cursor-not-allowed"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pincode">Pincode</Label>
                    <Input
                      id="pincode"
                      name="pincode"
                      value={newEmployee.pincode}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>
              </div>
              <div className="mt-6 pt-4 border-t bg-white flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setActiveTab('tab2')}
                  className="flex-1"
                >
                  Previous
                </Button>
                <Button
                  onClick={() => setActiveTab('tab4')}
                  className="flex-1"
                >
                  Next
                </Button>
              </div>
            </TabsContent>

            {/* Credentials Tab */}
            <TabsContent value="tab4" className="flex-1 flex flex-col">
              <div className="flex-1 overflow-y-auto pr-2">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <Button
                      variant="ghost"
                      onClick={() => setActiveTab('tab3')}
                      className="p-2"
                    >
                      <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div className="text-lg font-semibold">User Credentials</div>
                    <div className="w-10"></div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="userName">
                        User Name <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="userName"
                        name="userName"
                        value={newEmployee.userName}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password">
                        Password <span className="text-red-500">*</span>
                      </Label>
                      <div className="relative">
                        <Input
                          id="password"
                          name="password"
                          type={showPassword ? 'text' : 'password'}
                          value={newEmployee.password}
                          onChange={handleInputChange}
                          required
                        />
                        <button
                          type="button"
                          className="absolute top-1/2 right-2 transform -translate-y-1/2 focus:outline-none"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? (
                            <EyeOff className="h-5 w-5 text-gray-400" />
                          ) : (
                            <Eye className="h-5 w-5 text-gray-400" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-6 pt-4 border-t bg-white flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setActiveTab('tab3')}
                  className="flex-1"
                >
                  Previous
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={!newEmployee.userName || !newEmployee.password || isAddingEmployee}
                  className="flex-1"
                >
                  {isAddingEmployee ? (
                    <>
                      <svg className="animate-spin h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                      </svg>
                      Adding Employee...
                    </>
                  ) : (
                    'Add Employee'
                  )}
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Edit Employee Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[600px] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Employee</DialogTitle>
          </DialogHeader>
          {editingEmployee && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    name="firstName"
                    value={editingEmployee.firstName}
                    onChange={handleEditInputChange}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    name="lastName"
                    value={editingEmployee.lastName}
                    onChange={handleEditInputChange}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    value={editingEmployee.email}
                    onChange={handleEditInputChange}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="primaryContact">Primary Contact</Label>
                  <Input
                    id="primaryContact"
                    name="primaryContact"
                    value={editingEmployee.primaryContact}
                    onChange={handleEditInputChange}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="role">Role</Label>
                  <Select
                    value={editingEmployee.role}
                    onValueChange={(value) =>
                      setEditingEmployee({ ...editingEmployee, role: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Field Officer">Field Officer</SelectItem>
                      <SelectItem value="Manager">Regional Manager</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    name="city"
                    value={editingEmployee.city}
                    onChange={handleEditInputChange}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="state">State</Label>
                  <SearchableSelect
                    options={indianStates}
                    value={editSelectedState}
                    onChange={handleEditStateChange}
                    placeholder="Select state"
                    searchPlaceholder="Search states..."
                    className="w-full"
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="dateOfJoining">Date of Joining</Label>
                <Input
                  id="dateOfJoining"
                  name="dateOfJoining"
                  type="date"
                  value={editingEmployee.dateOfJoining}
                  onChange={handleEditInputChange}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsEditModalOpen(false);
              setEditSelectedState([]);
            }}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Archived Employees Modal */}
      <Dialog open={isArchivedModalOpen} onOpenChange={setIsArchivedModalOpen}>
        <DialogContent className="sm:max-w-[800px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Archived Employees</DialogTitle>
            <DialogDescription>
              View and manage archived employees
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Search Filter */}
            <div className="flex items-center space-x-2">
              <Input
                placeholder="Search archived employees..."
                value={archiveSearchQuery}
                onChange={(e) => setArchiveSearchQuery(e.target.value)}
                className="max-w-md"
              />
              <Badge variant="secondary" className="h-9 px-3">
                {filteredArchivedEmployees.length} Results
              </Badge>
              <Badge variant="outline" className="h-9 px-3">
                Total: {archivedEmployees.length}
              </Badge>
            </div>

            {/* Table */}
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>City</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredArchivedEmployees.map((employee) => (
                    <TableRow key={employee.id}>
                      <TableCell className="font-medium">
                        {`${employee.firstName} ${employee.lastName}`}
                      </TableCell>
                      <TableCell>{employee.role}</TableCell>
                      <TableCell>{employee.departmentName}</TableCell>
                      <TableCell>{employee.city}</TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleUnarchive(employee.id)}
                          className="flex items-center gap-2"
                        >
                          <ArrowLeft className="h-4 w-4" />
                          Unarchive
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredArchivedEmployees.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8">
                        <div className="flex flex-col items-center gap-2">
                          <p className="text-sm text-muted-foreground">
                            {archivedEmployees.length === 0 
                              ? "No archived employees found" 
                              : "No results found for your search"}
                          </p>
                          {archivedEmployees.length > 0 && archiveSearchQuery && (
                            <Button 
                              variant="ghost" 
                              onClick={() => setArchiveSearchQuery("")}
                              className="text-sm"
                            >
                              Clear search
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Username Modal */}
      <Dialog open={isEditUsernameModalOpen} onOpenChange={closeUsernameDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Username</DialogTitle>
            <DialogDescription>
              Enter a new username for the employee. Username must not be empty.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="newUsername">New Username</Label>
              <Input
                id="newUsername"
                value={editingUsername?.username || ''}
                onChange={(e) => setEditingUsername(prev => prev ? { ...prev, username: e.target.value } : null)}
                placeholder="Enter new username"
                disabled={isLoading}
                className="transition-all duration-200 focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={closeUsernameDialog}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSaveUsername}
              disabled={isLoading || !editingUsername?.username.trim()}
              className="relative"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Saving...
                </span>
              ) : (
                'Save Changes'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function EmployeesPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen">Loading...</div>}>
      <EmployeeList />
    </Suspense>
  );
}
