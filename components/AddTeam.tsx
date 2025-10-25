"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import type { SearchableSelectOption } from "@/components/ui/searchable-select";
import { Skeleton } from "@/components/ui/skeleton";
import { useRouter } from "next/navigation";

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

// Using SearchableSelectOption from the imported component

const AddTeam = () => {
    const router = useRouter();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedOfficeManager, setSelectedOfficeManager] = useState<string[]>([]);
    const [selectedCities, setSelectedCities] = useState<string[]>([]);
    const [selectedEmployees, setSelectedEmployees] = useState<number[]>([]);
    const [officeManagers, setOfficeManagers] = useState<SearchableSelectOption[]>([]);
    const [cities, setCities] = useState<SearchableSelectOption[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [isCreatingTeam, setIsCreatingTeam] = useState(false);
    const [isAssigningCities, setIsAssigningCities] = useState(false);
    const [isLoadingEmployees, setIsLoadingEmployees] = useState(false);

    const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;

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

            const assignedManagerIds = teamsData.map((team: Record<string, unknown>) => (team.officeManager as Record<string, unknown>).id);
            console.log('Assigned manager IDs:', assignedManagerIds);
            
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
            
            const sortedCities = data
                .filter((city: string) => city && city.trim() !== '') // Filter out empty cities
                .sort((a: string, b: string) => a.localeCompare(b))
                .map((city: string) => ({ value: city, label: city }));
            
            console.log('Sorted cities:', sortedCities);
            setCities(sortedCities);
        } catch (error) {
            console.error("Error fetching cities:", error);
        }
    }, [token]);

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

    const fetchEmployeesByCities = async (cities: string[]) => {
        try {
            setIsLoadingEmployees(true);
            const promises = cities.map(city =>
                fetch(
                    `https://api.gajkesaristeels.in/employee/getFieldOfficerByCity?city=${city}`,
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
                .filter((employee: Employee) => employee.role === "Field Officer" && employee.teamId === null);

            setEmployees(allEmployees);
        } catch (error) {
            console.error(`Error fetching employees for cities ${cities.join(", ")}:`, error);
        }
        finally {
            setIsLoadingEmployees(false);
        }
    };

    const handleCitySelect = async () => {
        if (selectedCities.length > 0 && selectedOfficeManager.length > 0) {
            const managerId = parseInt(selectedOfficeManager[0]);
            try {
                setIsAssigningCities(true);
                for (const city of selectedCities) {
                    await fetch(
                        `https://api.gajkesaristeels.in/employee/assignCity?id=${managerId}&city=${city}`,
                        {
                            method: 'PUT',
                            headers: {
                                Authorization: `Bearer ${token}`,
                            },
                        }
                    );
                }
                await fetchEmployeesByCities(selectedCities);
            } catch (error) {
                console.error(`Error assigning cities to Regional manager ${managerId}:`, error);
            } finally {
                setIsAssigningCities(false);
            }
        }
    };

    const handleCreateTeam = async () => {
        console.log('=== CREATING TEAM ===');
        console.log('Selected office manager:', selectedOfficeManager);
        console.log('Selected employees:', selectedEmployees);
        
        if (selectedOfficeManager.length === 0) {
            console.log('No office manager selected');
            return;
        }

        if (selectedEmployees.length === 0) {
            console.log('No employees selected');
            return;
        }

        try {
            setIsCreatingTeam(true);
            const activeSelected = selectedEmployees.filter(id =>
                employees.some(e => e.id === id && String(e.status || '').toLowerCase() === 'active')
            );
            const requestBody = {
                officeManager: parseInt(selectedOfficeManager[0]),
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
                console.log('Team created successfully');
                setIsModalOpen(false);
                resetForm();
                try {
                    router.push('/dashboard/settings/team');
                } catch {}
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

    const handleEmployeeToggle = (employeeId: number) => {
        const employee = employees.find(e => e.id === employeeId);
        const isActive = String(employee?.status || '').toLowerCase() === 'active';
        if (!isActive) return; // guard
        setSelectedEmployees(prev => 
            prev.includes(employeeId) 
                ? prev.filter(id => id !== employeeId)
                : [...prev, employeeId]
        );
    };

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
                                <ScrollArea className="mt-2 h-60 border rounded-md p-2">
                                    {cities.length === 0 ? (
                                        <div className="text-sm text-muted-foreground">No cities available</div>
                                    ) : (
                                        <div className="space-y-1">
                                            {cities.map((c) => (
                                                <div key={c.value} className="flex items-center space-x-2 py-1">
                                                    <Checkbox
                                                        id={`city-${c.value}`}
                                                        checked={selectedCities.includes(c.value)}
                                                        onCheckedChange={() => {
                                                            setSelectedCities((prev) =>
                                                                prev.includes(c.value)
                                                                    ? prev.filter((v) => v !== c.value)
                                                                    : [...prev, c.value]
                                                            );
                                                        }}
                                                    />
                                                    <label htmlFor={`city-${c.value}`} className="text-sm">
                                                        {toSentenceCase(c.label)}
                                                    </label>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </ScrollArea>
                                <Button className="mt-3" onClick={handleCitySelect} disabled={selectedCities.length === 0 || isAssigningCities}>
                                    {isAssigningCities ? (
                                        <span className="inline-flex items-center">
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Assigning...
                                        </span>
                                    ) : (
                                        'Assign Cities'
                                    )}
                                </Button>
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
                                        const active = employees
                                            .filter(e => String(e.status || '').toLowerCase() === 'active')
                                            .sort((a, b) => fullName(a).localeCompare(fullName(b)));
                                        const inactive = employees
                                            .filter(e => String(e.status || '').toLowerCase() !== 'active')
                                            .sort((a, b) => fullName(a).localeCompare(fullName(b)));
                                        return (
                                            <>
                                                <div>
                                                    <div className="text-xs font-medium text-muted-foreground mb-2">Active</div>
                                                    {active.length === 0 ? (
                                                        <div className="text-xs text-muted-foreground">No active officers found</div>
                                                    ) : (
                                                        <div className="space-y-2">
                                                            {active.map((employee) => (
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
                            disabled={isCreatingTeam || selectedOfficeManager.length === 0 || selectedEmployees.filter(id => employees.some(e => e.id === id && String(e.status || '').toLowerCase() === 'active')).length === 0}
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
