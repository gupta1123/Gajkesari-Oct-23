"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Badge } from "@/components/ui/badge";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
    UserPlus, 
    ChevronLeft, 
    ChevronRight, 
    MapPin, 
    X, 
    Trash2, 
    Users, 
    User, 
    Building2,
    Loader2,
    Plus
} from 'lucide-react';

interface Team {
    id: number;
    officeManager: {
        id: number;
        firstName: string | null;
        lastName: string | null;
        assignedCity: string[];
    };
    fieldOfficers: FieldOfficer[];
}

interface FieldOfficer {
    id: number;
    firstName: string;
    lastName: string;
    role: string;
    status: string;
}

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
    const [availableCities, setAvailableCities] = useState<string[]>([]);
    const [selectedCities, setSelectedCities] = useState<string[]>([]);
    const [newCity, setNewCity] = useState<string>('');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isViewAllModalVisible, setIsViewAllModalVisible] = useState<boolean>(false);
    const [viewAllTeamId, setViewAllTeamId] = useState<number | null>(null);
    const [officersSearch, setOfficersSearch] = useState<string>('');
    const [isRemoveOfficerModalVisible, setIsRemoveOfficerModalVisible] = useState<boolean>(false);
    const [officerToRemove, setOfficerToRemove] = useState<{ teamId: number; officerId: number; name: string } | null>(null);

    // Get auth data from localStorage instead of props
    const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;

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
            const sortByNameAsc = (a: { firstName?: string | null; lastName?: string | null }, b: { firstName?: string | null; lastName?: string | null }) => {
                const nameA = `${a.firstName ?? ''} ${a.lastName ?? ''}`.trim().toLowerCase();
                const nameB = `${b.firstName ?? ''} ${b.lastName ?? ''}`.trim().toLowerCase();
                return nameA.localeCompare(nameB);
            };

            // Ensure both teams and their officers are sorted by name ASC
            const sortedTeams: Team[] = (data as Team[])
                .map((team) => ({
                    ...team,
                    fieldOfficers: [...team.fieldOfficers].sort((a, b) => sortByNameAsc(a, b)),
                }))
                .sort((a, b) => sortByNameAsc(a.officeManager, b.officeManager));

            setTeams(sortedTeams);
            setIsDataAvailable(sortedTeams.length > 0);
        } catch (error) {
            setError(error instanceof Error ? error.message : 'An unknown error occurred');
            setIsDataAvailable(false);
        } finally {
            setIsLoading(false);
        }
    }, [token]);

    const fetchCities = async () => {
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
            const sortedCities = data.sort((a: string, b: string) => a.localeCompare(b));
            setAvailableCities(sortedCities);
        } catch (error) {
            console.error('Error fetching cities:', error);
        }
    };

    const fetchFieldOfficersByCities = async (cities: string[], officeManagerId: number) => {
        if (!token) return;

        try {
            const promises = cities.map(city =>
                fetch(`https://api.gajkesaristeels.in/employee/getFieldOfficerByCity?city=${city}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                    },
                })
            );
            const responses = await Promise.all(promises);
            const allData = await Promise.all(responses.map(r => r.json()));
            const allFieldOfficers: FieldOfficer[] = allData.flat().sort((a: FieldOfficer, b: FieldOfficer) => {
                const nameA = `${a.firstName} ${a.lastName}`.toLowerCase();
                const nameB = `${b.firstName} ${b.lastName}`.toLowerCase();
                return nameA.localeCompare(nameB);
            });
            const currentTeam = teams.find(team => team.officeManager.id === officeManagerId);
            const currentTeamMemberIds = currentTeam ? currentTeam.fieldOfficers.map(officer => officer.id) : [];
            const availableFieldOfficers = allFieldOfficers.filter((officer: FieldOfficer) => !currentTeamMemberIds.includes(officer.id));
            setFieldOfficers(availableFieldOfficers);
        } catch (error) {
            console.error('Error fetching field officers:', error);
        }
    };

    useEffect(() => {
        if (token) {
            fetchTeams();
        }
    }, [fetchTeams]);

    const showDeleteModal = (teamId: number) => {
        setDeleteTeamId(teamId);
        setIsDeleteModalVisible(true);
    };

    const handleDeleteTeam = async () => {
        if (!deleteTeamId || !token) return;

        setIsSaving(true);
        try {
            const response = await fetch(`https://api.gajkesaristeels.in/employee/team/delete?id=${deleteTeamId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                throw new Error('Failed to delete team');
            }

            await fetchTeams();
            setIsDeleteModalVisible(false);
        } catch (error) {
            console.error('Error deleting team:', error);
            setError(error instanceof Error ? error.message : 'Error deleting team');
        } finally {
            setIsSaving(false);
        }
    };

    const showEditModal = (team: Team) => {
        setSelectedTeamId(team.id);
        setSelectedOfficeManagerId(team.officeManager.id);
        setAssignedCities(team.officeManager.assignedCity);
        fetchCities();
        fetchFieldOfficersByCities(team.officeManager.assignedCity, team.officeManager.id);
        setIsEditModalVisible(true);
    };

    const handleRemoveCity = (city: string) => {
        setCityToRemove(city);
        setIsCityRemoveModalVisible(true);
    };

    const confirmRemoveCity = async () => {
        if (!cityToRemove || !selectedOfficeManagerId || !token) return;

        setIsSaving(true);
        try {
            const response = await fetch(
                `https://api.gajkesaristeels.in/employee/removeCity?id=${selectedOfficeManagerId}&city=${cityToRemove}`,
                {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                }
            );

            if (!response.ok) {
                throw new Error('Failed to remove city');
            }

            setAssignedCities(prev => prev.filter(c => c !== cityToRemove));
            setIsCityRemoveModalVisible(false);
            setCityToRemove(null);
        } catch (error) {
            console.error('Error removing city:', error);
            setError(error instanceof Error ? error.message : 'Error removing city');
        } finally {
            setIsSaving(false);
        }
    };

    const handleAddFieldOfficer = async () => {
        if (!selectedTeamId || selectedFieldOfficers.length === 0 || !token) return;

        setIsSaving(true);
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
                        fieldOfficers: selectedFieldOfficers,
                    }),
                }
            );

            if (!response.ok) {
                throw new Error('Failed to add field officers');
            }

            await fetchTeams();
            setIsEditModalVisible(false);
            setSelectedFieldOfficers([]);
        } catch (error) {
            console.error('Error adding field officer:', error);
            setError(error instanceof Error ? error.message : 'Error adding field officers');
        } finally {
            setIsSaving(false);
        }
    };

    const handleRemoveFieldOfficer = async (teamId: number, fieldOfficerId: number) => {
        if (!token) return;

        setIsSaving(true);
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
                throw new Error('Failed to remove field officer');
            }

            await fetchTeams();
        } catch (error) {
            console.error('Error removing field officer:', error);
            setError(error instanceof Error ? error.message : 'Error removing field officer');
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
        await handleRemoveFieldOfficer(officerToRemove.teamId, officerToRemove.officerId);
        setIsRemoveOfficerModalVisible(false);
        setOfficerToRemove(null);
    };

    const handleAssignCity = async () => {
        if (!newCity || !selectedOfficeManagerId || !token) return;

        setIsSaving(true);
        try {
            const response = await fetch(
                `https://api.gajkesaristeels.in/employee/assignCity?id=${selectedOfficeManagerId}&city=${newCity}`,
                {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                }
            );

            if (!response.ok) {
                throw new Error('Failed to assign city');
            }

            await fetchFieldOfficersByCities([...assignedCities, newCity], selectedOfficeManagerId);
            setAssignedCities(prev => [...prev, newCity]);
            setNewCity('');
        } catch (error) {
            console.error('Error assigning city:', error);
            setError(error instanceof Error ? error.message : 'Error assigning city');
        } finally {
            setIsSaving(false);
        }
    };

    const handlePageChange = (teamId: number, newPage: number) => {
        setCurrentPage(prev => ({ ...prev, [teamId]: newPage }));
    };

    const getInitials = (firstName: string | null, lastName: string | null) => {
        return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
    };

    return (
        <div className="space-y-6">
            <Card className="border-0 shadow-sm">
                <CardHeader className="pb-4">
                    <CardTitle className="text-3xl md:text-xl font-semibold text-foreground">Team Management</CardTitle>
                    <p className="text-lg md:text-sm text-muted-foreground">Manage teams, assign cities, and add field officers to teams</p>
                </CardHeader>
                <CardContent className="space-y-6">
                    {isLoading && (
                        <div className="flex justify-center items-center py-12">
                            <div className="flex flex-col items-center gap-3">
                                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                                <p className="text-sm text-muted-foreground">Loading teams...</p>
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="p-4 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md">
                            <div className="flex items-center justify-between">
                                <p><strong>Error:</strong> {error}</p>
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
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {teams.map((team) => {
                                        const visibleOfficers = team.fieldOfficers.slice(0, 3);

                                        return (
                                            <Card key={team.id} className="overflow-hidden shadow-md hover:shadow-lg transition-shadow duration-300">
                                                <CardContent className="p-5 md:p-4">
                                                    <div className="flex justify-between items-start mb-4">
                                                        <div className="flex items-center">
                                                            <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center mr-3 text-base font-semibold">
                                                                {getInitials(team.officeManager?.firstName, team.officeManager?.lastName)}
                                                            </div>
                                                            <div>
                                                                <h3 className="text-base font-semibold text-foreground">
                                                                    {team.officeManager?.firstName ?? 'N/A'} {team.officeManager?.lastName ?? 'N/A'}
                                                                </h3>
                                                                <p className="text-sm text-muted-foreground">
                                                                    Regional Manager
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => showDeleteModal(team.id)}
                                                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                                        >
                                                            <Trash2 size={20} />
                                                        </Button>
                                                    </div>
                                                    
                                                    <div className="flex flex-wrap gap-2 mb-4">
                                                        {team.officeManager.assignedCity.map((city, index) => (
                                                            <Badge key={index} variant="secondary" className="flex items-center text-xs md:text-[11px]">
                                                                <Building2 size={12} className="mr-1 text-foreground" />
                                                                {city}
                                                            </Badge>
                                                        ))}
                                                    </div>
                                                    
                                                    <div className="space-y-3">
                                                        {visibleOfficers.map((officer) => (
                                                            <div key={officer.id} className="bg-muted/30 p-3 rounded-lg flex items-center justify-between group hover:bg-muted/50 transition-all duration-300">
                                                                <div className="flex items-center min-w-0">
                                                                    <User size={20} className="text-foreground mr-2 flex-shrink-0" />
                                                                    <div className="min-w-0 flex-grow">
                                                                        <p className="font-medium text-sm text-foreground truncate">
                                                                            {`${officer.firstName} ${officer.lastName}`}
                                                                        </p>
                                                                        <p className="text-xs text-muted-foreground truncate">
                                                                            {officer.role}
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-center">
                                                                    {officer.status === 'inactive' && (
                                                                        <Badge variant="destructive" className="mr-2 text-xs">
                                                                            Inactive
                                                                        </Badge>
                                                                    )}
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        onClick={() => showRemoveOfficerModal(team.id, officer)}
                                                                        className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-destructive hover:text-destructive hover:bg-destructive/10"
                                                                        disabled={isSaving}
                                                                    >
                                                                        <X size={16} />
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                        ))}
                                                        {team.fieldOfficers.length === 0 && (
                                                            <div className="text-xs text-muted-foreground bg-muted/20 border border-border/50 rounded-md p-3 text-center">
                                                                No field officers yet
                                                            </div>
                                                        )}
                                                        {team.fieldOfficers.length > 3 && (
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="w-full justify-center text-xs"
                                                                onClick={() => { setViewAllTeamId(team.id); setIsViewAllModalVisible(true); setOfficersSearch(''); }}
                                                            >
                                                                View all ({team.fieldOfficers.length})
                                                            </Button>
                                                        )}
                                                    </div>

                                                    <div className={`${team.fieldOfficers.length > 0 ? 'mt-4 pt-4 border-t' : 'mt-2'}`}> 
                                                        <Button
                                                            className="w-full h-10 text-sm font-medium"
                                                            onClick={() => showEditModal(team)}
                                                        >
                                                            <UserPlus size={18} className="mr-2" />
                                                            Add Field Officer
                                                        </Button>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="text-center py-10">
                                    <Users size={48} className="mx-auto text-foreground mb-4" />
                                    <p className="text-lg font-semibold text-foreground">No teams available</p>
                                    <p className="text-sm text-muted-foreground mt-2">Try refreshing the page or check back later.</p>
                                </div>
                            )}
                        </>
                    )}
                </CardContent>
            </Card>

            {/* Delete Team Modal */}
            <Dialog open={isDeleteModalVisible} onOpenChange={setIsDeleteModalVisible}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Team</DialogTitle>
                    </DialogHeader>
                    <p className="text-muted-foreground">Are you sure you want to delete this team? This action cannot be undone.</p>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDeleteModalVisible(false)}>
                            Cancel
                        </Button>
                        <Button 
                            variant="destructive" 
                            onClick={handleDeleteTeam}
                            disabled={isSaving}
                        >
                            {isSaving ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Deleting...
                                </>
                            ) : (
                                'Delete'
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Team Modal */}
            <Dialog open={isEditModalVisible} onOpenChange={setIsEditModalVisible}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>Add Field Officer</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <Label className="text-sm font-medium text-foreground">Assigned Cities</Label>
                            <div className="flex flex-wrap gap-2 mt-2">
                                {assignedCities.map((city, index) => (
                                    <Badge key={index} variant="secondary" className="flex items-center">
                                        <Building2 size={12} className="mr-1" />
                                        {city}
                                        <Button 
                                            size="sm" 
                                            variant="ghost" 
                                            onClick={() => handleRemoveCity(city)} 
                                            className="h-auto p-0 ml-1 text-muted-foreground hover:text-foreground"
                                        >
                                            <X size={12} />
                                        </Button>
                                    </Badge>
                                ))}
                            </div>
                        </div>
                        
                        <div className="space-y-2">
                            <Label htmlFor="newCity">Add New City</Label>
                            <div className="flex gap-2">
                                <Input
                                    id="newCity"
                                    value={newCity}
                                    onChange={(e) => setNewCity(e.target.value)}
                                    placeholder="Enter city name"
                                />
                                <Button onClick={handleAssignCity} disabled={!newCity || isSaving}>
                                    {isSaving ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <Plus className="h-4 w-4" />
                                    )}
                                </Button>
                            </div>
                        </div>
                        
                        <div>
                            <Label className="text-sm font-medium text-foreground">Available Field Officers</Label>
                            <div className="space-y-2 max-h-60 overflow-y-auto mt-2">
                                {fieldOfficers.map((officer) => (
                                    <div key={officer.id} className="flex items-center space-x-2">
                                        {officer.status === 'active' ? (
                                            <div className="flex items-center w-full">
                                                <Checkbox
                                                    id={`officer-${officer.id}`}
                                                    checked={selectedFieldOfficers.includes(officer.id)}
                                                    onCheckedChange={(checked) => {
                                                        setSelectedFieldOfficers(prev =>
                                                            checked
                                                                ? [...prev, officer.id]
                                                                : prev.filter(id => id !== officer.id)
                                                        );
                                                    }}
                                                />
                                                <Label htmlFor={`officer-${officer.id}`} className="ml-2 text-sm text-foreground">
                                                    {`${officer.firstName} ${officer.lastName} (${officer.role})`}
                                                </Label>
                                            </div>
                                        ) : (
                                            <div className="flex items-center w-full">
                                                <span className="text-sm text-muted-foreground">{`${officer.firstName} ${officer.lastName} (${officer.role})`}</span>
                                                <Badge variant="destructive" className="ml-2 text-xs">
                                                    Inactive
                                                </Badge>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsEditModalVisible(false)}>
                            Cancel
                        </Button>
                        <Button 
                            onClick={handleAddFieldOfficer} 
                            disabled={selectedFieldOfficers.length === 0 || isSaving}
                        >
                            {isSaving ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Adding...
                                </>
                            ) : (
                                'Add Selected Officers'
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* View All Officers Modal */}
            <Dialog open={isViewAllModalVisible} onOpenChange={setIsViewAllModalVisible}>
                <DialogContent className="sm:max-w-[560px]">
                    <DialogHeader>
                        <DialogTitle>Field Officers</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <Input
                            placeholder="Search field officers"
                            value={officersSearch}
                            onChange={(e) => setOfficersSearch(e.target.value)}
                        />
                        <ScrollArea className="h-80 pr-3">
                            <div className="space-y-2">
                                {(() => {
                                    const team = teams.find(t => t.id === viewAllTeamId);
                                    const list = team ? [...team.fieldOfficers].sort((a, b) => `${a.firstName} ${a.lastName}`.toLowerCase().localeCompare(`${b.firstName} ${b.lastName}`.toLowerCase())) : [];
                                    const filtered = list.filter(o =>
                                        `${o.firstName} ${o.lastName}`.toLowerCase().includes(officersSearch.toLowerCase())
                                    );
                                    return filtered.length === 0 ? (
                                        <div className="text-sm text-muted-foreground py-8 text-center">No field officers found</div>
                                    ) : (
                                        filtered.map((officer) => (
                                            <div key={officer.id} className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50">
                                                <div className="flex items-center min-w-0">
                                                    <User size={18} className="text-foreground mr-2 flex-shrink-0" />
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-medium text-foreground truncate">{`${officer.firstName} ${officer.lastName}`}</p>
                                                        <p className="text-xs text-muted-foreground truncate">{officer.role}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center">
                                                    {officer.status === 'inactive' && (
                                                        <Badge variant="destructive" className="mr-2 text-xs">Inactive</Badge>
                                                    )}
                                                    {team && (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                                            onClick={() => showRemoveOfficerModal(team.id, officer)}
                                                            disabled={isSaving}
                                                        >
                                                            <X size={14} />
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        ))
                                    );
                                })()}
                            </div>
                        </ScrollArea>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsViewAllModalVisible(false)}>Close</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Confirm Remove Field Officer Modal */}
            <Dialog open={isRemoveOfficerModalVisible} onOpenChange={setIsRemoveOfficerModalVisible}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Remove Field Officer</DialogTitle>
                    </DialogHeader>
                    <p className="text-muted-foreground">
                        Are you sure you want to remove{' '}
                        <span className="font-medium">{officerToRemove?.name}</span>{' '}
                        from this team? This will not delete the employee.
                    </p>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsRemoveOfficerModalVisible(false)}>
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={confirmRemoveFieldOfficer} disabled={isSaving}>
                            {isSaving ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Removing...
                                </>
                            ) : (
                                'Remove'
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Remove City Modal */}
            <Dialog open={isCityRemoveModalVisible} onOpenChange={setIsCityRemoveModalVisible}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Remove City</DialogTitle>
                    </DialogHeader>
                    <p className="text-muted-foreground">Are you sure you want to remove {cityToRemove} from this team?</p>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCityRemoveModalVisible(false)}>
                            Cancel
                        </Button>
                        <Button 
                            variant="destructive" 
                            onClick={confirmRemoveCity}
                            disabled={isSaving}
                        >
                            {isSaving ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Removing...
                                </>
                            ) : (
                                'Remove'
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default Teams;
