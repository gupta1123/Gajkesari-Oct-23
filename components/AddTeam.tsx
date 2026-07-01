"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Loader2, Search, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import type { SearchableSelectOption } from "@/components/ui/searchable-select";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAuth } from "@/components/auth-provider";
import { hasAdminSetupPrivileges } from "@/lib/auth";
import { buildCityOptions, mergeCityOptions, normalizeCityKey } from "@/lib/city-options";

interface Employee {
    id: number;
    firstName: string;
    lastName: string;
    city: string;
    role: string;
    teamId: number | null;
    status?: string;
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

interface CityOption extends SearchableSelectOption {
    assignedTo: string[];
}

interface TeamSummary {
    id: number;
    officeManager?: {
        id: number;
        firstName?: string;
        lastName?: string;
        assignedCity?: string[];
    };
}

// Using SearchableSelectOption from the imported component
const createCityOption = (city: string): CityOption => ({ value: city, label: city, assignedTo: [] });

const AddTeam = () => {
    const { token: authToken, userRole, currentUser } = useAuth();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedOfficeManager, setSelectedOfficeManager] = useState<string[]>([]);
    const [selectedCities, setSelectedCities] = useState<string[]>([]);
    const [selectedEmployees, setSelectedEmployees] = useState<number[]>([]);
    const [officeManagers, setOfficeManagers] = useState<SearchableSelectOption[]>([]);
    const [cities, setCities] = useState<CityOption[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [isCreatingTeam, setIsCreatingTeam] = useState(false);
    const [isLoadingEmployees, setIsLoadingEmployees] = useState(false);
    const [isCityPopoverOpen, setIsCityPopoverOpen] = useState(false);
    const [citySearchTerm, setCitySearchTerm] = useState("");
    const [cityAssignments, setCityAssignments] = useState<Record<string, string[]>>({});

    const canManageTeamSetup = hasAdminSetupPrivileges(userRole, currentUser);
    const token = authToken ?? (typeof window !== 'undefined' ? localStorage.getItem('authToken') : null);


    const toSentenceCase = (value: string | null | undefined) => {
        if (!value) return '';
        return value
            .toLowerCase()
            .split(' ')
            .filter(Boolean)
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    };

    useEffect(() => {
        if (!isModalOpen) {
            resetForm();
        }
    }, [isModalOpen]);

    const resetForm = () => {
        setSelectedOfficeManager([]);
        setSelectedCities([]);
        setSelectedEmployees([]);
        setEmployees([]);
        setCitySearchTerm("");
    };

    const fetchOfficeManagers = useCallback(async () => {
        try {
            console.log('=== FETCHING OFFICE MANAGERS ===');
            console.log('Token present:', !!token);
            
            console.log('=== STARTING API CALLS ===');
            const allEmployeesResponse = await fetch(
                "https://api.gajkesaristeels.in/employee/getAll",
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            const teamsResponse = await fetch(
                "https://api.gajkesaristeels.in/employee/team/getAll",
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            console.log('=== API RESPONSES RECEIVED ===');
            console.log('Employees response status:', allEmployeesResponse.status);
            console.log('Teams response status:', teamsResponse.status);

            const allEmployeesData = await allEmployeesResponse.json();
            const teamsData = await teamsResponse.json();
            
            console.log('=== API DATA PARSED ===');
            console.log('All employees data:', allEmployeesData);
            console.log('Teams data:', teamsData);

            const teams = teamsData as TeamSummary[];
            const assignedManagerIds = teams.map((team) => team.officeManager?.id).filter((id): id is number => typeof id === 'number');
            console.log('Assigned manager IDs:', assignedManagerIds);

            const assignments: Record<string, string[]> = {};
            teams.forEach((team) => {
                const manager = team.officeManager;
                if (!manager?.assignedCity) return;
                const managerName = [manager.firstName, manager.lastName].filter(Boolean).join(' ').trim() || `Team ${team.id}`;
                manager.assignedCity.forEach((city) => {
                    const key = normalizeCityKey(city);
                    if (!key) return;
                    assignments[key] = Array.from(new Set([...(assignments[key] ?? []), managerName]));
                });
            });
            setCityAssignments(assignments);

            const employeeCityOptions = buildCityOptions<CityOption>(
                allEmployeesData.map((employee: OfficeManager) => employee.city),
                createCityOption
            );
            const assignedCityOptions = buildCityOptions<CityOption>(
                teams.flatMap((team) => team.officeManager?.assignedCity ?? []),
                createCityOption
            );
            setCities((prev) => mergeCityOptions(prev, employeeCityOptions, assignedCityOptions));
            
            const deletedManagerIds = allEmployeesData
                .filter((employee: OfficeManager) => (employee.role === "Manager" || employee.role === "Office Manager") && employee.deleted)
                .map((employee: OfficeManager) => employee.id);
            console.log('Deleted manager IDs:', deletedManagerIds);
            
            const availableManagers = allEmployeesData
                .filter((employee: OfficeManager) =>
                    (employee.role === "Manager" || employee.role === "Office Manager") &&
                    !assignedManagerIds.includes(employee.id) &&
                    !deletedManagerIds.includes(employee.id)
                )
                .sort((a: OfficeManager, b: OfficeManager) => 
                    `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`)
                )
                .map((manager: OfficeManager) => ({
                    value: manager.id.toString(),
                    label: `${manager.firstName} ${manager.lastName}`
                }));

            console.log('Available managers:', availableManagers);
            console.log('Available managers count:', availableManagers.length);
            console.log('First manager example:', availableManagers[0]);
            setOfficeManagers(availableManagers);
        } catch (error) {
            console.error("Error fetching Regional managers:", error);
        }
    }, [token]);
   
    // Office manager selection is now handled by SearchableSelect component

    const fetchCities = useCallback(async () => {
        try {
            console.log('=== FETCHING CITIES ===');
            const response = await fetch(
                "https://api.gajkesaristeels.in/employee/getCities",
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );
            const data = await response.json();
            console.log('Cities data:', data);
            
            const sortedCities = buildCityOptions<CityOption>(data, createCityOption);
            
            console.log('Sorted cities:', sortedCities);
            setCities((prev) => mergeCityOptions(prev, sortedCities));
        } catch (error) {
            console.error("Error fetching cities:", error);
        }
    }, [token]);

    const filteredCities = useMemo(() => {
        const query = citySearchTerm.trim().toLowerCase();
        let filtered = cities;
        
        // Filter by search query
        if (query) {
            filtered = filtered.filter((city) => city.label.toLowerCase().includes(query));
        }

        return filtered;
    }, [cities, citySearchTerm]);

    const cityTriggerLabel = useMemo(() => {
        if (selectedCities.length === 0) return "Select cities";
        if (selectedCities.length === 1) return toSentenceCase(selectedCities[0]);
        return `${selectedCities.length} cities selected`;
    }, [selectedCities]);

    useEffect(() => {
        if (isModalOpen && token) {
            console.log('=== MODAL OPENED ===');
            console.log('Modal open:', isModalOpen);
            console.log('Token present:', !!token);
            fetchOfficeManagers();
            fetchCities();
        }
    }, [isModalOpen, token, fetchOfficeManagers, fetchCities]);

    // Debug effect to track SearchableSelect data
    useEffect(() => {
        if (isModalOpen) {
            console.log('=== SEARCHABLE SELECT DATA DEBUG ===');
            console.log('Office managers for select:', {
                count: officeManagers.length,
                data: officeManagers,
                selected: selectedOfficeManager
            });
            console.log('Cities for select:', {
                count: cities.length,
                data: cities,
                selected: selectedCities
            });
        }
    }, [isModalOpen, officeManagers, cities, selectedOfficeManager, selectedCities]);

    const fetchEmployeesByCities = useCallback(async (cities: string[]) => {
        if (cities.length === 0) {
            setEmployees([]);
            return;
        }

        try {
            setIsLoadingEmployees(true);
            const promises = cities.map(city =>
                fetch(
                    `https://api.gajkesaristeels.in/employee/getFieldOfficerByCity?city=${encodeURIComponent(city)}`,
                    {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                    }
                )
            );

            const responses = await Promise.all(promises);
            const allEmployeesData = await Promise.all(responses.map(r => r.json()));
            // Flatten and de-duplicate employees by id across cities
            const merged: Record<number, Employee> = {};
            allEmployeesData.flat().forEach((employee: Employee) => {
                if (!merged[employee.id]) merged[employee.id] = employee;
            });

            const allEmployees = Object.values(merged)
                .filter((employee: Employee) => employee.role === "Field Officer");

            setEmployees(allEmployees);
        } catch (error) {
            console.error(`Error fetching employees for cities ${cities.join(", ")}:`, error);
        }
        finally {
            setIsLoadingEmployees(false);
        }
    }, [token]);

    useEffect(() => {
        if (!isModalOpen || !token) return;
        fetchEmployeesByCities(selectedCities);
    }, [fetchEmployeesByCities, isModalOpen, selectedCities, token]);

    const assignCitiesToManager = async (managerId: number) => {
        await Promise.all(selectedCities.map(async (city) => {
            const response = await fetch(
                `https://api.gajkesaristeels.in/employee/assignCity?id=${managerId}&city=${encodeURIComponent(city)}`,
                {
                    method: 'PUT',
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            if (!response.ok) {
                throw new Error(`Failed to assign city ${city}`);
            }
        }));
    };

    const handleCreateTeam = async () => {
        console.log('=== CREATING TEAM ===');
        console.log('Selected office manager:', selectedOfficeManager);
        console.log('Selected employees:', selectedEmployees);
        
        if (selectedOfficeManager.length === 0) {
            console.log('No office manager selected');
            return;
        }

        if (selectedCities.length === 0) {
            console.log('No cities selected');
            return;
        }

        if (!token) {
            console.log('No auth token found');
            return;
        }

        if (selectedEmployees.length === 0) {
            console.log('No employees selected');
            return;
        }

        try {
            setIsCreatingTeam(true);
            const activeSelected = selectedEmployees.filter(id =>
                employees.some(e =>
                    e.id === id &&
                    String(e.status || '').toLowerCase() === 'active' &&
                    e.teamId === null
                )
            );
            if (activeSelected.length === 0) {
                console.log('No unassigned active employees selected');
                return;
            }

            const managerId = parseInt(selectedOfficeManager[0], 10);
            const requestBody = {
                officeManager: managerId,
                fieldOfficers: activeSelected,
            };
            
            console.log('Team creation request body:', requestBody);
            
            const response = await fetch(
                "https://api.gajkesaristeels.in/employee/team/create",
                {
                    method: 'POST',
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify(requestBody),
                }
            );

            console.log('Team creation response status:', response.status);
            
            if (response.status === 200) {
                await assignCitiesToManager(managerId);
                console.log('Team created successfully');
                setIsModalOpen(false);
                resetForm();
            } else {
                console.log('Team creation failed with status:', response.status);
            }
        } catch (error) {
            console.error("Error creating team:", error);
        } finally {
            setIsCreatingTeam(false);
        }
    };

    // City selection is now handled by SearchableSelect component

    const handleToggleCity = (cityValue: string) => {
        setSelectedCities((prev) =>
            prev.includes(cityValue)
                ? prev.filter((value) => value !== cityValue)
                : [...prev, cityValue]
        );
        // Close the popover after selection/deselection for better UX
        setIsCityPopoverOpen(false);
    };

    const handleEmployeeToggle = (employeeId: number) => {
        const employee = employees.find(e => e.id === employeeId);
        const isActive = String(employee?.status || '').toLowerCase() === 'active';
        const isUnassigned = employee?.teamId === null;
        if (!isActive) return; // guard
        if (!isUnassigned) return;
        setSelectedEmployees(prev => 
            prev.includes(employeeId) 
                ? prev.filter(id => id !== employeeId)
                : [...prev, employeeId]
        );
    };

    if (!canManageTeamSetup) {
        return null;
    }

    return (
        <>
            <Button onClick={() => {
                console.log('=== ADD TEAM BUTTON CLICKED ===');
                console.log('Current state:', {
                    selectedOfficeManager,
                    selectedCities,
                    officeManagersCount: officeManagers.length,
                    citiesCount: cities.length
                });
                setIsModalOpen(true);
            }}>Add Team</Button>
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="sm:max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>Add New Team</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-6 md:grid-cols-2">
                        {/* Left Pane: Manager and Cities */}
                        <div className="space-y-6">
                            <div>
                                <Label htmlFor="officeManager">Regional Manager</Label>
                                <div className="mt-1 w-full">
                                    <Select
                                        value={selectedOfficeManager[0] ?? ""}
                                        onValueChange={(val) => setSelectedOfficeManager(val ? [val] : [])}
                                        disabled={officeManagers.length === 0}
                                    >
                                        <SelectTrigger className="w-full">
                                            <SelectValue placeholder="Select regional manager" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {officeManagers.map((m) => (
                                                <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div>
                                <Label htmlFor="city">Cities</Label>
                                {selectedCities.length > 0 && (
                                    <div className="mt-2 flex flex-wrap gap-2">
                                        {selectedCities.map((city) => (
                                            <Badge key={city} variant="secondary" className="text-xs">
                                                {toSentenceCase(city)}
                                            </Badge>
                                        ))}
                                    </div>
                                )}
                                <Popover open={isCityPopoverOpen} onOpenChange={setIsCityPopoverOpen}>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            className="mt-2 w-full justify-between text-left font-normal"
                                        >
                                            <span className={selectedCities.length === 0 ? "text-muted-foreground" : ""}>
                                                {cityTriggerLabel}
                                            </span>
                                            <Search className="h-4 w-4 text-muted-foreground" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[320px] p-0" align="start">
                                        <div className="border-b p-3 space-y-2">
                                            <div className="relative">
                                                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                                <Input
                                                    placeholder="Search city..."
                                                    value={citySearchTerm}
                                                    onChange={(event) => setCitySearchTerm(event.target.value)}
                                                    className="pl-9"
                                                />
                                            </div>
                                            {selectedCities.length > 0 && (
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    className="w-full justify-start text-primary"
                                                    onClick={() => setSelectedCities([])}
                                                >
                                                    <X className="h-4 w-4 mr-2" />
                                                    Clear selection
                                                </Button>
                                            )}
                                        </div>
                                        <div className="max-h-64 overflow-y-auto overscroll-contain">
                                            {cities.length === 0 ? (
                                                <div className="p-4 text-sm text-muted-foreground">
                                                    No cities available
                                                </div>
                                            ) : filteredCities.length === 0 ? (
                                                <div className="p-4 text-sm text-muted-foreground">
                                                    No matches found
                                                </div>
                                            ) : (
                                                <div className="p-1 space-y-1">
                                                    {filteredCities.map((city) => (
                                                        <div
                                                            key={city.value}
                                                            className="flex items-center space-x-2 rounded-md px-3 py-2 hover:bg-muted/40"
                                                        >
                                                            <Checkbox
                                                                id={`city-${city.value}`}
                                                                checked={selectedCities.includes(city.value)}
                                                                onCheckedChange={() => handleToggleCity(city.value)}
                                                            />
                                                            <label
                                                                htmlFor={`city-${city.value}`}
                                                                className="text-sm flex-1 truncate cursor-pointer"
                                                            >
                                                                {toSentenceCase(city.label)}
                                                            </label>
                                                            {(cityAssignments[normalizeCityKey(city.value)] ?? []).length > 0 && (
                                                                <Badge variant="outline" className="max-w-[130px] truncate text-[10px] font-normal">
                                                                    Assigned to {(cityAssignments[normalizeCityKey(city.value)] ?? []).join(', ')}
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </PopoverContent>
                                </Popover>
                                <p className="mt-2 text-xs text-muted-foreground">
                                    City assignment is saved only when you create the team.
                                </p>
                            </div>
                        </div>

                        {/* Right Pane: Employees (Shown after selecting cities) */}
                        <div className="space-y-3">
                            <label>Team Members</label>
                            {selectedCities.length === 0 ? (
                                <div className="h-60 border rounded-md flex items-center justify-center text-sm text-muted-foreground">
                                    Select one or more cities to view eligible field officers
                                </div>
                            ) : isLoadingEmployees ? (
                                <div className="max-h-[420px] overflow-y-auto space-y-3">
                                    {Array.from({ length: 6 }).map((_, i) => (
                                        <div key={i} className="flex items-center justify-between p-2 rounded-md">
                                            <div className="flex items-center gap-2">
                                                <Skeleton className="h-4 w-4 rounded" />
                                                <Skeleton className="h-4 w-48" />
                                            </div>
                                            <Skeleton className="h-5 w-16" />
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="max-h-[420px] overflow-y-auto space-y-4">
                                    {(() => {
                                        const fullName = (e: Employee) => `${e.firstName} ${e.lastName}`.trim().toLowerCase();
                                        const activeAvailable = employees
                                            .filter(e => String(e.status || '').toLowerCase() === 'active' && e.teamId === null)
                                            .sort((a, b) => fullName(a).localeCompare(fullName(b)));
                                        const activeAssigned = employees
                                            .filter(e => String(e.status || '').toLowerCase() === 'active' && e.teamId !== null)
                                            .sort((a, b) => fullName(a).localeCompare(fullName(b)));
                                        const inactive = employees
                                            .filter(e => String(e.status || '').toLowerCase() !== 'active')
                                            .sort((a, b) => fullName(a).localeCompare(fullName(b)));
                                        return (
                                            <>
                                                <div>
                                                    <div className="text-xs font-medium text-muted-foreground mb-2">Available Active Officers</div>
                                                    {activeAvailable.length === 0 ? (
                                                        <div className="text-xs text-muted-foreground">No unassigned active officers found</div>
                                                    ) : (
                                                        <div className="space-y-2">
                                                            {activeAvailable.map((employee) => (
                                                                <div key={employee.id} className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50">
                                                                    <div className="flex items-center min-w-0">
                                                                        <Checkbox
                                                                            id={`employee-${employee.id}`}
                                                                            checked={selectedEmployees.includes(employee.id)}
                                                                            onCheckedChange={() => handleEmployeeToggle(employee.id)}
                                                                        />
                                                                        <label htmlFor={`employee-${employee.id}`} className="ml-2 text-sm truncate">
                                                                            {toSentenceCase(`${employee.firstName} ${employee.lastName}`)}
                                                                        </label>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="pt-2 border-t">
                                                    <div className="text-xs font-medium text-muted-foreground mb-2">Already Assigned</div>
                                                    {activeAssigned.length === 0 ? (
                                                        <div className="text-xs text-muted-foreground">No assigned active officers in selected cities</div>
                                                    ) : (
                                                        <div className="space-y-2">
                                                            {activeAssigned.map((employee) => (
                                                                <div key={employee.id} className="flex items-center justify-between gap-2 p-2 rounded-md opacity-80">
                                                                    <div className="flex min-w-0 items-center">
                                                                        <Checkbox
                                                                            id={`employee-assigned-${employee.id}`}
                                                                            checked={false}
                                                                            disabled
                                                                        />
                                                                        <label htmlFor={`employee-assigned-${employee.id}`} className="ml-2 text-sm truncate">
                                                                            {toSentenceCase(`${employee.firstName} ${employee.lastName}`)}
                                                                        </label>
                                                                    </div>
                                                                    <Badge variant="outline" className="shrink-0 text-xs">
                                                                        Team {employee.teamId}
                                                                    </Badge>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="pt-2 border-t">
                                                    <div className="text-xs font-medium text-muted-foreground mb-2">Inactive</div>
                                                    {inactive.length === 0 ? (
                                                        <div className="text-xs text-muted-foreground">No inactive officers</div>
                                                    ) : (
                                                        <div className="space-y-2">
                                                            {inactive.map((employee) => (
                                                                <div key={employee.id} className="flex items-center justify-between p-2 rounded-md">
                                                                    <div className="flex items-center min-w-0">
                                                                        <div className="w-4 h-4 mr-2" />
                                                                        <span className="ml-2 text-sm truncate">
                                                                            {toSentenceCase(`${employee.firstName} ${employee.lastName}`)}
                                                                        </span>
                                                                    </div>
                                                                    <Badge variant="destructive" className="text-xs">Inactive</Badge>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </>
                                        );
                                    })()}
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="flex justify-end space-x-2 mt-4">
                        <Button variant="outline" onClick={() => setIsModalOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleCreateTeam}
                            disabled={
                                isCreatingTeam ||
                                selectedOfficeManager.length === 0 ||
                                selectedCities.length === 0 ||
                                selectedEmployees.filter(id =>
                                    employees.some(e =>
                                        e.id === id &&
                                        String(e.status || '').toLowerCase() === 'active' &&
                                        e.teamId === null
                                    )
                                ).length === 0
                            }
                        >
                            {isCreatingTeam ? (
                                <span className="inline-flex items-center">
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Creating...
                                </span>
                            ) : (
                                "Create Team"
                            )}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
};

export default AddTeam;
