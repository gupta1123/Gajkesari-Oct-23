"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Badge } from "@/components/ui/badge";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
    UserPlus, 
    MapPin, 
    X, 
    Trash2, 
    Users, 
    User, 
    Building2,
    Loader2,
    Search,
    ChevronDown,
    MoreHorizontal,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { buildCityOptions, mergeCityOptions, normalizeCityKey } from '@/lib/city-options';
import { getPrimaryTeamManager, getTeamAssignedCities, getTeamManagers } from '@/lib/team-access';
import { SearchableSelect } from '@/components/ui/searchable-select2';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import AddTeam from '@/components/AddTeam';

interface Team {
    id: number;
    office?: TeamManager | null;
    officeManager?: TeamManager | null;
    officeManagers?: TeamManager[] | null;
    fieldOfficers: FieldOfficer[];
}

interface TeamManager {
    id: number;
    firstName: string | null;
    lastName: string | null;
    assignedCity?: string[] | null;
    role?: string | null;
    city?: string | null;
    email?: string | null;
    deleted?: boolean;
    isOfficeManager?: boolean;
}

interface FieldOfficer {
    id: number;
    firstName: string;
    lastName: string;
    role: string;
    status: string;
    teamId?: number | null;
}

type TeamPanelSection = 'overview' | 'managers' | 'cities' | 'officers';

const Teams: React.FC = () => {
    const [teams, setTeams] = useState<Team[]>([]);
    const [isDataAvailable, setIsDataAvailable] = useState<boolean>(true);
    const [isDeleteModalVisible, setIsDeleteModalVisible] = useState<boolean>(false);
    const [deleteTeamId, setDeleteTeamId] = useState<number | null>(null);
    const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
    const [selectedOfficeManagerId, setSelectedOfficeManagerId] = useState<number | null>(null);
    const [isEditModalVisible, setIsEditModalVisible] = useState<boolean>(false);
    const [isCityRemoveModalVisible, setIsCityRemoveModalVisible] = useState<boolean>(false);
    const [fieldOfficers, setFieldOfficers] = useState<FieldOfficer[]>([]);
    const [selectedFieldOfficers, setSelectedFieldOfficers] = useState<number[]>([]);
    const [assignedCities, setAssignedCities] = useState<string[]>([]);
    const [cityToRemove, setCityToRemove] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState<{ [key: number]: number }>({});
    const [availableCities, setAvailableCities] = useState<{ value: string; label: string }[]>([]);
    const [selectedCities, setSelectedCities] = useState<string[]>([]);
    const [isCityPopoverOpen, setIsCityPopoverOpen] = useState(false);
    const [citySearchTerm, setCitySearchTerm] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isViewAllModalVisible, setIsViewAllModalVisible] = useState<boolean>(false);
    const [viewAllTeamId, setViewAllTeamId] = useState<number | null>(null);
    const [officersSearch, setOfficersSearch] = useState<string>('');
    const [isRemoveOfficerModalVisible, setIsRemoveOfficerModalVisible] = useState<boolean>(false);
    const [officerToRemove, setOfficerToRemove] = useState<{ teamId: number; officerId: number; name: string } | null>(null);
    const [modalError, setModalError] = useState<string | null>(null);
    const [isManageCitiesModalVisible, setIsManageCitiesModalVisible] = useState<boolean>(false);
    const [currentTeamId, setCurrentTeamId] = useState<number | null>(null);
    const [isManagersModalVisible, setIsManagersModalVisible] = useState<boolean>(false);
    const [allOfficeManagers, setAllOfficeManagers] = useState<TeamManager[]>([]);
    const [selectedManagerIds, setSelectedManagerIds] = useState<number[]>([]);
    const [managerSearchTerm, setManagerSearchTerm] = useState("");
    const [isLoadingManagers, setIsLoadingManagers] = useState(false);
    const [managerFilterId, setManagerFilterId] = useState("");
    const [cityFilter, setCityFilter] = useState("");
    const [fieldOfficerFilterId, setFieldOfficerFilterId] = useState("");
    const [teamSearchQuery, setTeamSearchQuery] = useState("");
    const [isTeamPanelOpen, setIsTeamPanelOpen] = useState(false);
    const [teamPanelSection, setTeamPanelSection] = useState<TeamPanelSection>('overview');
    const [panelTeamId, setPanelTeamId] = useState<number | null>(null);
    const [isDeleteConfirming, setIsDeleteConfirming] = useState(false);

    // Get auth data from localStorage
    const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;

    const sortByNameAsc = (a: { firstName?: string | null; lastName?: string | null }, b: { firstName?: string | null; lastName?: string | null }) => {
        const nameA = `${a.firstName ?? ''} ${a.lastName ?? ''}`.trim().toLowerCase();
        const nameB = `${b.firstName ?? ''} ${b.lastName ?? ''}`.trim().toLowerCase();
        return nameA.localeCompare(nameB);
    };

    const getManagerName = (manager: { id: number; firstName?: string | null; lastName?: string | null }) => {
        return [manager.firstName, manager.lastName].filter(Boolean).join(' ').trim() || `Regional Manager ${manager.id}`;
    };

    const fetchTeams = useCallback(async () => {
        if (!token) {
            setError('Authentication token not found. Please log in.');
            return;
        }

        setIsLoading(true);
        setError(null);
        try {
            const response = await fetch('https://api.gajkesaristeels.in/employee/team/getAll', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch teams: ${response.statusText}`);
            }

            const data = await response.json();

            // Ensure both teams and their officers are sorted by name ASC
            const sortedTeams: Team[] = (data as Team[])
                .map((team) => ({
                    ...team,
                    fieldOfficers: [...(team.fieldOfficers ?? [])].sort((a, b) => sortByNameAsc(a, b)),
                }))
                .sort((a, b) => sortByNameAsc(getPrimaryTeamManager(a) ?? { firstName: '', lastName: '' }, getPrimaryTeamManager(b) ?? { firstName: '', lastName: '' }));

            setTeams(sortedTeams);
            setAvailableCities((prev) =>
                mergeCityOptions(
                    prev,
                    buildCityOptions(sortedTeams.flatMap((team) => getTeamAssignedCities(team)))
                )
            );
            setIsDataAvailable(sortedTeams.length > 0);
        } catch (error) {
            setError(error instanceof Error ? error.message : 'An unknown error occurred');
            setIsDataAvailable(false);
        } finally {
            setIsLoading(false);
        }
    }, [token]);

    const fetchCities = useCallback(async () => {
        if (!token) return;

        try {
            const response = await fetch("https://api.gajkesaristeels.in/employee/getCities", {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                throw new Error('Failed to fetch cities');
            }

            const data = await response.json();
            setAvailableCities((prev) => mergeCityOptions(prev, buildCityOptions(data)));
        } catch (error) {
            console.error('Error fetching cities:', error);
        }
    }, [token]);

    const fetchOfficeManagers = useCallback(async (editingTeamId?: number | null) => {
        if (!token) return;

        setIsLoadingManagers(true);
        try {
            const [employeesResponse, teamsResponse] = await Promise.all([
                fetch('https://api.gajkesaristeels.in/employee/getAll', {
                    headers: { Authorization: `Bearer ${token}` },
                }),
                fetch('https://api.gajkesaristeels.in/employee/team/getAll', {
                    headers: { Authorization: `Bearer ${token}` },
                }),
            ]);

            if (!employeesResponse.ok || !teamsResponse.ok) {
                throw new Error('Failed to fetch team assignments');
            }

            const employeesData = (await employeesResponse.json()) as TeamManager[];
            const teamsData = (await teamsResponse.json()) as Team[];
            const currentTeam = teamsData.find((team) => team.id === editingTeamId);
            const currentManagerIds = new Set(getTeamManagers(currentTeam ?? { id: 0 }).map((manager) => manager.id));
            const assignedElsewhereIds = new Set(
                teamsData
                    .filter((team) => team.id !== editingTeamId)
                    .flatMap((team) => getTeamManagers(team).map((manager) => manager.id))
            );

            const managers = employeesData
                .filter((employee) => {
                    if (employee.isOfficeManager !== true || employee.deleted) return false;
                    return currentManagerIds.has(employee.id) || !assignedElsewhereIds.has(employee.id);
                })
                .sort(sortByNameAsc);

            setAllOfficeManagers(managers);
        } catch (error) {
            console.error('Error fetching managers:', error);
        } finally {
            setIsLoadingManagers(false);
        }
    }, [token]);

    const fetchFieldOfficers = useCallback(async (cities: string[], editingTeamId: number) => {
        if (!token) return;

        try {
            if (cities.length === 0) {
                setFieldOfficers([]);
                return;
            }

            const responses = await Promise.all(
                cities.map((city) =>
                    fetch(
                        `https://api.gajkesaristeels.in/employee/getFieldOfficerByCity?city=${encodeURIComponent(city)}`,
                        { headers: { Authorization: `Bearer ${token}` } },
                    ),
                ),
            );
            const failedResponse = responses.find((response) => !response.ok);
            if (failedResponse) {
                throw new Error(`Failed to fetch field officers (${failedResponse.status})`);
            }

            const officersByCity = (await Promise.all(
                responses.map((response) => response.json()),
            )) as FieldOfficer[][];
            const officersById = new Map<number, FieldOfficer>();
            officersByCity.flat().forEach((officer) => officersById.set(officer.id, officer));

            const currentTeamMemberIds = new Set(
                (teams.find((team) => team.id === editingTeamId)?.fieldOfficers ?? []).map((officer) => officer.id),
            );
            const assignedToOtherTeams = new Set(
                teams
                    .filter((team) => team.id !== editingTeamId)
                    .flatMap((team) => (team.fieldOfficers ?? []).map((officer) => officer.id)),
            );

            const unassignedOfficers = Array.from(officersById.values())
                .filter((officer) => officer.status?.toLowerCase() !== 'inactive')
                .filter((officer) => !currentTeamMemberIds.has(officer.id) && !assignedToOtherTeams.has(officer.id))
                .map((officer) => ({ ...officer, teamId: null }))
                .sort(sortByNameAsc);

            setFieldOfficers(unassignedOfficers);
            setModalError(null);
        } catch (error) {
            console.error('Error fetching field officers:', error);
            setFieldOfficers([]);
            setModalError(error instanceof Error ? error.message : 'Error fetching field officers');
        }
    }, [teams, token]);

    useEffect(() => {
        if (token) {
            fetchTeams();
            fetchCities();
        }
    }, [fetchTeams, fetchCities, token]);

    const openTeamPanel = async (team: Team, section: TeamPanelSection = 'overview') => {
        const primaryManager = getPrimaryTeamManager(team);
        setPanelTeamId(team.id);
        setSelectedTeamId(team.id);
        setSelectedOfficeManagerId(primaryManager?.id ?? null);
        setTeamPanelSection(section);
        setAssignedCities(getTeamAssignedCities(team));
        setSelectedCities([]);
        setSelectedFieldOfficers([]);
        setModalError(null);

        const currentManagerIds = getTeamManagers(team).map((m) => m.id);
        setSelectedManagerIds(currentManagerIds);

        setIsTeamPanelOpen(true);
        void fetchOfficeManagers(team.id);
        void fetchFieldOfficers(getTeamAssignedCities(team), team.id);
    };

    const closeTeamPanel = () => {
        setIsTeamPanelOpen(false);
        setPanelTeamId(null);
        setSelectedTeamId(null);
        setSelectedOfficeManagerId(null);
        setModalError(null);
    };

    const handleDeleteTeam = async () => {
        if (!deleteTeamId || !token) return;

        setIsSaving(true);
        setError(null);
        try {
            const response = await fetch(`https://api.gajkesaristeels.in/employee/team/delete?id=${deleteTeamId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                const errorText = await response.text().catch(() => 'Failed to delete team');
                throw new Error(errorText || 'Failed to delete team');
            }

            await fetchTeams();
            setIsDeleteModalVisible(false);
            setDeleteTeamId(null);
            closeTeamPanel();
        } catch (error) {
            console.error('Error deleting team:', error);
            const message = error instanceof Error ? error.message : 'Error deleting team';
            setError(message);
        } finally {
            setIsSaving(false);
        }
    };

    const confirmRemoveCity = async (cityOverride?: string) => {
        const targetCity = cityOverride ?? cityToRemove;
        if (!targetCity || !selectedOfficeManagerId || !token) return;

        setIsSaving(true);
        setModalError(null);
        try {
            const response = await fetch(
                `https://api.gajkesaristeels.in/employee/removeAssignedCity?employeeId=${selectedOfficeManagerId}&city=${encodeURIComponent(targetCity.toLowerCase())}`,
                {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                }
            );

            if (!response.ok) {
                const errorText = await response.text().catch(() => 'Failed to remove city');
                throw new Error(errorText || 'Failed to remove city');
            }

            setAssignedCities(prev => prev.filter(c => normalizeCityKey(c) !== normalizeCityKey(targetCity)));
            await fetchTeams();
            setIsCityRemoveModalVisible(false);
            setCityToRemove(null);
            setModalError(null);
        } catch (error) {
            console.error('Error removing city:', error);
            const message = error instanceof Error ? error.message : 'Error removing city';
            setModalError(message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleAddFieldOfficer = async () => {
        if (!selectedTeamId || selectedFieldOfficers.length === 0 || !token) return;
        const unassignedSelectedFieldOfficers = selectedFieldOfficers.filter((id) =>
            fieldOfficers.some((officer) => officer.id === id && officer.teamId == null)
        );
        if (unassignedSelectedFieldOfficers.length === 0) return;

        setIsSaving(true);
        setModalError(null);
        try {
            const response = await fetch(
                `https://api.gajkesaristeels.in/employee/team/addFieldOfficer?id=${selectedTeamId}`,
                {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        fieldOfficers: unassignedSelectedFieldOfficers,
                    }),
                }
            );

            if (!response.ok) {
                const errorText = await response.text().catch(() => 'Failed to add field officers');
                throw new Error(errorText || 'Failed to add field officers');
            }

            await fetchTeams();
            setIsEditModalVisible(false);
            setFieldOfficers((current) => current.filter((officer) => !unassignedSelectedFieldOfficers.includes(officer.id)));
            setSelectedFieldOfficers([]);
            setModalError(null);
        } catch (error) {
            console.error('Error adding field officer:', error);
            const message = error instanceof Error ? error.message : 'Error adding field officers';
            setModalError(message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleRemoveFieldOfficer = async (teamId: number, fieldOfficerId: number) => {
        if (!token) return false;

        const removedOfficer = teams
            .find((team) => team.id === teamId)
            ?.fieldOfficers.find((officer) => officer.id === fieldOfficerId);

        setIsSaving(true);
        setModalError(null);
        try {
            const response = await fetch(`https://api.gajkesaristeels.in/employee/team/deleteFieldOfficer?id=${teamId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    fieldOfficers: [fieldOfficerId],
                }),
            });

            if (!response.ok) {
                const errorText = await response.text().catch(() => 'Failed to remove field officer');
                throw new Error(errorText || 'Failed to remove field officer');
            }

            setTeams((current) => current.map((team) => (
                team.id === teamId
                    ? { ...team, fieldOfficers: team.fieldOfficers.filter((officer) => officer.id !== fieldOfficerId) }
                    : team
            )));
            if (removedOfficer) {
                setFieldOfficers((current) => {
                    const eligibleOfficer = { ...removedOfficer, teamId: null };
                    const byId = new Map(current.map((officer) => [officer.id, officer]));
                    byId.set(eligibleOfficer.id, eligibleOfficer);
                    return Array.from(byId.values()).sort(sortByNameAsc);
                });
            }
            void fetchTeams();
            return true;
        } catch (error) {
            console.error('Error removing field officer:', error);
            const message = error instanceof Error ? error.message : 'Error removing field officer';
            setModalError(message);
            return false;
        } finally {
            setIsSaving(false);
        }
    };

    const showRemoveOfficerModal = (teamId: number, officer: FieldOfficer) => {
        const name = `${officer.firstName} ${officer.lastName}`.trim();
        setOfficerToRemove({ teamId, officerId: officer.id, name });
        setIsRemoveOfficerModalVisible(true);
    };

    const confirmRemoveFieldOfficer = async () => {
        if (!officerToRemove) return;
        const removed = await handleRemoveFieldOfficer(officerToRemove.teamId, officerToRemove.officerId);
        if (removed) {
            setIsRemoveOfficerModalVisible(false);
            setOfficerToRemove(null);
        }
    };

    const toSentenceCase = (value: string | null | undefined) => {
        if (!value) return '';
        return value
            .toLowerCase()
            .split(' ')
            .filter(Boolean)
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    };

    const handleAssignCity = async () => {
        if (selectedCities.length === 0 || !selectedOfficeManagerId || !token) return;

        setIsSaving(true);
        setModalError(null);
        try {
            const promises = selectedCities.map(city =>
                fetch(
                    `https://api.gajkesaristeels.in/employee/assignCityToOfficeManager?employeeId=${selectedOfficeManagerId}&city=${encodeURIComponent(city)}`,
                    {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json',
                        },
                    }
                )
            );

            const responses = await Promise.all(promises);
            const failed = responses.filter(r => !r.ok);

            if (failed.length > 0) {
                throw new Error(`Failed to assign ${failed.length} of ${selectedCities.length} cities`);
            }

            setAssignedCities(prev => Array.from(new Set([...prev, ...selectedCities])));
            await fetchTeams();
            setSelectedCities([]);
            setIsCityPopoverOpen(false);
            setCitySearchTerm("");
            setModalError(null);
        } catch (error) {
            console.error('Error assigning city:', error);
            const message = error instanceof Error ? error.message : 'Error assigning city';
            setModalError(message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveManagers = async () => {
        if (!selectedTeamId || !token) return;

        setIsSaving(true);
        setModalError(null);
        try {
            const response = await fetch(
                `https://api.gajkesaristeels.in/employee/team/updateOfficeManagers?teamId=${selectedTeamId}`,
                {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        officeManagerIds: selectedManagerIds,
                    }),
                }
            );

            if (!response.ok) {
                const errorText = await response.text().catch(() => 'Failed to update regional managers');
                throw new Error(errorText || 'Failed to update regional managers');
            }

            await fetchTeams();
            setSelectedOfficeManagerId(selectedManagerIds[0] ?? null);
            setModalError(null);
        } catch (error) {
            console.error('Error updating regional managers:', error);
            const message = error instanceof Error ? error.message : 'Failed to update regional managers';
            setModalError(message);
        } finally {
            setIsSaving(false);
        }
    };

    const panelTeam = useMemo(
        () => teams.find((team) => team.id === panelTeamId) ?? null,
        [teams, panelTeamId]
    );

    const filteredOfficeManagers = useMemo(() => {
        const query = managerSearchTerm.trim().toLowerCase();
        if (!query) return allOfficeManagers;
        return allOfficeManagers.filter((manager) =>
            getManagerName(manager).toLowerCase().includes(query)
        );
    }, [allOfficeManagers, managerSearchTerm]);

    const managerFilterOptions = useMemo(() => {
        const managersById = new Map<number, TeamManager>();
        teams.forEach((team) => {
            getTeamManagers(team).forEach((manager) => managersById.set(manager.id, manager));
        });
        const managers = Array.from(managersById.values());
        const nameCounts = managers.reduce((counts, manager) => {
            const name = getManagerName(manager);
            counts.set(name, (counts.get(name) ?? 0) + 1);
            return counts;
        }, new Map<string, number>());

        return managers
            .map((manager) => {
                const name = getManagerName(manager);
                return {
                    value: String(manager.id),
                    label: (nameCounts.get(name) ?? 0) > 1 ? `${name} · #${manager.id}` : name,
                };
            })
            .sort((left, right) => left.label.localeCompare(right.label));
    }, [teams]);

    const cityFilterOptions = useMemo(
        () => buildCityOptions(teams.flatMap((team) => getTeamAssignedCities(team)))
            .map((option) => ({ ...option, label: toSentenceCase(option.label) }))
            .sort((left, right) => left.label.localeCompare(right.label, undefined, { sensitivity: 'base' })),
        [teams]
    );

    const fieldOfficerFilterOptions = useMemo(() => {
        const officersById = new Map<number, FieldOfficer>();
        teams.forEach((team) => {
            team.fieldOfficers.forEach((officer) => officersById.set(officer.id, officer));
        });
        return Array.from(officersById.values())
            .map((officer) => ({
                value: String(officer.id),
                label: `${officer.firstName} ${officer.lastName}`.trim() || `Field Officer ${officer.id}`,
            }))
            .sort((left, right) => left.label.localeCompare(right.label));
    }, [teams]);

    const filteredTeams = useMemo(() => {
        const normalizedCityFilter = normalizeCityKey(cityFilter);
        const normalizedSearchQuery = teamSearchQuery.trim().toLowerCase();
        return teams.filter((team) => {
            const matchesManager = !managerFilterId || getTeamManagers(team).some(
                (manager) => String(manager.id) === managerFilterId
            );
            const matchesCity = !normalizedCityFilter || getTeamAssignedCities(team).some(
                (city) => normalizeCityKey(city) === normalizedCityFilter
            );
            const matchesFieldOfficer = !fieldOfficerFilterId || team.fieldOfficers.some(
                (officer) => String(officer.id) === fieldOfficerFilterId
            );
            const searchableTeamText = [
                String(team.id),
                ...getTeamManagers(team).map((manager) => getManagerName(manager)),
                ...getTeamAssignedCities(team),
                ...team.fieldOfficers.map((officer) => `${officer.firstName} ${officer.lastName}`),
            ].join(" ").toLowerCase();
            const matchesSearch = !normalizedSearchQuery || searchableTeamText.includes(normalizedSearchQuery);
            return matchesManager && matchesCity && matchesFieldOfficer && matchesSearch;
        });
    }, [cityFilter, fieldOfficerFilterId, managerFilterId, teamSearchQuery, teams]);

    const activeTeamFilterCount = [managerFilterId, cityFilter, fieldOfficerFilterId].filter(Boolean).length;

    const clearTeamFilters = () => {
        setManagerFilterId("");
        setCityFilter("");
        setFieldOfficerFilterId("");
    };

    const getInitials = (firstName: string | null, lastName: string | null) => {
        return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
    };

    return (
        <div>
            <Card className="gap-0 border-border/70 py-0 shadow-sm">
                <CardContent className="space-y-4 p-4">
                    <div className="rounded-lg border border-border/70 bg-muted/20 p-3">
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(190px,1.25fr)_repeat(3,minmax(150px,1fr))_auto] lg:items-end">
                            <div className="space-y-1.5">
                                <Label htmlFor="team-search" className="text-xs">Search</Label>
                                <div className="relative min-w-0">
                                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                    <Input
                                        id="team-search"
                                        type="text"
                                        value={teamSearchQuery}
                                        onChange={(event) => setTeamSearchQuery(event.target.value)}
                                        placeholder="Search teams..."
                                        className="h-9 pl-9 pr-9 text-sm shadow-none"
                                        disabled={isLoading || !isDataAvailable}
                                    />
                                    {teamSearchQuery && (
                                        <button
                                            type="button"
                                            onClick={() => setTeamSearchQuery("")}
                                            className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                                            aria-label="Clear team search"
                                        >
                                            <X className="h-4 w-4" />
                                        </button>
                                    )}
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="team-manager-filter" className="text-xs">Regional manager</Label>
                                <SearchableSelect
                                    options={managerFilterOptions}
                                    value={managerFilterId || undefined}
                                    onSelect={(option) => setManagerFilterId(option?.value || "")}
                                    placeholder="All regional managers"
                                    searchPlaceholder="Search regional managers..."
                                    emptyMessage="No regional managers available"
                                    allowClear
                                    triggerClassName="w-full"
                                    contentClassName="w-[var(--radix-popover-trigger-width)]"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="team-city-filter" className="text-xs">City</Label>
                                <SearchableSelect
                                    options={cityFilterOptions}
                                    value={cityFilter || undefined}
                                    onSelect={(option) => setCityFilter(option?.value || "")}
                                    placeholder="All cities"
                                    searchPlaceholder="Search cities..."
                                    emptyMessage="No cities available"
                                    allowClear
                                    triggerClassName="w-full"
                                    contentClassName="w-[var(--radix-popover-trigger-width)]"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="team-field-officer-filter" className="text-xs">Field officer</Label>
                                <SearchableSelect
                                    options={fieldOfficerFilterOptions}
                                    value={fieldOfficerFilterId || undefined}
                                    onSelect={(option) => setFieldOfficerFilterId(option?.value || "")}
                                    placeholder="All field officers"
                                    searchPlaceholder="Search field officers..."
                                    emptyMessage="No field officers available"
                                    allowClear
                                    triggerClassName="w-full"
                                    contentClassName="w-[var(--radix-popover-trigger-width)]"
                                />
                            </div>
                            {!isLoading && (
                                <div className="flex h-9 items-center justify-between gap-2 sm:col-span-2 lg:col-span-1 lg:justify-end">
                                    <AddTeam onCreated={fetchTeams} />
                                    {isDataAvailable && activeTeamFilterCount > 0 && (
                                        <Button type="button" variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={clearTeamFilters}>
                                            Clear ({activeTeamFilterCount})
                                        </Button>
                                    )}
                                    {isDataAvailable && (
                                        <span className="whitespace-nowrap text-xs text-muted-foreground">
                                            {filteredTeams.length} of {teams.length}
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {isLoading && (
                        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                            {Array.from({ length: 6 }, (_, index) => (
                                <Skeleton key={index} className="h-60 rounded-xl" />
                            ))}
                        </div>
                    )}

                    {error && (
                        <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <p>{error}</p>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        setError(null);
                                        fetchTeams();
                                    }}
                                >
                                    Try Again
                                </Button>
                            </div>
                        </div>
                    )}

                    {!isLoading && !error && (
                        <>
                            {isDataAvailable ? (
                                <>
                                    {filteredTeams.length > 0 ? (
                                    <div className="space-y-3">
                                    {filteredTeams.map((team) => {
                                        const managers = getTeamManagers(team).sort(sortByNameAsc);
                                        const assignedTeamCities = getTeamAssignedCities(team);
                                        const visibleCities = assignedTeamCities.slice(0, 2);
                                        const remainingCityCount = assignedTeamCities.length - visibleCities.length;
                                        const visibleOfficerRoster = team.fieldOfficers.slice(0, 6);
                                        const remainingOfficerCount = team.fieldOfficers.length - visibleOfficerRoster.length;

                                        return (
                                            <Card key={team.id} className="gap-0 overflow-hidden border-border/70 py-0 shadow-sm transition-all hover:border-border hover:shadow-md">
                                                <CardContent className="p-3">
                                                    <div className="grid min-h-[132px] gap-3 lg:grid-cols-[minmax(260px,1.1fr)_minmax(145px,0.7fr)_minmax(330px,1.5fr)_140px]">
                                                        <div className="min-w-0 px-2 py-2">
                                                            <div className="mb-2 flex items-center justify-between gap-2">
                                                                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Team #{team.id}</p>
                                                                <span className="text-[10px] text-muted-foreground">
                                                                    {managers.length} regional manager{managers.length === 1 ? '' : 's'}
                                                                </span>
                                                            </div>
                                                            {managers.length > 0 ? (
                                                                <div className="space-y-1.5">
                                                                    {managers.slice(0, 2).map((manager) => (
                                                                        <button
                                                                            key={manager.id}
                                                                            type="button"
                                                                            className="flex w-full min-w-0 items-center rounded-lg border border-transparent px-1.5 py-1 text-left transition-colors hover:border-border/70 hover:bg-muted/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                                                            onClick={() => void openTeamPanel(team, 'managers')}
                                                                            title={`${getManagerName(manager)} · Regional Manager`}
                                                                        >
                                                                            <span className="mr-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
                                                                                {getInitials(manager.firstName ?? null, manager.lastName ?? null) || '?'}
                                                                            </span>
                                                                            <span className="min-w-0">
                                                                                <span className="block truncate text-xs font-semibold text-foreground">{getManagerName(manager)}</span>
                                                                                <span className="block text-[10px] text-muted-foreground">Regional Manager</span>
                                                                            </span>
                                                                        </button>
                                                                    ))}
                                                                    {managers.length > 2 && (
                                                                        <button type="button" className="pl-1.5 text-[10px] font-medium text-primary hover:underline" onClick={() => void openTeamPanel(team, 'managers')}>
                                                                            +{managers.length - 2} more regional managers
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            ) : (
                                                                <button type="button" className="flex w-full items-center rounded-lg border border-dashed px-3 py-3 text-xs text-muted-foreground hover:bg-muted/35" onClick={() => void openTeamPanel(team, 'managers')}>
                                                                    No regional manager assigned
                                                                </button>
                                                            )}
                                                        </div>

                                                        <div className="rounded-lg bg-muted/25 p-3">
                                                            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Coverage</p>
                                                            <div className="flex flex-wrap gap-1.5">
                                                                {visibleCities.map((city) => (
                                                                    <Badge key={city} variant="secondary" className="flex items-center text-[11px] font-normal">
                                                                        <Building2 size={12} className="mr-1 text-foreground" />
                                                                        {toSentenceCase(city)}
                                                                    </Badge>
                                                                ))}
                                                                {remainingCityCount > 0 && (
                                                                    <Button
                                                                        type="button"
                                                                        variant="outline"
                                                                        size="sm"
                                                                        className="h-6 rounded-full px-2 text-[11px] font-normal"
                                                                        onClick={() => void openTeamPanel(team, 'cities')}
                                                                        aria-label={`View all ${assignedTeamCities.length} cities for Team ${team.id}`}
                                                                    >
                                                                        +{remainingCityCount} more
                                                                    </Button>
                                                                )}
                                                                {assignedTeamCities.length === 0 && (
                                                                    <span className="text-xs text-muted-foreground">No cities assigned</span>
                                                                )}
                                                            </div>
                                                        </div>

                                                        <div className="rounded-lg bg-muted/25 p-3">
                                                            <div className="mb-2 flex items-center justify-between gap-2">
                                                                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Roster</p>
                                                                <span className="text-[10px] text-muted-foreground">
                                                                    {team.fieldOfficers.length} officer{team.fieldOfficers.length === 1 ? '' : 's'}
                                                                </span>
                                                            </div>
                                                            <div className="flex flex-wrap gap-1.5">
                                                                {visibleOfficerRoster.map((officer) => (
                                                                    <Badge key={officer.id} variant="outline" className="text-[11px] font-normal bg-background">
                                                                        {officer.firstName} {officer.lastName}
                                                                    </Badge>
                                                                ))}
                                                                {remainingOfficerCount > 0 && (
                                                                    <Button
                                                                        type="button"
                                                                        variant="outline"
                                                                        size="sm"
                                                                        className="h-6 rounded-full px-2 text-[11px] font-normal"
                                                                        onClick={() => void openTeamPanel(team, 'officers')}
                                                                        aria-label={`View all ${team.fieldOfficers.length} field officers for Team ${team.id}`}
                                                                    >
                                                                        +{remainingOfficerCount} more
                                                                    </Button>
                                                                )}
                                                                {team.fieldOfficers.length === 0 && (
                                                                    <span className="text-xs text-muted-foreground">No field officers</span>
                                                                )}
                                                            </div>
                                                        </div>

                                                        <div className="flex flex-row items-center justify-end gap-2 border-t pt-2 lg:flex-col lg:items-end lg:justify-between lg:border-l lg:border-t-0 lg:pl-3 lg:pt-0">
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                size="sm"
                                                                className="h-8 text-xs font-normal"
                                                                onClick={() => void openTeamPanel(team, 'overview')}
                                                            >
                                                                Manage Team
                                                            </Button>
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="sm"
                                                                className="h-8 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
                                                                onClick={() => {
                                                                    setDeleteTeamId(team.id);
                                                                    setIsDeleteModalVisible(true);
                                                                }}
                                                            >
                                                                <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                                                                Delete
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        );
                                    })}
                                    </div>
                                    ) : (
                                        <div className="rounded-xl border border-dashed py-12 text-center text-sm text-muted-foreground">
                                            No teams match your selected filters.
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="py-12 text-center text-sm text-muted-foreground">
                                    No teams found in system.
                                </div>
                            )}
                        </>
                    )}
                </CardContent>
            </Card>

            {/* Slide-over Team Management Sheet */}
            <Sheet open={isTeamPanelOpen} onOpenChange={setIsTeamPanelOpen}>
                <SheetContent className="w-full sm:max-w-md">
                    {panelTeam && (
                        <div className="flex h-full flex-col">
                            <SheetHeader>
                                <SheetTitle className="text-lg">Team #{panelTeam.id}</SheetTitle>
                                <SheetDescription className="text-xs">
                                    Manage regional managers, assigned cities, and field officer roster
                                </SheetDescription>
                            </SheetHeader>

                            <div className="mt-4 flex gap-1 border-b pb-2">
                                <Button
                                    variant={teamPanelSection === 'overview' ? 'default' : 'ghost'}
                                    size="sm"
                                    className="h-8 text-xs"
                                    onClick={() => setTeamPanelSection('overview')}
                                >
                                    Overview
                                </Button>
                                <Button
                                    variant={teamPanelSection === 'managers' ? 'default' : 'ghost'}
                                    size="sm"
                                    className="h-8 text-xs"
                                    onClick={() => setTeamPanelSection('managers')}
                                >
                                    Managers ({getTeamManagers(panelTeam).length})
                                </Button>
                                <Button
                                    variant={teamPanelSection === 'cities' ? 'default' : 'ghost'}
                                    size="sm"
                                    className="h-8 text-xs"
                                    onClick={() => setTeamPanelSection('cities')}
                                >
                                    Cities ({assignedCities.length})
                                </Button>
                                <Button
                                    variant={teamPanelSection === 'officers' ? 'default' : 'ghost'}
                                    size="sm"
                                    className="h-8 text-xs"
                                    onClick={() => setTeamPanelSection('officers')}
                                >
                                    Officers ({panelTeam.fieldOfficers.length})
                                </Button>
                            </div>

                            <ScrollArea className="flex-1 py-4">
                                {modalError && (
                                    <div className="mb-4 rounded-md border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive">
                                        {modalError}
                                    </div>
                                )}

                                {teamPanelSection === 'overview' && (
                                    <div className="space-y-4">
                                        <div className="rounded-lg border p-3">
                                            <p className="text-xs font-semibold text-foreground mb-2">Regional Managers</p>
                                            <div className="space-y-2">
                                                {getTeamManagers(panelTeam).map((manager) => (
                                                    <div key={manager.id} className="flex items-center gap-2 text-xs">
                                                        <User className="h-3.5 w-3.5 text-muted-foreground" />
                                                        <span className="font-medium">{getManagerName(manager)}</span>
                                                    </div>
                                                ))}
                                                {getTeamManagers(panelTeam).length === 0 && (
                                                    <p className="text-xs text-muted-foreground">No manager assigned</p>
                                                )}
                                            </div>
                                        </div>

                                        <div className="rounded-lg border p-3">
                                            <p className="text-xs font-semibold text-foreground mb-2">Assigned Cities ({assignedCities.length})</p>
                                            <div className="flex flex-wrap gap-1.5">
                                                {assignedCities.map((city) => (
                                                    <Badge key={city} variant="secondary" className="text-xs">
                                                        <Building2 className="mr-1 h-3 w-3" />
                                                        {toSentenceCase(city)}
                                                    </Badge>
                                                ))}
                                                {assignedCities.length === 0 && (
                                                    <p className="text-xs text-muted-foreground">No cities assigned</p>
                                                )}
                                            </div>
                                        </div>

                                        <div className="rounded-lg border p-3">
                                            <p className="text-xs font-semibold text-foreground mb-2">Field Officers ({panelTeam.fieldOfficers.length})</p>
                                            <div className="space-y-1.5">
                                                {panelTeam.fieldOfficers.map((officer) => (
                                                    <div key={officer.id} className="flex items-center justify-between text-xs py-1 border-b last:border-0">
                                                        <span>{officer.firstName} {officer.lastName}</span>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-6 w-6 p-0 text-destructive"
                                                            onClick={() => showRemoveOfficerModal(panelTeam.id, officer)}
                                                        >
                                                            <X className="h-3.5 w-3.5" />
                                                        </Button>
                                                    </div>
                                                ))}
                                                {panelTeam.fieldOfficers.length === 0 && (
                                                    <p className="text-xs text-muted-foreground">No field officers</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {teamPanelSection === 'managers' && (
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <Label className="text-xs font-medium">Select Regional Managers</Label>
                                            <div className="max-h-60 overflow-y-auto rounded-lg border p-2 space-y-1">
                                                {filteredOfficeManagers.map((manager) => {
                                                    const isChecked = selectedManagerIds.includes(manager.id);
                                                    return (
                                                        <label key={manager.id} className="flex items-center gap-2 rounded p-2 text-xs hover:bg-muted/50 cursor-pointer">
                                                            <Checkbox
                                                                checked={isChecked}
                                                                onCheckedChange={(checked) => {
                                                                    setSelectedManagerIds((prev) =>
                                                                        checked
                                                                            ? [...prev, manager.id]
                                                                            : prev.filter((id) => id !== manager.id)
                                                                    );
                                                                }}
                                                            />
                                                            <span>{getManagerName(manager)}</span>
                                                        </label>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                        <Button
                                            size="sm"
                                            className="w-full h-9"
                                            onClick={handleSaveManagers}
                                            disabled={isSaving}
                                        >
                                            {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                            Save Regional Managers
                                        </Button>
                                    </div>
                                )}

                                {teamPanelSection === 'cities' && (
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <Label className="text-xs font-medium">Existing Cities</Label>
                                            <div className="flex flex-wrap gap-1.5">
                                                {assignedCities.map((city) => (
                                                    <Badge key={city} variant="secondary" className="text-xs gap-1">
                                                        {toSentenceCase(city)}
                                                        <X
                                                            className="h-3 w-3 cursor-pointer hover:text-destructive"
                                                            onClick={() => confirmRemoveCity(city)}
                                                        />
                                                    </Badge>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <Label className="text-xs font-medium">Assign New City</Label>
                                            <Input
                                                placeholder="Enter city name..."
                                                value={selectedCities[0] || ''}
                                                onChange={(e) => setSelectedCities(e.target.value ? [e.target.value] : [])}
                                                className="h-9 text-xs"
                                            />
                                            <Button
                                                size="sm"
                                                className="w-full h-9"
                                                onClick={handleAssignCity}
                                                disabled={isSaving || selectedCities.length === 0}
                                            >
                                                {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                                Assign City
                                            </Button>
                                        </div>
                                    </div>
                                )}

                                {teamPanelSection === 'officers' && (
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <Label className="text-xs font-medium">Available Field Officers</Label>
                                            <div className="max-h-60 overflow-y-auto rounded-lg border p-2 space-y-1">
                                                {fieldOfficers.map((officer) => {
                                                    const isChecked = selectedFieldOfficers.includes(officer.id);
                                                    return (
                                                        <label key={officer.id} className="flex items-center gap-2 rounded p-2 text-xs hover:bg-muted/50 cursor-pointer">
                                                            <Checkbox
                                                                checked={isChecked}
                                                                onCheckedChange={(checked) => {
                                                                    setSelectedFieldOfficers((prev) =>
                                                                        checked
                                                                            ? [...prev, officer.id]
                                                                            : prev.filter((id) => id !== officer.id)
                                                                    );
                                                                }}
                                                            />
                                                            <span>{officer.firstName} {officer.lastName}</span>
                                                        </label>
                                                    );
                                                })}
                                                {fieldOfficers.length === 0 && (
                                                    <p className="p-3 text-xs text-muted-foreground text-center">No available officers</p>
                                                )}
                                            </div>
                                        </div>
                                        <Button
                                            size="sm"
                                            className="w-full h-9"
                                            onClick={handleAddFieldOfficer}
                                            disabled={isSaving || selectedFieldOfficers.length === 0}
                                        >
                                            {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                            Add Selected Officers
                                        </Button>
                                    </div>
                                )}
                            </ScrollArea>
                        </div>
                    )}
                </SheetContent>
            </Sheet>

            {/* Delete Team Dialog */}
            <Dialog open={isDeleteModalVisible} onOpenChange={setIsDeleteModalVisible}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Team</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete Team #{deleteTeamId}? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setIsDeleteModalVisible(false)} disabled={isSaving}>
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={handleDeleteTeam} disabled={isSaving}>
                            {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                            Delete Team
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Remove Officer Dialog */}
            <Dialog open={isRemoveOfficerModalVisible} onOpenChange={setIsRemoveOfficerModalVisible}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Remove Field Officer</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to remove {officerToRemove?.name} from Team #{officerToRemove?.teamId}?
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setIsRemoveOfficerModalVisible(false)} disabled={isSaving}>
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={confirmRemoveFieldOfficer} disabled={isSaving}>
                            {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                            Remove Officer
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default Teams;
