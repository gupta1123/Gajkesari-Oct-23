"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import SearchableSelect, { SearchableSelectOption } from "@/components/ui/searchable-select";

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

            const allEmployeesData = await allEmployeesResponse.json();
            const teamsData = await teamsResponse.json();

            const assignedManagerIds = teamsData.map((team: Record<string, unknown>) => (team.officeManager as Record<string, unknown>).id);
            const deletedManagerIds = allEmployeesData
                .filter((employee: OfficeManager) => employee.role === "Manager" && employee.deleted)
                .map((employee: OfficeManager) => employee.id);
            const availableManagers = allEmployeesData
                .filter((employee: OfficeManager) =>
                    employee.role === "Manager" &&
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

            setOfficeManagers(availableManagers);
        } catch (error) {
            console.error("Error fetching Regional managers:", error);
        }
    }, [token]);
   
    // Office manager selection is now handled by SearchableSelect component

    const fetchCities = useCallback(async () => {
        try {
            const response = await fetch(
                "https://api.gajkesaristeels.in/employee/getCities",
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );
            const data = await response.json();
            const sortedCities = data
                .filter((city: string) => city && city.trim() !== '') // Filter out empty cities
                .sort((a: string, b: string) => a.localeCompare(b))
                .map((city: string) => ({ value: city, label: city }));
            setCities(sortedCities);
        } catch (error) {
            console.error("Error fetching cities:", error);
        }
    }, [token]);

    useEffect(() => {
        if (isModalOpen && token) {
            fetchOfficeManagers();
            fetchCities();
        }
    }, [isModalOpen, token, fetchOfficeManagers, fetchCities]);

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
        if (selectedOfficeManager.length === 0) {
            return;
        }

        if (selectedEmployees.length === 0) {
            return;
        }

        try {
            const response = await fetch(
                "https://api.gajkesaristeels.in/employee/team/create",
                {
                    method: 'POST',
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        officeManager: parseInt(selectedOfficeManager[0]),
                        fieldOfficers: selectedEmployees,
                    }),
                }
            );

            if (response.status === 200) {
                setIsModalOpen(false);
                resetForm();
            }
        } catch (error) {
            console.error("Error creating team:", error);
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
            <Button onClick={() => setIsModalOpen(true)}>Add Team</Button>
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add New Team</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="officeManager">Regional Manager</Label>
                            <SearchableSelect
                                options={officeManagers}
                                value={selectedOfficeManager}
                                onChange={setSelectedOfficeManager}
                                placeholder="Select Regional Manager"
                                searchPlaceholder="Search managers..."
                                className="mt-1"
                            />
                        </div>
                        <div>
                            <Label htmlFor="city">Cities</Label>
                            <SearchableSelect
                                options={cities}
                                value={selectedCities}
                                onChange={setSelectedCities}
                                placeholder="Select cities for Regional Manager"
                                searchPlaceholder="Search cities..."
                                className="mt-1"
                            />
                            <Button className="mt-2" onClick={handleCitySelect} disabled={selectedCities.length === 0}>
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
                            disabled={selectedOfficeManager.length === 0 || selectedEmployees.length === 0}
                        >
                            Create Team
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
};

export default AddTeam;
