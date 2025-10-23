'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { useAuth } from '@/components/auth-provider';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Loader, CalendarIcon } from "lucide-react";
import { API, type TeamDataDto } from "@/lib/api";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { SpacedCalendar } from "@/components/ui/spaced-calendar";

interface Brand {
    id: number;
    brandName: string;
    price: number;
    city: string;
    state: string;
    employeeDto: {
        id: number;
        firstName: string;
        lastName: string;
        city: string;
    };
    metric: string;
    createdAt: string;
    updatedAt: string;
}

const PricingPage = () => {
    const [brandData, setBrandData] = useState<Brand[]>([]);
    const [previousDayData, setPreviousDayData] = useState<Brand[]>([]);
    const [selectedCity, setSelectedCity] = useState('');
    const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [cities, setCities] = useState<string[]>([]);
    const [gajkesariRate, setGajkesariRate] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [showGajkesariRate, setShowGajkesariRate] = useState(false);
    const [fieldOfficers, setFieldOfficers] = useState<string[]>([]);
    const [selectedFieldOfficer, setSelectedFieldOfficer] = useState("all");
    const [teamId, setTeamId] = useState<number | null>(null);
    const [teamData, setTeamData] = useState<TeamDataDto[]>([]);
    const [teamLoading, setTeamLoading] = useState(false);
    const [teamError, setTeamError] = useState<string | null>(null);

    const { token, userRole, currentUser, userData } = useAuth();
    
    // State for role checking
    const [isManager, setIsManager] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);
    const [isFieldOfficer, setIsFieldOfficer] = useState(false);
    const [userRoleFromAPI, setUserRoleFromAPI] = useState<string | null>(null);

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
                    
                    // Set role flags
                    setIsManager(role === 'ROLE_MANAGER');
                    setIsAdmin(role === 'ROLE_ADMIN');
                    setIsFieldOfficer(role === 'ROLE_FIELD OFFICER');
                    
                    console.log('Role from API:', role);
                    console.log('isManager:', role === 'ROLE_MANAGER');
                    console.log('isAdmin:', role === 'ROLE_ADMIN');
                    console.log('isFieldOfficer:', role === 'ROLE_FIELD OFFICER');
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
                setTeamData(teamData);
                
                // Get the first team ID (assuming manager/field officer has one primary team)
                if (teamData.length > 0) {
                    setTeamId(teamData[0].id);
                } else {
                    setTeamError('No team data found for this user');
                    // Fallback to hardcoded team ID
                    setTeamId(51);
                }
            } catch (err) {
                console.error('Failed to load team data:', err);
                setTeamError('Failed to load team data');
                // Fallback to hardcoded team ID if API fails
                setTeamId(51);
            } finally {
                setTeamLoading(false);
            }
        };

        loadTeamData();
    }, [isManager, isFieldOfficer, userData?.employeeId]);

    useEffect(() => {
        fetchData();
    }, [selectedCity, selectedDate, teamId]);

    const fetchData = async () => {
        setIsLoading(true);
        await Promise.all([fetchBrandData(), fetchPreviousDayData()]);
        setIsLoading(false);
    };

    const fetchBrandData = useCallback(async () => {
        if (!token) return;
        
        // For managers and field officers, wait until teamId is available
        if ((isManager || isFieldOfficer) && (teamId === null || teamId === undefined)) return;
        
        try {
            const formattedStartDate = format(new Date(selectedDate), 'yyyy-MM-dd');
            const formattedEndDate = format(new Date(selectedDate), 'yyyy-MM-dd');

            console.log('fetchBrandData - isManager:', isManager, 'teamId:', teamId);

            let url: string;
            
            if (isManager && teamId !== null) {
                // For managers, use team-based API call
                url = `https://api.gajkesaristeels.in/brand/getByTeamAndDate?id=${teamId}&start=${formattedStartDate}&end=${formattedEndDate}`;
                console.log('Manager API call:', url);
            } else if (isAdmin) {
                // For admins, use the original API call
                url = `https://api.gajkesaristeels.in/brand/getByDateRange?start=${formattedStartDate}&end=${formattedEndDate}`;
                console.log('Admin API call:', url);
            } else if (isFieldOfficer) {
                // For field officers, use team-based API call (same as manager for now)
                url = `https://api.gajkesaristeels.in/brand/getByTeamAndDate?id=${teamId}&start=${formattedStartDate}&end=${formattedEndDate}`;
                console.log('Field Officer API call:', url);
            } else {
                // Default to admin API call
                url = `https://api.gajkesaristeels.in/brand/getByDateRange?start=${formattedStartDate}&end=${formattedEndDate}`;
                console.log('Default (Admin) API call:', url);
            }

            const response = await fetch(url, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            const data: Brand[] = await response.json();
            setBrandData(data);

            const uniqueCities = Array.from(new Set(data.map(brand =>
                brand.brandName.toLowerCase() === 'gajkesari' ? brand.city : brand.employeeDto?.city
            ).filter(city => city && city.trim() !== "")));
            setCities(uniqueCities);

            if (!selectedCity && uniqueCities.length > 0) {
                setSelectedCity(uniqueCities[0]);
            }

            const uniqueFieldOfficers = Array.from(new Set(data.map(brand =>
                brand.employeeDto ? `${brand.employeeDto.firstName} ${brand.employeeDto.lastName}` : ''
            ).filter(officer => officer && officer.trim() !== "")));
            setFieldOfficers(uniqueFieldOfficers);

            const gajkesariBrand = data.find(brand => brand.brandName.toLowerCase() === 'gajkesari');
            if (gajkesariBrand) {
                setGajkesariRate(gajkesariBrand.price);
                setShowGajkesariRate(gajkesariBrand.employeeDto?.firstName === 'Test' && gajkesariBrand.employeeDto?.lastName === '1');
            } else {
                setGajkesariRate(0);
                setShowGajkesariRate(false);
            }
        } catch (error) {
            console.error('Error fetching brand data:', error);
            setBrandData([]);
            setGajkesariRate(0);
            setShowGajkesariRate(false);
        }
    }, [selectedDate, token, selectedCity, isManager, teamId]);

    const fetchPreviousDayData = useCallback(async () => {
        if (!token) return;
        
        // For managers and field officers, wait until teamId is available
        if ((isManager || isFieldOfficer) && (teamId === null || teamId === undefined)) return;
        
        const previousDay = format(new Date(new Date(selectedDate).getTime() - 24 * 60 * 60 * 1000), 'yyyy-MM-dd');
        try {
            let url: string;
            
            if (isManager && teamId !== null) {
                // For managers, use team-based API call
                url = `https://api.gajkesaristeels.in/brand/getByTeamAndDate?id=${teamId}&start=${previousDay}&end=${previousDay}`;
                console.log('Manager Previous Day API call:', url);
            } else if (isAdmin) {
                // For admins, use the original API call
                url = `https://api.gajkesaristeels.in/brand/getByDateRange?start=${previousDay}&end=${previousDay}`;
                console.log('Admin Previous Day API call:', url);
            } else if (isFieldOfficer) {
                // For field officers, use team-based API call (same as manager for now)
                url = `https://api.gajkesaristeels.in/brand/getByTeamAndDate?id=${teamId}&start=${previousDay}&end=${previousDay}`;
                console.log('Field Officer Previous Day API call:', url);
            } else {
                // Default to admin API call
                url = `https://api.gajkesaristeels.in/brand/getByDateRange?start=${previousDay}&end=${previousDay}`;
                console.log('Default (Admin) Previous Day API call:', url);
            }

            const response = await fetch(url, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            const data: Brand[] = await response.json();
            setPreviousDayData(data);
        } catch (error) {
            console.error('Error fetching previous day data:', error);
            setPreviousDayData([]);
        }
    }, [selectedDate, token, isManager, teamId]);

    const filteredBrands = brandData.filter(brand => {
        const cityMatch = selectedCity === "all" || (brand.brandName.toLowerCase() === 'gajkesari' ? brand.city === selectedCity : brand.employeeDto?.city === selectedCity);
        const officerMatch = selectedFieldOfficer === "all" || (brand.employeeDto ? `${brand.employeeDto.firstName} ${brand.employeeDto.lastName}` === selectedFieldOfficer : false);
        return cityMatch && officerMatch;
    });

    // Group brands and consolidate Gajkesari entries
    const brandGroups = filteredBrands.reduce((acc, brand) => {
        const brandName = brand.brandName.toLowerCase();
        
        if (brandName === 'gajkesari') {
            // Consolidate all Gajkesari entries
            if (!acc['Gajkesari']) {
                acc['Gajkesari'] = {
                    brand: 'Gajkesari',
                    ourPrice: gajkesariRate > 0 ? gajkesariRate : brand.price,
                    competitorPrice: 0,
                    count: 1
                };
            } else {
                acc['Gajkesari'].count += 1;
                // Use the latest price if gajkesariRate is not set
                if (gajkesariRate === 0) {
                    acc['Gajkesari'].ourPrice = brand.price;
                }
            }
        } else {
            // Keep other brands separate
            if (!acc[brand.brandName]) {
                acc[brand.brandName] = {
                    brand: brand.brandName,
                    ourPrice: 0,
                    competitorPrice: brand.price,
                    count: 1
                };
            } else {
                acc[brand.brandName].count += 1;
                // Use average price for multiple entries of same brand
                acc[brand.brandName].competitorPrice = 
                    (acc[brand.brandName].competitorPrice * (acc[brand.brandName].count - 1) + brand.price) / acc[brand.brandName].count;
            }
        }
        
        return acc;
    }, {} as Record<string, { brand: string; ourPrice: number; competitorPrice: number; count: number }>);

    const chartData = Object.values(brandGroups)
        .map((item: Record<string, unknown>) => ({
            brand: item.brand as string,
            ourPrice: item.ourPrice as number,
            competitorPrice: item.competitorPrice as number
        }))
        .sort((a, b) => {
            // Gajkesari always comes first
            if (a.brand.toLowerCase() === 'gajkesari') return -1;
            if (b.brand.toLowerCase() === 'gajkesari') return 1;
            
            // Sort other brands alphabetically
            return a.brand.localeCompare(b.brand);
        });


    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle>Pricing Report</CardTitle>
                            <div className="text-sm text-muted-foreground mt-1">
                                {(isManager || isFieldOfficer) && (
                                    <p>
                                        {teamLoading ? 'Loading team data...' : 
                                         teamError ? `Error: ${teamError} (Using fallback Team ID: ${teamId})` :
                                         teamId ? `Team-based view (Team ID: ${teamId})` : 
                                         'No team data available'}
                                    </p>
                                )}
                            </div>
                        </div>
                        {showGajkesariRate && gajkesariRate > 0 && (
                            <div className="text-right">
                                <h2 className="text-2xl">
                                    Gajkesari Rate: <span className="font-bold">₹{gajkesariRate}/ton</span>
                                </h2>
                            </div>
                        )}
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label>City</Label>
                            <Select value={selectedCity} onValueChange={setSelectedCity}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select city" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Cities</SelectItem>
                                    {cities.map((city) => (
                                        <SelectItem key={city} value={city}>
                                            {city}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        
                        <div className="space-y-2">
                            <Label>Date</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        className={`w-full justify-start text-left font-normal ${!selectedDate && 'text-muted-foreground'}`}
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {selectedDate ? format(new Date(selectedDate), 'PPP') : <span>Pick a date</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <SpacedCalendar
                                        initialFocus
                                        mode="single"
                                        defaultMonth={new Date(selectedDate)}
                                        selected={new Date(selectedDate)}
                                        onSelect={(date: Date | undefined) => {
                                            if (date) {
                                                setSelectedDate(format(date, 'yyyy-MM-dd'));
                                            }
                                        }}
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>
                        
                        <div className="space-y-2">
                            <Label>Field Officer</Label>
                            <Select value={selectedFieldOfficer} onValueChange={setSelectedFieldOfficer}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select field officer" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Field Officers</SelectItem>
                                    {fieldOfficers.map((officer) => (
                                        <SelectItem key={officer} value={officer}>
                                            {officer}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle>Competitor Pricing</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <div className="flex justify-center items-center h-64">
                                <Loader className="w-8 h-8 animate-spin text-primary" />
                            </div>
                        ) : (
                            <div className="rounded-md border overflow-hidden">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Competitor</TableHead>
                                            <TableHead>Price (₹/ton)</TableHead>
                                            <TableHead>City</TableHead>
                                            <TableHead>Field Officer</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredBrands.length > 0 ? (
                                            filteredBrands.map((brand) => (
                                                <TableRow key={brand.id}>
                                                    <TableCell className="font-medium">{brand.brandName}</TableCell>
                                                    <TableCell>₹{brand.price.toFixed(2)}</TableCell>
                                                    <TableCell>{brand.city}</TableCell>
                                                    <TableCell>
                                                        {brand.brandName.toLowerCase() === 'gajkesari'
                                                            ? brand.city
                                                            : brand.employeeDto
                                                                ? `${brand.employeeDto.firstName} ${brand.employeeDto.lastName}`
                                                                : 'N/A'}
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        ) : (
                                            <TableRow>
                                                <TableCell colSpan={4} className="h-24 text-center">
                                                    No pricing data found matching the selected filters
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle>Price Comparison by Brand</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <div className="flex justify-center items-center h-80">
                                <Loader className="w-8 h-8 animate-spin text-primary" />
                            </div>
                        ) : (
                            <>
                                <div className="h-80">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart
                                            data={chartData}
                                            margin={{
                                                top: 20,
                                                right: 30,
                                                left: 20,
                                                bottom: 60,
                                            }}
                                        >
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis dataKey="brand" angle={-45} textAnchor="end" height={60} />
                                            <YAxis />
                                            <Tooltip 
                                                formatter={(value) => [`₹${value}`, "Price"]}
                                                labelFormatter={(value) => `Brand: ${value}`}
                                            />
                                            <Legend />
                                            <Bar dataKey="ourPrice" name="Our Price" fill="#3b82f6" />
                                            <Bar dataKey="competitorPrice" name="Competitor Price" fill="#10b981" />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="mt-4 text-sm text-muted-foreground">
                                    <p>Comparison of prices by brand between our products and competitors</p>
                                </div>
                            </>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default PricingPage;