'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { CheckCircle, XCircle, Search, Filter, Calendar, User, Clock, Loader } from 'lucide-react';
import { useAuth } from '@/components/auth-provider';
import { isManagerRoleValue, normalizeRoleValue } from '@/lib/auth';
import { API, type TeamDataDto } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { motion, AnimatePresence } from 'framer-motion';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

interface ApprovalRequest {
    id: number;
    employeeId: number;
    employeeName: string;
    requestDate: string;
    requestedStatus: string;
    logDate: string;
    actionDate: string | null;
    status: string;
    isDuplicate?: boolean;
    duplicateCount?: number;
    duplicateIndex?: number;
}

const ApprovalsPage = () => {
    const { token, userData } = useAuth();
    const [requests, setRequests] = useState<ApprovalRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [approvalType, setApprovalType] = useState<{ [key: number]: 'full day' | 'half day' | null }>({});
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [sortBy, setSortBy] = useState<'date' | 'name' | 'status'>('date');
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    
    // State for role checking
    const [isManager, setIsManager] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);
    const [isFieldOfficer, setIsFieldOfficer] = useState(false);
    const [userRoleFromAPI, setUserRoleFromAPI] = useState<string | null>(null);
    const [teamId, setTeamId] = useState<number | null>(null);
    const [teamLoading, setTeamLoading] = useState(false);
    const [teamError, setTeamError] = useState<string | null>(null);

    // Fetch current user data to determine role
    useEffect(() => {
        const fetchCurrentUser = async () => {
            if (!token) return;
            
            try {
                const response = await fetch('https://api.gajkesaristeels.in/user/manage/current-user', {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                });
                
                if (response.ok) {
                    const userData = await response.json();
                    console.log('Current user data:', userData);
                    
                    // Extract role from authorities
                    const authorities = userData.authorities || [];
                    const role = authorities.length > 0 ? authorities[0].authority : null;
                    setUserRoleFromAPI(role);

                    const normalizedRole = normalizeRoleValue(role);
                    const managerFlag = isManagerRoleValue(role);
                    const adminFlag = normalizedRole === 'ROLE_ADMIN' || normalizedRole === 'ADMIN';
                    const fieldOfficerFlag = normalizedRole === 'ROLE_FIELD OFFICER' || normalizedRole === 'FIELD OFFICER';

                    // Set role flags
                    setIsManager(managerFlag);
                    setIsAdmin(adminFlag);
                    setIsFieldOfficer(fieldOfficerFlag);

                    console.log('Role from API:', role);
                    console.log('isManager:', managerFlag);
                    console.log('isAdmin:', adminFlag);
                    console.log('isFieldOfficer:', fieldOfficerFlag);
                } else {
                    console.error('Failed to fetch current user data');
                }
            } catch (error) {
                console.error('Error fetching current user:', error);
            }
        };

        fetchCurrentUser();
    }, [token]);

    // Fetch team data for managers and field officers
    useEffect(() => {
        const loadTeamData = async () => {
            if ((!isManager && !isFieldOfficer) || !userData?.employeeId) return;
            
            setTeamLoading(true);
            setTeamError(null);
            
            try {
                const teamData: TeamDataDto[] = await API.getTeamByEmployee(userData.employeeId);
                
                // Get the first team ID (assuming manager/field officer has one primary team)
                if (teamData.length > 0) {
                    setTeamId(teamData[0].id);
                } else {
                    setTeamError('No team data found for this user');
                    // Fallback to hardcoded team ID
                    setTeamId(6);
                }
            } catch (err) {
                console.error('Failed to load team data:', err);
                setTeamError('Failed to load team data');
                // Fallback to hardcoded team ID if API fails
                setTeamId(6);
            } finally {
                setTeamLoading(false);
            }
        };

        loadTeamData();
    }, [isManager, isFieldOfficer, userData?.employeeId]);

    useEffect(() => {
        if (token) {
            fetchPendingRequests();
        }
    }, [token, teamId]);

    const fetchPendingRequests = async () => {
        if (!token) return;
        
        // For managers and field officers, wait until teamId is available
        if ((isManager || isFieldOfficer) && (teamId === null || teamId === undefined)) return;
        
        try {
            setLoading(true);
            
            // All users use the same attendance requests API endpoint
            const url = 'https://api.gajkesaristeels.in/request/getByStatus?status=pending';
            console.log('Attendance requests API call:', url);
            
            const response = await fetch(url, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            
            const data: ApprovalRequest[] = await response.json();
            setRequests(data);
        } catch (err) {
            setError('Failed to fetch pending requests. Please try again later.');
        } finally {
            setLoading(false);
        }
    };

    const handleApproval = async (id: number, action: 'approved' | 'rejected') => {
        if (!token) return;
        
        const type = approvalType[id] || requests.find(r => r.id === id)?.requestedStatus || 'full day';
        
        try {
            await fetch(
                `https://api.gajkesaristeels.in/request/updateStatus?id=${id}&status=${action}&attendance=${encodeURIComponent(type)}`,
                {
                    method: 'PUT',
                    headers: {
                        Authorization: `Bearer ${token}`,
                        requestId: id.toString()
                    }
                }
            );
            await fetchPendingRequests();
            setApprovalType(prev => ({ ...prev, [id]: null }));
        } catch (err) {
            setError('Failed to update request status. Please try again.');
        }
    };

    const handleTypeChange = (id: number, type: 'full day' | 'half day') => {
        setApprovalType(prev => ({ ...prev, [id]: type }));
    };

    const filteredAndSortedRequests = useMemo(() => {
        const filtered = requests.filter(request => {
            const matchesSearch = request.employeeName.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesStatus = statusFilter === 'all' || request.status?.toLowerCase() === statusFilter;
            return matchesSearch && matchesStatus;
        });

        // Group by employee and date to identify duplicates
        const groupedRequests = filtered.reduce((acc, request) => {
            const key = `${request.employeeId}-${request.requestDate}`;
            if (!acc[key]) {
                acc[key] = [];
            }
            acc[key].push(request);
            return acc;
        }, {} as Record<string, ApprovalRequest[]>);

        // Flatten grouped requests and mark duplicates
        const processedRequests = Object.values(groupedRequests).flatMap(group => {
            if (group.length > 1) {
                // Mark duplicates
                return group.map((request, index) => ({
                    ...request,
                    isDuplicate: true,
                    duplicateCount: group.length,
                    duplicateIndex: index + 1
                }));
            }
            return group;
        });

        return processedRequests.sort((a, b) => {
            switch (sortBy) {
                case 'name':
                    return a.employeeName.localeCompare(b.employeeName);
                case 'status':
                    return (a.status || '').localeCompare(b.status || '');
                case 'date':
                default:
                    return new Date(b.requestDate).getTime() - new Date(a.requestDate).getTime();
            }
        });
    }, [requests, searchTerm, statusFilter, sortBy]);

    const getStatusBadgeVariant = (status: string | null | undefined) => {
        if (!status) return 'outline';
        
        switch (status.toLowerCase()) {
            case 'approved': return 'default';
            case 'rejected': return 'destructive';
            case 'pending': return 'secondary';
            default: return 'outline';
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const getStatusCounts = () => {
        const counts = {
            all: requests.length,
            pending: 0,
            approved: 0,
            rejected: 0
        };

        requests.forEach(request => {
            const status = request.status?.toLowerCase();
            if (status === "pending") counts.pending++;
            if (status === "approved") counts.approved++;
            if (status === "rejected") counts.rejected++;
        });

        return counts;
    };

    const statusCounts = getStatusCounts();

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <Skeleton className="h-8 w-48" />
                    <div className="flex gap-2">
                        <Skeleton className="h-10 w-64" />
                        <Skeleton className="h-10 w-32" />
                    </div>
                </div>
                <div className="grid gap-4">
                    {[...Array(6)].map((_, i) => (
                        <Card key={i}>
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between mb-3">
                                    <Skeleton className="h-5 w-32" />
                                    <Skeleton className="h-6 w-16" />
                                </div>
                                <div className="space-y-2">
                                    <Skeleton className="h-4 w-full" />
                                    <Skeleton className="h-4 w-3/4" />
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="space-y-6">
                <Card>
                    <CardContent className="p-8 text-center">
                        <XCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
                        <h3 className="text-lg font-semibold mb-2">Error Loading Requests</h3>
                        <p className="text-muted-foreground mb-4">{error}</p>
                        <Button onClick={fetchPendingRequests}>Try Again</Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    {(isManager || isFieldOfficer) && (
                        <div className="text-sm text-muted-foreground">
                            <p>
                                {teamLoading ? 'Loading team data...' : 
                                 teamError ? `Error: ${teamError} (Using fallback Team ID: ${teamId})` :
                                 teamId ? `Team-based view (Team ID: ${teamId})` : 
                                 'No team data available'}
                            </p>
                        </div>
                    )}
                </div>
                <Badge variant="outline" className="text-sm">
                    {filteredAndSortedRequests.length} requests
                </Badge>
            </div>

            {/* Filters and Search */}
            <Card>
                <CardHeader className="pb-4">
                    <div className="flex flex-col sm:flex-row justify-between gap-4">
                        <div className="flex flex-col sm:flex-row gap-3 flex-1">
                            <div className="relative flex-1 max-w-md">
                                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    placeholder="Search by employee name..."
                                    className="pl-10"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <Sheet open={isFilterOpen} onOpenChange={setIsFilterOpen}>
                                <SheetTrigger asChild>
                                    <Button variant="outline" className="sm:hidden">
                                        <Filter className="mr-2 h-4 w-4" />
                                        Filters
                                    </Button>
                                </SheetTrigger>
                                <SheetContent side="left" className="w-64 sm:w-80">
                                    <SheetHeader>
                                        <SheetTitle>Filters</SheetTitle>
                                    </SheetHeader>
                                    <div className="mt-6 space-y-4">
                                        <div>
                                            <h3 className="text-sm font-medium mb-2">Status</h3>
                                            <div className="space-y-2">
                                                <Button
                                                    variant={statusFilter === "all" ? "default" : "outline"}
                                                    onClick={() => setStatusFilter("all")}
                                                    className="w-full justify-between"
                                                >
                                                    <span>All Requests</span>
                                                    <Badge variant="secondary" className="ml-2">{statusCounts.all}</Badge>
                                                </Button>
                                                <Button
                                                    variant={statusFilter === "pending" ? "default" : "outline"}
                                                    onClick={() => setStatusFilter("pending")}
                                                    className="w-full justify-between"
                                                >
                                                    <span>Pending</span>
                                                    <Badge variant="secondary" className="ml-2">{statusCounts.pending}</Badge>
                                                </Button>
                                                <Button
                                                    variant={statusFilter === "approved" ? "default" : "outline"}
                                                    onClick={() => setStatusFilter("approved")}
                                                    className="w-full justify-between"
                                                >
                                                    <span>Approved</span>
                                                    <Badge variant="secondary" className="ml-2">{statusCounts.approved}</Badge>
                                                </Button>
                                                <Button
                                                    variant={statusFilter === "rejected" ? "default" : "outline"}
                                                    onClick={() => setStatusFilter("rejected")}
                                                    className="w-full justify-between"
                                                >
                                                    <span>Rejected</span>
                                                    <Badge variant="secondary" className="ml-2">{statusCounts.rejected}</Badge>
                                                </Button>
                                            </div>
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-medium mb-2">Sort By</h3>
                                            <Select value={sortBy} onValueChange={(value: 'date' | 'name' | 'status') => setSortBy(value)}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Sort by" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="date">Date</SelectItem>
                                                    <SelectItem value="name">Name</SelectItem>
                                                    <SelectItem value="status">Status</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                </SheetContent>
                                <div className="hidden sm:flex gap-2">
                                    <Button
                                        variant={statusFilter === "all" ? "default" : "outline"}
                                        onClick={() => setStatusFilter("all")}
                                        size="sm"
                                    >
                                        <Clock className="mr-2 h-4 w-4" />
                                        All ({statusCounts.all})
                                    </Button>
                                    <Button
                                        variant={statusFilter === "pending" ? "default" : "outline"}
                                        onClick={() => setStatusFilter("pending")}
                                        size="sm"
                                    >
                                        <Clock className="mr-2 h-4 w-4" />
                                        Pending ({statusCounts.pending})
                                    </Button>
                                    <Button
                                        variant={statusFilter === "approved" ? "default" : "outline"}
                                        onClick={() => setStatusFilter("approved")}
                                        size="sm"
                                    >
                                        <CheckCircle className="mr-2 h-4 w-4" />
                                        Approved ({statusCounts.approved})
                                    </Button>
                                    <Button
                                        variant={statusFilter === "rejected" ? "default" : "outline"}
                                        onClick={() => setStatusFilter("rejected")}
                                        size="sm"
                                    >
                                        <XCircle className="mr-2 h-4 w-4" />
                                        Rejected ({statusCounts.rejected})
                                    </Button>
                                </div>
                            </Sheet>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <AnimatePresence>
                        {filteredAndSortedRequests.length === 0 ? (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                            >
                                <Card>
                                    <CardContent className="p-12 text-center">
                                        <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                                        <h3 className="text-lg font-semibold mb-2">No requests found</h3>
                                        <p className="text-muted-foreground">
                                            {searchTerm || statusFilter !== 'all' 
                                                ? 'Try adjusting your search or filter criteria.'
                                                : 'There are no pending requests at the moment.'
                                            }
                                        </p>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        ) : (
                            <div className="grid gap-4">
                                {filteredAndSortedRequests.map((request, index) => (
                                    <motion.div
                                        key={request.id}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -20 }}
                                        transition={{ delay: index * 0.05 }}
                                    >
                                        <Card className={`hover:shadow-md transition-shadow ${request.isDuplicate ? 'border-orange-200 bg-orange-50/50' : ''}`}>
                                            <CardContent className="p-4">
                                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                                    {/* Employee Info */}
                                                    <div className="flex items-start gap-3 flex-1">
                                                        <div className={`p-2 rounded-full ${request.isDuplicate ? 'bg-orange-100' : 'bg-primary/10'}`}>
                                                            <User className={`h-4 w-4 ${request.isDuplicate ? 'text-orange-600' : 'text-primary'}`} />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2">
                                                                <h3 className="font-semibold text-lg truncate">{request.employeeName}</h3>
                                                                {request.isDuplicate && (
                                                                    <Badge variant="outline" className="text-orange-600 border-orange-300 bg-orange-100">
                                                                        Duplicate {request.duplicateIndex}/{request.duplicateCount}
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mt-1">
                                                                <div className="flex items-center gap-1">
                                                                    <Calendar className="h-3 w-3" />
                                                                    <span>Request Date: {formatDate(request.requestDate)}</span>
                                                                </div>
                                                                <div className="flex items-center gap-1">
                                                                    <Clock className="h-3 w-3" />
                                                                    <span>Log Date: {formatDate(request.logDate)}</span>
                                                                </div>
                                                                <div className="flex items-center gap-1">
                                                                    <span>Requested: {request.requestedStatus}</span>
                                                                </div>
                                                                {request.actionDate && (
                                                                    <div className="flex items-center gap-1">
                                                                        <span>Action Date: {formatDate(request.actionDate)}</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Status and Actions */}
                                                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                                                        <Badge variant={getStatusBadgeVariant(request.status)}>
                                                            {request.status || 'Unknown'}
                                                        </Badge>

                                                        {request.status?.toLowerCase() === 'pending' && (
                                                            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                                                                {/* Type Selection */}
                                                                <div className="flex gap-2">
                                                                    <Button
                                                                        variant={approvalType[request.id] === 'full day' ? 'default' : 'outline'}
                                                                        size="sm"
                                                                        onClick={() => handleTypeChange(request.id, 'full day')}
                                                                        className="text-xs"
                                                                    >
                                                                        Full Day
                                                                    </Button>
                                                                    <Button
                                                                        variant={approvalType[request.id] === 'half day' ? 'default' : 'outline'}
                                                                        size="sm"
                                                                        onClick={() => handleTypeChange(request.id, 'half day')}
                                                                        className="text-xs"
                                                                    >
                                                                        Half Day
                                                                    </Button>
                                                                </div>

                                                                {/* Action Buttons */}
                                                                <div className="flex gap-2">
                                                                    <Button
                                                                        size="sm"
                                                                        onClick={() => handleApproval(request.id, 'approved')}
                                                                        className="bg-green-600 hover:bg-green-700"
                                                                    >
                                                                        <CheckCircle className="h-4 w-4 mr-1" />
                                                                        Approve
                                                                    </Button>
                                                                    <Button
                                                                        size="sm"
                                                                        variant="destructive"
                                                                        onClick={() => handleApproval(request.id, 'rejected')}
                                                                    >
                                                                        <XCircle className="h-4 w-4 mr-1" />
                                                                        Reject
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </AnimatePresence>
                </CardContent>
            </Card>
        </div>
    );
};

export default ApprovalsPage;