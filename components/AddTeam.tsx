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

interface Employee {
    id: number;
    firstName: string;
    lastName: string;
    city: string;
    role: string;
    teamId: number | null;
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
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedOfficeManager, setSelectedOfficeManager] = useState<string[]>([]);
    const [selectedCities, setSelectedCities] = useState<string[]>([]);
    const [selectedEmployees, setSelectedEmployees] = useState<number[]>([]);
    const [officeManagers, setOfficeManagers] = useState<SearchableSelectOption[]>([]);
    const [cities, setCities] = useState<SearchableSelectOption[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [isCreatingTeam, setIsCreatingTeam] = useState(false);

    const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;

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
            const allEmployees = allEmployeesData.flat()
                .filter((employee: Employee) =>
                    employee.role === "Field Officer" && employee.teamId === null
                );

            setEmployees(allEmployees);
        } catch (error) {
            console.error(`Error fetching employees for cities ${cities.join(", ")}:`, error);
        }
    };

    const handleCitySelect = async () => {
        if (selectedCities.length > 0 && selectedOfficeManager.length > 0) {
            const managerId = parseInt(selectedOfficeManager[0]);
            try {
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
            const requestBody = {
                officeManager: parseInt(selectedOfficeManager[0]),
                fieldOfficers: selectedEmployees,
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
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add New Team</DialogTitle>
                    </DialogHeader>
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
                            {/* Selected chips */}
                            {selectedCities.length > 0 && (
                                <div className="mt-2 flex flex-wrap gap-2">
                                    {selectedCities.map((city) => (
                                        <Badge key={city} variant="secondary" className="text-xs">
                                            {city}
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
                                                    {c.label}
                                                </label>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </ScrollArea>
                            <Button className="mt-3" onClick={handleCitySelect} disabled={selectedCities.length === 0}>
                                Assign Cities
                            </Button>
                        </div>
                        {selectedCities.length > 0 && (
                            <div>
                                <label>Team Members</label>
                                <div className="max-h-60 overflow-y-auto">
                                    {employees.map((employee) => (
                                        <div key={employee.id} className="flex items-center space-x-2">
                                            <Checkbox
                                                id={`employee-${employee.id}`}
                                                checked={selectedEmployees.includes(employee.id)}
                                                onCheckedChange={() => handleEmployeeToggle(employee.id)}
                                            />
                                            <label htmlFor={`employee-${employee.id}`}>
                                                {employee.firstName} {employee.lastName}
                                            </label>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="flex justify-end space-x-2 mt-4">
                        <Button variant="outline" onClick={() => setIsModalOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleCreateTeam}
                            disabled={isCreatingTeam || selectedOfficeManager.length === 0 || selectedEmployees.length === 0}
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
