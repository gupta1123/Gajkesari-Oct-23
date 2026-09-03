"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Loader2, Search, UsersRound, X } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import type { SearchableSelectOption } from "@/components/ui/searchable-select";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/components/auth-provider";
import { hasAdminSetupPrivileges } from "@/lib/auth";
import { buildCityOptions, mergeCityOptions, normalizeCityKey } from "@/lib/city-options";
import { getTeamManagers } from "@/lib/team-access";
import { API } from "@/lib/api";

const API_BASE_URL = 'https://api.gajkesaristeels.in';

interface Employee {
    id: number;
    firstName: string;
    lastName: string;
    city: string;
    role: string;
    teamId: number | null;
    status?: string;
    assignedCity?: string[] | null;
    eligibleCities?: string[];
}

interface OfficeManager {
    id: number;
    firstName: string;
    lastName: string;
    city: string;
    email: string;
    deleted?: boolean;
    role?: string;
    isOfficeManager?: boolean;
}

interface CityOption extends SearchableSelectOption {
    assignedTo: string[];
}

interface TeamSummary {
    id: number;
    office?: {
        id: number;
        firstName?: string;
        lastName?: string;
        assignedCity?: string[];
    } | null;
    officeManager?: {
        id: number;
        firstName?: string;
        lastName?: string;
        assignedCity?: string[];
    } | null;
    officeManagers?: Array<{
        id: number;
        firstName?: string;
        lastName?: string;
        assignedCity?: string[];
    }> | null;
}

const createCityOption = (city: string): CityOption => ({ value: city, label: city, assignedTo: [] });

type TeamSummaryManager = NonNullable<TeamSummary["officeManager"]>;

const getTeamManagersFromSummaries = (teams: TeamSummary[]) => {
    const byId = new Map<number, TeamSummaryManager>();

    teams.forEach((team) => {
        getTeamManagers(team).forEach((manager) => {
            byId.set(manager.id, manager);
        });
    });

    return Array.from(byId.values());
};

interface AddTeamProps {
    onCreated?: () => void | Promise<void>;
}

const AddTeam = ({ onCreated }: AddTeamProps) => {
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
    const [assigningEmployeeCities, setAssigningEmployeeCities] = useState<string[]>([]);
    const [modalError, setModalError] = useState<string | null>(null);

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
        setAssigningEmployeeCities([]);
        setModalError(null);
    };

    const requestCloseModal = () => {
        setIsModalOpen(false);
    };

    const fetchOfficeManagers = useCallback(async () => {
        try {
            const allEmployeesData = (await API.getAllEmployees()) as unknown as OfficeManager[];
            const teamsResponse = await fetch(
                `${API_BASE_URL}/employee/team/getAll`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            if (!teamsResponse.ok) {
                throw new Error('Failed to fetch team assignments');
            }
            const teamsData = await teamsResponse.json();

            const teams = teamsData as TeamSummary[];
            const assignedManagerIds = getTeamManagersFromSummaries(teams).map((manager) => manager.id);

            const assignments: Record<string, string[]> = {};
            teams.forEach((team) => {
                getTeamManagers(team).forEach((manager) => {
                    if (!manager?.assignedCity) return;
                    const managerName = [manager.firstName, manager.lastName].filter(Boolean).join(' ').trim() || `Team ${team.id}`;
                    manager.assignedCity.forEach((city) => {
                        const key = normalizeCityKey(city);
                        if (!key) return;
                        assignments[key] = Array.from(new Set([...(assignments[key] ?? []), managerName]));
                    });
                });
            });
            setCityAssignments(assignments);

            const employeeCityOptions = buildCityOptions<CityOption>(
                allEmployeesData.map((employee: OfficeManager) => employee.city),
                createCityOption
            );
            const assignedCityOptions = buildCityOptions<CityOption>(
                teams.flatMap((team) => getTeamManagers(team).flatMap((manager) => manager.assignedCity ?? [])),
                createCityOption
            );
            setCities((prev) => mergeCityOptions(prev, employeeCityOptions, assignedCityOptions));
            
            const deletedManagerIds = allEmployeesData
                .filter((employee: OfficeManager) => employee.isOfficeManager === true && employee.deleted)
                .map((employee: OfficeManager) => employee.id);
            
            const availableManagers = allEmployeesData
                .filter((employee: OfficeManager) =>
                    employee.isOfficeManager === true &&
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
            console.error("Error fetching managers:", error);
        }
    }, [token]);

    const fetchCities = useCallback(async () => {
        try {
            const response = await fetch(
                `${API_BASE_URL}/employee/getCities`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );
            const data = await response.json();
            const sortedCities = buildCityOptions<CityOption>(data, createCityOption);
            setCities((prev) => mergeCityOptions(prev, sortedCities));
        } catch (error) {
            console.error("Error fetching cities:", error);
        }
    }, [token]);

    const filteredCities = useMemo(() => {
        const query = citySearchTerm.trim().toLowerCase();
        let filtered = cities;
        
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
            fetchOfficeManagers();
            fetchCities();
        }
    }, [isModalOpen, token, fetchOfficeManagers, fetchCities]);

    const fetchEmployeesByCities = useCallback(async (citiesList: string[]) => {
        if (citiesList.length === 0) {
            setEmployees([]);
            return;
        }

        try {
            setIsLoadingEmployees(true);
            const promises = citiesList.map(city =>
                fetch(
                    `${API_BASE_URL}/employee/getFieldOfficerByCity?city=${encodeURIComponent(city)}`,
                    {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                    }
                )
            );

            const responses = await Promise.all(promises);
            const failedResponse = responses.find((response) => !response.ok);
            if (failedResponse) {
                throw new Error(await failedResponse.text() || 'Failed to load field officers');
            }
            const allEmployeesData = await Promise.all(responses.map(r => r.json()));
            const merged: Record<number, Employee> = {};
            allEmployeesData.forEach((cityEmployees: Employee[], index: number) => {
                const sourceCity = citiesList[index];
                cityEmployees.forEach((employee: Employee) => {
                    if (!merged[employee.id]) {
                        merged[employee.id] = { ...employee, eligibleCities: [sourceCity] };
                    } else {
                        merged[employee.id].eligibleCities = Array.from(
                            new Set([...(merged[employee.id].eligibleCities ?? []), sourceCity])
                        );
                    }
                });
            });

            const allEmployees = Object.values(merged)
                .filter((employee: Employee) => employee.role === "Field Officer");

            setEmployees(allEmployees);
        } catch (error) {
            console.error(`Error fetching employees for cities ${citiesList.join(", ")}:`, error);
        } finally {
            setIsLoadingEmployees(false);
        }
    }, [token]);

    useEffect(() => {
        if (!isModalOpen || !token) return;
        fetchEmployeesByCities(selectedCities);
    }, [fetchEmployeesByCities, isModalOpen, selectedCities, token]);

    const assignCitiesToManagers = async (managerIds: number[]) => {
        await Promise.all(managerIds.flatMap((managerId) => selectedCities.map(async (city) => {
            const response = await fetch(
                `${API_BASE_URL}/employee/assignCity?id=${managerId}&city=${encodeURIComponent(city)}`,
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
        })));
    };

    const isEmployeeAssignedToAnEligibleCity = (employee: Employee) => {
        const assignedKeys = new Set((employee.assignedCity ?? []).map(normalizeCityKey));
        return (employee.eligibleCities ?? []).some((city) => assignedKeys.has(normalizeCityKey(city)));
    };

    const assignCityToEmployee = async (employeeId: number, city: string) => {
        if (!token) return;
        const assignmentKey = `${employeeId}:${normalizeCityKey(city)}`;
        setAssigningEmployeeCities((current) => [...current, assignmentKey]);
        setModalError(null);

        try {
            await API.assignEmployeeCity(employeeId, city);
            setEmployees((current) => current.map((employee) => {
                if (employee.id !== employeeId) return employee;
                const assignedCity = Array.from(new Set([...(employee.assignedCity ?? []), city]));
                return { ...employee, assignedCity };
            }));
        } catch (error) {
            setModalError(error instanceof Error ? error.message : `Failed to assign ${city}`);
        } finally {
            setAssigningEmployeeCities((current) => current.filter((key) => key !== assignmentKey));
        }
    };

    const handleCreateTeam = async () => {
        if (selectedOfficeManager.length === 0 || selectedCities.length === 0 || !token || selectedEmployees.length === 0) {
            return;
        }

        try {
            setIsCreatingTeam(true);
            const activeSelected = selectedEmployees.filter(id =>
                employees.some(e =>
                    e.id === id &&
                    String(e.status || '').toLowerCase() === 'active' &&
                    e.teamId === null &&
                    isEmployeeAssignedToAnEligibleCity(e)
                )
            );
            if (activeSelected.length === 0) return;

            const managerIds = selectedOfficeManager
                .map((id) => parseInt(id, 10))
                .filter((id) => Number.isFinite(id));

            if (managerIds.length === 0) return;

            await assignCitiesToManagers(managerIds);

            const requestBody = {
                officeManager: managerIds[0],
                officeManagers: managerIds,
                fieldOfficers: activeSelected,
            };

            const response = await fetch(
                `${API_BASE_URL}/employee/team/create`,
                {
                    method: 'POST',
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify(requestBody),
                }
            );

            if (response.ok) {
                await onCreated?.();
                setIsModalOpen(false);
                resetForm();
            } else {
                const errorText = await response.text();
                throw new Error(errorText || `Team creation failed (${response.status})`);
            }
        } catch (error) {
            console.error("Error creating team:", error);
            const message = error instanceof Error ? error.message : 'Failed to create team';
            setModalError(message);
        } finally {
            setIsCreatingTeam(false);
        }
    };

    const handleToggleCity = (cityValue: string) => {
        setSelectedCities((prev) =>
            prev.includes(cityValue)
                ? prev.filter((value) => value !== cityValue)
                : [...prev, cityValue]
        );
    };

    const handleEmployeeToggle = (employeeId: number) => {
        const employee = employees.find(e => e.id === employeeId);
        const isActive = String(employee?.status || '').toLowerCase() === 'active';
        const isUnassigned = employee?.teamId === null;
        const hasCityAssignment = employee ? isEmployeeAssignedToAnEligibleCity(employee) : false;
        if (!isActive || !isUnassigned || !hasCityAssignment) return;

        setSelectedEmployees((prev) =>
            prev.includes(employeeId)
                ? prev.filter((id) => id !== employeeId)
                : [...prev, employeeId]
        );
    };

    if (!canManageTeamSetup) {
        return null;
    }

    return (
        <>
            <Button
                variant="outline"
                size="sm"
                onClick={() => setIsModalOpen(true)}
                className="flex items-center gap-2 text-xs"
            >
                <UsersRound className="h-4 w-4" />
                Add Team
            </Button>

            <Sheet open={isModalOpen} onOpenChange={(open) => {
                if (!open) {
                    requestCloseModal();
                } else {
                    setIsModalOpen(true);
                }
            }}>
                <SheetContent side="right" className="w-full sm:max-w-xl flex flex-col h-full p-0">
                    <SheetHeader className="p-6 pb-4 border-b">
                        <SheetTitle className="text-lg font-semibold flex items-center gap-2">
                            <UsersRound className="h-5 w-5 text-primary" />
                            Create New Team
                        </SheetTitle>
                        <SheetDescription className="text-xs">
                            Select office managers, assign team cities, and choose field officers.
                        </SheetDescription>
                    </SheetHeader>

                    <ScrollArea className="flex-1 px-6 py-4">
                        <div className="space-y-6">
                            {modalError && (
                                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md text-xs text-destructive flex items-center gap-2">
                                    <X className="h-4 w-4 shrink-0" />
                                    <span>{modalError}</span>
                                </div>
                            )}

                            {/* Regional Managers / Office Managers */}
                            <div className="space-y-2">
                                <Label className="text-xs font-semibold">Regional Manager</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" className="w-full justify-between h-9 text-xs shadow-none">
                                            {selectedOfficeManager.length > 0
                                                ? officeManagers.find(m => m.value === selectedOfficeManager[0])?.label || "Select manager"
                                                : "Select manager"}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-full p-2" align="start">
                                        <div className="space-y-1">
                                            {officeManagers.map((manager) => (
                                                <div
                                                    key={manager.value}
                                                    onClick={() => setSelectedOfficeManager([manager.value])}
                                                    className="flex items-center gap-2 px-2 py-1.5 hover:bg-accent rounded-sm cursor-pointer text-xs"
                                                >
                                                    <Checkbox checked={selectedOfficeManager.includes(manager.value)} />
                                                    <span>{manager.label}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </PopoverContent>
                                </Popover>
                            </div>

                            {/* Select Cities */}
                            <div className="space-y-2">
                                <Label className="text-xs font-semibold">Cities</Label>
                                <Popover open={isCityPopoverOpen} onOpenChange={setIsCityPopoverOpen}>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" className="w-full justify-between h-9 text-xs shadow-none">
                                            {cityTriggerLabel}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[320px] p-2" align="start">
                                        <div className="space-y-2">
                                            <Input
                                                placeholder="Search cities..."
                                                value={citySearchTerm}
                                                onChange={(e) => setCitySearchTerm(e.target.value)}
                                                className="h-8 text-xs"
                                            />
                                            <div className="max-h-48 overflow-y-auto space-y-1">
                                                {filteredCities.map((city) => (
                                                    <div
                                                        key={city.value}
                                                        onClick={() => handleToggleCity(city.value)}
                                                        className="flex items-center justify-between px-2 py-1.5 hover:bg-accent rounded-sm cursor-pointer text-xs"
                                                    >
                                                        <div className="flex items-center gap-2">
                                                            <Checkbox checked={selectedCities.includes(city.value)} />
                                                            <span>{toSentenceCase(city.label)}</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </PopoverContent>
                                </Popover>

                                {selectedCities.length > 0 && (
                                    <div className="flex flex-wrap gap-1 pt-1">
                                        {selectedCities.map((city) => (
                                            <Badge key={city} variant="secondary" className="text-[11px] gap-1 py-0.5">
                                                {toSentenceCase(city)}
                                                <X
                                                    className="h-3 w-3 cursor-pointer text-muted-foreground hover:text-foreground"
                                                    onClick={() => handleToggleCity(city)}
                                                />
                                            </Badge>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Field Officers List */}
                            <div className="space-y-2">
                                <Label className="text-xs font-semibold">Field Officers</Label>
                                {isLoadingEmployees ? (
                                    <div className="space-y-2">
                                        {[...Array(3)].map((_, i) => (
                                            <Skeleton key={i} className="h-10 w-full" />
                                        ))}
                                    </div>
                                ) : employees.length === 0 ? (
                                    <div className="text-xs text-muted-foreground p-4 text-center border rounded-md">
                                        {selectedCities.length === 0
                                            ? "Select cities above to view available field officers."
                                            : "No field officers found for selected cities."}
                                    </div>
                                ) : (
                                    <div className="border rounded-md divide-y max-h-64 overflow-y-auto">
                                        {employees.map((emp) => {
                                            const isActive = String(emp.status || '').toLowerCase() === 'active';
                                            const isUnassigned = emp.teamId === null;
                                            const hasCityAssignment = isEmployeeAssignedToAnEligibleCity(emp);
                                            const canSelect = isActive && isUnassigned && hasCityAssignment;

                                            return (
                                                <div
                                                    key={emp.id}
                                                    onClick={() => canSelect && handleEmployeeToggle(emp.id)}
                                                    className={`p-3 flex items-center justify-between transition-colors ${
                                                        canSelect ? 'hover:bg-accent/50 cursor-pointer' : 'opacity-60 cursor-not-allowed bg-muted/20'
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-3 min-w-0">
                                                        <Checkbox
                                                            checked={selectedEmployees.includes(emp.id)}
                                                            disabled={!canSelect}
                                                        />
                                                        <div className="min-w-0">
                                                            <p className="text-xs font-medium truncate">{emp.firstName} {emp.lastName}</p>
                                                            <p className="text-[11px] text-muted-foreground">{toSentenceCase(emp.city)}</p>
                                                        </div>
                                                    </div>
                                                    {!hasCityAssignment && canSelect && (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="h-7 text-[11px] px-2"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                if (emp.eligibleCities?.[0]) {
                                                                    assignCityToEmployee(emp.id, emp.eligibleCities[0]);
                                                                }
                                                            }}
                                                        >
                                                            Assign City
                                                        </Button>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    </ScrollArea>

                    <div className="p-6 border-t mt-auto flex items-center justify-end gap-2 bg-muted/10">
                        <Button variant="outline" size="sm" onClick={requestCloseModal} disabled={isCreatingTeam}>
                            Cancel
                        </Button>
                        <Button
                            size="sm"
                            onClick={handleCreateTeam}
                            disabled={isCreatingTeam || selectedOfficeManager.length === 0 || selectedCities.length === 0 || selectedEmployees.length === 0}
                        >
                            {isCreatingTeam && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Create Team
                        </Button>
                    </div>
                </SheetContent>
            </Sheet>
        </>
    );
};

export default AddTeam;
