"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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
  Phone, 
  Mail, 
  MapPin, 
  Calendar, 
  User, 
  Building, 
  Clock, 
  Plus,
  Edit,
  Trash2,
  MessageSquare,
  FileText,
  AlertCircle,
  Image as ImageIcon,
  TrendingUp,
  ArrowLeft,
  Store,
  CheckCircle,
  Loader2,
  ExternalLink,
  ClipboardList,
  ListTodo,
  MapPin as MapMarker,
  LogIn,
  LogOut,
  Gift,
  ChevronLeft,
  ChevronRight,
  X
} from "lucide-react";
import { formatCityLabel } from "@/lib/city-options";
import { format, parseISO } from "date-fns";
import { Heading, Text } from "@/components/ui/typography";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { CalendarIcon } from "lucide-react";
import { API, BrandProCon, IntentAuditLog, MonthlySaleChange, Task, Note as ApiNote, VisitAttachmentResponse, VisitDto } from "@/lib/api";
import { useAuth } from "@/components/auth-provider";
import { hasManagerPrivileges } from "@/lib/auth";
import { Skeleton } from "@/components/ui/skeleton";
import Image from 'next/image';
import BrandTab from './BrandTab';
import VisitTasksTab from './visit-tasks-tab';
import { normalizeVisitTask } from '@/lib/visit-task';

type Priority = 'low' | 'medium' | 'high';

type Metric = {
  title: string;
  value: string;
};

type VisitDetail = {
  id: number;
  storeName: string;
  employeeName: string;
  visit_date: string;
  purpose: string;
  priority: string;
  outcome: string | null;
  brandsInUse: string[];
  brandProCons: {
    id: number;
    brandName: string;
    pros: string[];
    cons: string[];
  }[];
  createdAt: string;
  updatedAt: string;
  storeId: number;
  employeeId: number;
  checkinLatitude?: number;
  checkinLongitude?: number;
  checkinTime?: string;
  checkinDate?: string;  
  checkoutTime?: string;
  checkoutDate?: string; 
  feedback?: string;
  hasGift?: boolean;
  giftName?: string | null;
  giftQuantity?: number | null;
  giftRemarks?: string | null;
  attachmentResponse?: VisitAttachmentResponse[];
};

interface Brand {
  id: number;
  name: string;
  product: string;
  interestLevel: "High" | "Medium" | "Low";
}

type Employee = {
  id: number;
  firstName: string;
  lastName: string;
};

type StoreObj = {
  id: number;
  storeName: string;
};

type NewTask = {
  id: number;
  taskTitle: string;
  taskDesciption: string;
  taskType: string;
  dueDate: string;
  assignedToId: number;
  assignedToName: string;
  assignedById: number;
  assignedByName: string;
  storeId: number;
  storeName: string;
  storeCity: string;
  visitId: number;
  visitDate: string;
  status: string;
  priority: Priority;
  attachment: Array<{ fileName: string; fileData: string }>;
  attachmentResponse: Array<{ fileName: string; fileDownloadUri: string; fileType: string; tag?: string; size?: number }>;
  createdAt: string;
  updatedAt: string;
  createdTime: string;
  updatedTime: string;
};

const VISIT_CHECKOUT_ROLES = new Set([
  "ADMIN",
  "OWNER",
  "OFFICE MANAGER",
  "DEVELOPER",
  "FIELD OFFICER",
  "MANAGER",
]);

const VISIT_API_BASE_URL = 'https://api.gajkesaristeels.in';

const fetchAuthenticatedVisitImage = async (
  visitId: number,
  tag: string,
  fileName: string,
  signal?: AbortSignal
) => {
  const authToken = localStorage.getItem('authToken');
  const response = await fetch(
    `${VISIT_API_BASE_URL}/visit/downloadFile/${visitId}/${encodeURIComponent(tag)}/${encodeURIComponent(fileName)}`,
    {
      headers: authToken ? { Authorization: `Bearer ${authToken}` } : undefined,
      signal,
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch ${tag} image`);
  }

  return URL.createObjectURL(await response.blob());
};

const normalizeVisitRole = (value?: string | null) =>
  String(value || "")
    .replace(/^ROLE[\s_]+/i, "")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();

const canRoleCheckoutVisit = (
  userRole?: string | null,
  currentUser?: { authorities?: Array<{ authority?: string | null }> } | null
) => {
  const roles = [
    userRole,
    ...(currentUser?.authorities || []).map((authority) => authority.authority),
  ];

  return roles.some((role) => VISIT_CHECKOUT_ROLES.has(normalizeVisitRole(role)));
};

const getBrowserLocation = () =>
  new Promise<GeolocationPosition>((resolve, reject) => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      reject(new Error("Location access is not available in this browser."));
      return;
    }

    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0,
    });
  });

export default function VisitDetailPage() {
  const router = useRouter();
  const params = useParams();
  const visitId = params?.id as string;
  const { token, userRole, userData, currentUser } = useAuth();
  
  const [visitDetail, setVisitDetail] = useState<VisitDetail | null>(null);
  const [activeTab, setActiveTab] = useState("metrics");
  const [activeInfoTab, setActiveInfoTab] = useState("visit-info");
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [brandProCons, setBrandProCons] = useState<BrandProCon[]>([]);
  const [intentAuditLogs, setIntentAuditLogs] = useState<IntentAuditLog[]>([]);
  const [monthlySaleChanges, setMonthlySaleChanges] = useState<MonthlySaleChange[]>([]);
  const [requirements, setRequirements] = useState<Task[]>([]);
  const [complaints, setComplaints] = useState<Task[]>([]);
  const [notes, setNotes] = useState<ApiNote[]>([]);
  const [storeVisits, setStoreVisits] = useState<VisitDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checkinImages, setCheckinImages] = useState<string[]>([]);
  const [giftImage, setGiftImage] = useState<string | null>(null);
  const [isGiftImageLoading, setIsGiftImageLoading] = useState(false);
  const [giftImageError, setGiftImageError] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(3);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAll, setShowAll] = useState(false);
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [taskLoading, setTaskLoading] = useState({ requirement: true, complaint: true });
  const [taskErrors, setTaskErrors] = useState<{ requirement: string | null; complaint: string | null }>({ requirement: null, complaint: null });
  const [isRequirementModalOpen, setIsRequirementModalOpen] = useState(false);
  const [isComplaintModalOpen, setIsComplaintModalOpen] = useState(false);
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const [taskCreateError, setTaskCreateError] = useState<string | null>(null);
  const [activeRequirementTab, setActiveRequirementTab] = useState('general');
  const [activeComplaintTab, setActiveComplaintTab] = useState('general');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [stores, setStores] = useState<StoreObj[]>([]);
  const [newTask, setNewTask] = useState<NewTask>({
    id: 0,
    taskTitle: '',
    taskDesciption: '',
    dueDate: '',
    assignedToId: 0,
    assignedToName: '',
    assignedById: 0,
    assignedByName: '',
    storeId: 0,
    storeName: '',
    storeCity: '',
    visitId: Number(visitId),
    visitDate: '',
    status: 'Assigned',
    priority: 'low',
    taskType: 'requirement',
    attachment: [],
    attachmentResponse: [],
    createdAt: '',
    updatedAt: '',
    createdTime: '',
    updatedTime: '',
  });
  const [complaintTask, setComplaintTask] = useState<NewTask>({
    id: 0,
    taskTitle: '',
    taskDesciption: '',
    dueDate: '',
    assignedToId: 0,
    assignedToName: '',
    assignedById: 0,
    assignedByName: '',
    storeId: 0,
    storeName: '',
    storeCity: '',
    visitId: Number(visitId),
    visitDate: '',
    status: 'Assigned',
    priority: 'low',
    taskType: 'complaint',
    attachment: [],
    attachmentResponse: [],
    createdAt: '',
    updatedAt: '',
    createdTime: '',
    updatedTime: '',
  });
  const [storeDetails, setStoreDetails] = useState<{
    contactNumber: string;
    city: string;
    address: string;
  } | null>(null);
  const loggedInEmployeeId = useMemo(() => {
    if (userData?.employeeId) {
      return userData.employeeId;
    }
    if (typeof window !== "undefined") {
      const stored = Number(localStorage.getItem("employeeId"));
      if (!Number.isNaN(stored) && stored > 0) {
        return stored;
      }
    }
    return 0;
  }, [userData?.employeeId]);
  
  // Role-based state
  const [isManager, setIsManager] = useState(false);
  
  // Notes functionality
  const [isNoteModalVisible, setIsNoteModalVisible] = useState(false);
  const [isNoteEditMode, setIsNoteEditMode] = useState(false);
  const [noteContent, setNoteContent] = useState('');
  const [editingNoteId, setEditingNoteId] = useState<number | null>(null);
  const [editingNoteDetails, setEditingNoteDetails] = useState<{ employeeId: number; storeId: number } | null>(null);
  const [isNoteSaving, setIsNoteSaving] = useState(false);
  const [notePendingDelete, setNotePendingDelete] = useState<ApiNote | null>(null);
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [checkoutOutcome, setCheckoutOutcome] = useState("");
  const [checkoutFeedback, setCheckoutFeedback] = useState("");
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [checkoutMessage, setCheckoutMessage] = useState<string | null>(null);
  
  // Brand functionality
  const [isAddBrandModalVisible, setIsAddBrandModalVisible] = useState(false);
  const [newBrandName, setNewBrandName] = useState('');
  const [newPros, setNewPros] = useState<string[]>([]);
  const [newCons, setNewCons] = useState<string[]>([]);
  const [currentPro, setCurrentPro] = useState('');
  const [currentCon, setCurrentCon] = useState('');

  const closeNoteModal = () => {
    setIsNoteModalVisible(false);
    setNoteContent('');
    setIsNoteEditMode(false);
    setEditingNoteId(null);
    setEditingNoteDetails(null);
  };
  const closeCheckoutModal = () => {
    setIsCheckoutModalOpen(false);
    setCheckoutError(null);
    setCheckoutOutcome(visitDetail?.outcome || 'Interested');
    setCheckoutFeedback(visitDetail?.feedback || '');
  };
  const closeRequirementModal = () => {
    setIsRequirementModalOpen(false);
    setTaskCreateError(null);
    setActiveRequirementTab('general');
    setNewTask((current) => ({
      ...current,
      taskTitle: '',
      taskDesciption: '',
      dueDate: '',
      priority: 'low',
    }));
  };
  const closeComplaintModal = () => {
    setIsComplaintModalOpen(false);
    setTaskCreateError(null);
    setActiveComplaintTab('general');
    setComplaintTask((current) => ({
      ...current,
      taskTitle: '',
      taskDesciption: '',
      dueDate: '',
      priority: 'low',
    }));
  };

  const giftAttachment = useMemo(
    () => visitDetail?.attachmentResponse?.find(
      (attachment) => String(attachment.tag || '').trim().toLowerCase() === 'gift'
    ),
    [visitDetail]
  );
  const hasSavedGift = Boolean(
    visitDetail?.hasGift ||
    visitDetail?.giftName?.trim() ||
    visitDetail?.giftQuantity != null ||
    visitDetail?.giftRemarks?.trim() ||
    giftAttachment
  );

  // Helper functions
  const getOutcomeStatus = (visit: VisitDetail | null): { emoji: React.ReactNode; status: string; color: string; isOngoing: boolean } => {
    if (visit?.checkinTime && visit?.checkoutTime) {
      return { emoji: '✅', status: 'Completed', color: 'bg-purple-100 text-purple-800', isOngoing: false };
    } else if (visit?.checkoutTime) {
      return { emoji: '⏱️', status: 'Checked Out', color: 'bg-orange-100 text-orange-800', isOngoing: false };
    } else if (visit?.checkinTime) {
      return { emoji: '🕰️', status: 'On Going', color: 'bg-green-100 text-green-800', isOngoing: true };
    }
    return { emoji: '📅', status: 'Assigned', color: 'bg-muted text-muted-foreground', isOngoing: false };
  };

  const getInitials = (name: string) => {
    const nameParts = name.split(' ');
    const initials = nameParts.map((part) => part[0]).join('');
    return initials.toUpperCase().slice(0, 2);
  };

  // Determine user role
  useEffect(() => {
    const checkUserRole = () => {
      const isManagerRole = hasManagerPrivileges(userRole, currentUser);
      setIsManager(isManagerRole);
    };
    checkUserRole();
  }, [userRole, currentUser]);

  const getStatusIcon = (status: 'Assigned' | 'On Going' | 'Checked Out' | 'Completed') => {
    switch (status) {
      case 'Assigned':
        return <Clock className="w-4 h-4" />;
      case 'On Going':
        return <Loader2 className="w-4 h-4" />;
      case 'Checked Out':
        return <CheckCircle className="w-4 h-4" />;
      case 'Completed':
        return <CheckCircle className="w-4 h-4" />;
      default:
        return null;
    }
  };

  const fetchCheckinImages = async (vId: number, attachments: VisitAttachmentResponse[]) => {
    try {
      const checkinImageUrls = await Promise.all(
        attachments
          .filter((attachment) => String(attachment.tag || '').trim().toLowerCase() === 'check-in')
          .map(async (attachment) => {
            try {
              return await fetchAuthenticatedVisitImage(vId, 'check-in', attachment.fileName);
            } catch (error) {
              console.error('Error fetching individual image:', error);
              return null;
            }
          })
      );

      setCheckinImages(checkinImageUrls.filter(url => url !== null) as string[]);
    } catch (error) {
      console.error('Error fetching check-in images:', error);
      setCheckinImages([]);
    }
  };

  const calculateVisitDuration = (checkinDate: string, checkinTime: string, checkoutDate: string, checkoutTime: string) => {
    if (!checkinDate || !checkinTime || !checkoutDate || !checkoutTime) {
      setMetrics(prev => prev.filter(metric => metric.title !== 'Visit Duration'));
      return;
    }
    
    try {
      const checkinDateTimeStr = `${checkinDate}T${checkinTime}`;
      const checkinDateTime = new Date(checkinDateTimeStr);
      
      const checkoutDateTimeStr = `${checkoutDate}T${checkoutTime}`;
      const checkoutDateTime = new Date(checkoutDateTimeStr);
      
      const diffMs = checkoutDateTime.getTime() - checkinDateTime.getTime();
      
      if (diffMs < 0) {
        setMetrics(prev => prev.filter(metric => metric.title !== 'Visit Duration'));
        return;
      }
      
      const totalSeconds = Math.floor(diffMs / 1000);
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;
      
      let visitDuration = '';
      if (hours > 0) {
        visitDuration = `${hours}h`;
        if (minutes > 0) {
          visitDuration += ` ${minutes}m`;
        }
      } else if (minutes > 0) {
        visitDuration = `${minutes}m`;
        if (seconds > 0 && minutes < 5) {
          visitDuration += ` ${seconds}s`;
        }
      } else if (seconds > 0) {
        visitDuration = `${seconds}s`;
      } else {
        visitDuration = '0s';
      }

      setMetrics((prevMetrics) => {
        const updatedMetrics = prevMetrics.filter(metric => metric.title !== 'Visit Duration');
        return [
          ...updatedMetrics,
          { title: 'Visit Duration', value: visitDuration },
        ];
      });
    } catch (error) {
      console.error('Error calculating visit duration:', error);
      setMetrics(prev => prev.filter(metric => metric.title !== 'Visit Duration'));
    }
  };

  const fetchVisitDetail = useCallback(async (targetVisitId: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const api = new API();

      const visitData = await api.getVisitById(Number(targetVisitId));
      setVisitDetail({
        ...visitData,
        purpose: visitData.purpose || '',
        priority: visitData.priority || 'low',
        outcome: visitData.outcome || null,
        feedback: visitData.feedback || '',
        brandsInUse: (visitData.brandsInUse as unknown as string[]) || [],
        brandProCons: (visitData.brandProCons as unknown as BrandProCon[]) || [],
        createdAt: visitData.createdAt || '',
        updatedAt: visitData.updatedAt || '',
        storeId: visitData.storeId || 0,
        employeeId: visitData.employeeId || 0,
      });

      calculateVisitDuration(
        visitData.checkinDate || '', 
        visitData.checkinTime || '', 
        visitData.checkoutDate || '', 
        visitData.checkoutTime || ''
      );

      setIsLoading(false);

      for (const type of ['requirement', 'complaint'] as const) {
        setTaskLoading(current => ({ ...current, [type]: true }));
        setTaskErrors(current => ({ ...current, [type]: null }));
        void api.getTasksByVisit(type, Number(targetVisitId))
          .then(tasks => type === 'requirement' ? setRequirements(tasks) : setComplaints(tasks))
          .catch(() => setTaskErrors(current => ({ ...current, [type]: `Unable to load ${type}s. Please reload and try again.` })))
          .finally(() => setTaskLoading(current => ({ ...current, [type]: false })));
      }
      (async () => {
        try {
          const [
            proConsData,
            intentAuditData,
            monthlySaleData,
            notesData,
            storeVisitsData,
          ] = await Promise.all([
            api.getVisitProCons(Number(targetVisitId)),
            api.getIntentAuditByVisit(Number(targetVisitId)),
            api.getMonthlySaleByVisit(Number(targetVisitId)),
            api.getNotesByVisit(Number(targetVisitId)),
            api.getVisitsByStore(visitData.storeId || 0),
          ]);

          setBrandProCons(proConsData || []);
          setIntentAuditLogs(intentAuditData || []);
          setMonthlySaleChanges(monthlySaleData || []);
          setNotes(notesData || []);
          const sortedStoreVisits = (storeVisitsData || []).slice().sort((a: VisitDto, b: VisitDto) => {
            const da = new Date(a.visit_date as string).getTime();
            const db = new Date(b.visit_date as string).getTime();
            return db - da;
          });
          setStoreVisits(sortedStoreVisits);

          if (intentAuditData && intentAuditData.length > 0) {
            const recentIntent = intentAuditData[intentAuditData.length - 1]?.newIntentLevel ?? 'N/A';
            setMetrics((prev) => {
              const filtered = prev.filter((m) => m.title !== 'Intent Level');
              return [...filtered, { title: 'Intent Level', value: String(recentIntent) }];
            });
          }

          if (monthlySaleData && monthlySaleData.length > 0) {
            const recentSales = `${monthlySaleData[0].newMonthlySale.toLocaleString()} tons`;
            setMetrics((prev) => {
              const filtered = prev.filter((m) => m.title !== 'Monthly Sales');
              return [...filtered, { title: 'Monthly Sales', value: recentSales }];
            });
          }

          if (visitData.attachmentResponse && visitData.attachmentResponse.length > 0) {
            fetchCheckinImages(Number(targetVisitId), visitData.attachmentResponse);
          }

          if (storeVisitsData && storeVisitsData.length > 0) {
            const firstVisit = storeVisitsData[0];
            setStoreDetails({
              contactNumber: firstVisit.storePrimaryContact?.toString() || 'Not available',
              city: firstVisit.city || 'Not available',
              address:
                `${firstVisit.subDistrict || ''}, ${firstVisit.district || ''}, ${firstVisit.state || ''}`
                  .replace(/^[, ]+|[, ]+$/g, '') || 'Not available',
            });
          }
        } catch (innerErr) {
          console.error('Error loading visit auxiliary data:', innerErr);
        }
      })();
    } catch (err) {
      setError((err as Error)?.message || 'Failed to load visit details');
      console.error('Error fetching visit details:', err);
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (visitId) {
      fetchVisitDetail(visitId);
    }
  }, [visitId, fetchVisitDetail]);

  useEffect(() => {
    const currentVisitId = visitDetail?.id;
    const giftFileName = giftAttachment?.fileName;

    if (!currentVisitId || !giftFileName) {
      setGiftImage(null);
      setIsGiftImageLoading(false);
      setGiftImageError(false);
      return;
    }

    const controller = new AbortController();
    let objectUrl: string | null = null;

    setGiftImage(null);
    setGiftImageError(false);
    setIsGiftImageLoading(true);

    void fetchAuthenticatedVisitImage(currentVisitId, 'gift', giftFileName, controller.signal)
      .then((url) => {
        objectUrl = url;
        setGiftImage(url);
      })
      .catch((imageError: unknown) => {
        if (imageError instanceof DOMException && imageError.name === 'AbortError') return;
        console.error('Error fetching gift image:', imageError);
        setGiftImageError(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsGiftImageLoading(false);
      });

    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [giftAttachment?.fileName, visitDetail?.id]);

  const handleBack = () => {
    router.back();
  };

  const handleViewStore = () => {
    if (visitDetail && visitDetail.storeId) {
      router.push(`/dashboard/customers/${visitDetail.storeId}`);
    }
  };

  const hasCheckoutPermission = canRoleCheckoutVisit(userRole, currentUser);
  const canCheckoutVisit = Boolean(
    visitDetail?.checkinTime &&
      !visitDetail?.checkoutTime &&
      hasCheckoutPermission
  );

  const openCheckoutModal = () => {
    if (!visitDetail) return;

    setCheckoutOutcome(visitDetail.outcome || "Interested");
    setCheckoutFeedback(visitDetail.feedback || "");
    setCheckoutError(null);
    setCheckoutMessage(null);
    setIsCheckoutModalOpen(true);
  };

  const handleCheckoutVisit = async () => {
    if (!visitDetail || isCheckingOut) return;

    if (!hasCheckoutPermission) {
      setCheckoutError("You do not have permission to check out this visit.");
      return;
    }

    if (!visitDetail.checkinTime) {
      setCheckoutError("Visit must be checked in before checkout.");
      return;
    }

    if (visitDetail.checkoutTime) {
      setCheckoutError("This visit is already checked out.");
      return;
    }

    if (!checkoutOutcome.trim()) {
      setCheckoutError("Enter checkout outcome.");
      return;
    }

    try {
      setIsCheckingOut(true);
      setCheckoutError(null);
      setCheckoutMessage(null);

      const position = await getBrowserLocation();
      const api = new API();
      const response = await api.checkoutVisit(visitDetail.id, {
        checkoutLatitude: position.coords.latitude,
        checkoutLongitude: position.coords.longitude,
        feedback: checkoutFeedback.trim(),
        outcome: checkoutOutcome.trim(),
      });

      if (response.toLowerCase().includes("error checking out")) {
        throw new Error(response);
      }

      setCheckoutMessage(response || "Checked out successfully.");
      setIsCheckoutModalOpen(false);
      await fetchVisitDetail(String(visitDetail.id));
    } catch (checkoutErr) {
      const message = checkoutErr instanceof Error && checkoutErr.message
        ? checkoutErr.message
        : "Failed to check out this visit.";
      setCheckoutError(message);
    } finally {
      setIsCheckingOut(false);
    }
  };

  const handlePriorityChange = (value: string) => {
    setPriorityFilter(value);
  };

  const filteredVisits = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return storeVisits;
    return storeVisits.filter((visit) =>
      String(visit.purpose || "")
        .toLowerCase()
        .includes(query)
    );
  }, [storeVisits, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredVisits.length / pageSize));
  const indexOfLastVisit = currentPage * pageSize;
  const indexOfFirstVisit = indexOfLastVisit - pageSize;
  const currentVisits = filteredVisits.slice(indexOfFirstVisit, indexOfLastVisit);

  useEffect(() => {
    setCurrentPage(1);
  }, [pageSize, searchQuery]);

  const visitStatus = getOutcomeStatus(visitDetail);

  const displayMetrics = [
    { label: "Total Visits", value: storeVisits.length },
    { label: "Visit Duration", value: metrics.find(m => m.title === 'Visit Duration')?.value || "N/A" },
    { label: "Intent Level", value: metrics.find(m => m.title === 'Intent Level')?.value || "N/A" },
    { label: "Monthly Sale", value: metrics.find(m => m.title === 'Monthly Sales')?.value || "N/A" },
  ];

  const handleOpenLocation = () => {
    if (visitDetail?.checkinLatitude && visitDetail?.checkinLongitude) {
      window.open(`https://www.google.com/maps?q=${visitDetail.checkinLatitude},${visitDetail.checkinLongitude}`, "_blank");
    }
  };

  const calculateDuration = (startTime: string, endTime: string): string => {
    try {
      const start = new Date(`2000-01-01T${startTime}`);
      const end = new Date(`2000-01-01T${endTime}`);
      const diffMs = end.getTime() - start.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const hours = Math.floor(diffMins / 60);
      const mins = diffMins % 60;
      
      if (hours > 0) {
        return `${hours}h ${mins}m`;
      } else {
        return `${mins}m`;
      }
    } catch {
      return "N/A";
    }
  };

  const handleImageClick = (image: string) => {
    setPreviewImage(image);
    setPreviewVisible(true);
  };

  const refreshNotes = useCallback(async () => {
    if (!visitId) return;
    try {
      const api = new API();
      const updatedNotes = await api.getNotesByVisit(Number(visitId));
      setNotes(updatedNotes);
    } catch (notesErr) {
      console.error('Error refreshing notes:', notesErr);
    }
  }, [visitId]);

  const addNote = () => {
    setIsNoteEditMode(false);
    setNoteContent('');
    setIsNoteModalVisible(true);
  };

  const editNote = (note: ApiNote) => {
    setNoteContent(note.content);
    setIsNoteEditMode(true);
    setEditingNoteId(note.id);
    setEditingNoteDetails({ employeeId: note.employeeId, storeId: note.storeId });
    setIsNoteModalVisible(true);
  };

  const saveNote = async () => {
    if (!noteContent.trim() || !visitDetail || isNoteSaving) return;

    try {
      setIsNoteSaving(true);
      if (isNoteEditMode && editingNoteId !== null) {
        const response = await fetch(
          `https://api.gajkesaristeels.in/notes/edit?id=${editingNoteId}`,
          {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
            },
            body: JSON.stringify({
              content: noteContent,
              employeeId: loggedInEmployeeId || visitDetail.employeeId || 0,
              storeId: visitDetail.storeId || 0,
            }),
          }
        );
        
        if (!response.ok) {
          throw new Error('Failed to update note');
        }

        await refreshNotes();
      } else {
        const response = await fetch(
          'https://api.gajkesaristeels.in/notes/create',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
            },
            body: JSON.stringify({
              content: noteContent,
              employeeId: loggedInEmployeeId || visitDetail.employeeId || 0,
              storeId: visitDetail.storeId || 0,
              visitId: Number(visitId),
            }),
          }
        );
        
        if (!response.ok) {
          throw new Error('Failed to create note');
        }

        await refreshNotes();
      }
      
      setIsNoteModalVisible(false);
      setNoteContent('');
      setIsNoteEditMode(false);
      setEditingNoteId(null);
    } catch (saveErr) {
      console.error('Error saving note:', saveErr);
    } finally {
      setIsNoteSaving(false);
    }
  };

  const deleteNote = async (id: number) => {
    try {
      const response = await fetch(
        `https://api.gajkesaristeels.in/notes/delete?id=${id}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          },
        }
      );
      
      if (!response.ok) {
        throw new Error('Failed to delete note');
      }

      await refreshNotes();
    } catch (delErr) {
      console.error('Error deleting note:', delErr);
    } finally {
      setNotePendingDelete(null);
    }
  };

  const handleAddBrandProCon = async (brandName: string, pros: string[], cons: string[]) => {
    try {
      const api = new API();
      await api.addBrandProCons(Number(visitId), [{
        brandName,
        pros,
        cons,
      }]);
      
      const updatedBrands = await api.getVisitProCons(Number(visitId));
      setBrandProCons(updatedBrands);
    } catch (brandErr) {
      console.error('Error adding brand Pro/Con:', brandErr);
    }
  };

  const createTask = async (taskType: string) => {
    setIsCreatingTask(true);
    setTaskCreateError(null);
    try {
      if (!token) {
        throw new Error('Your session is unavailable. Please sign in again.');
      }
      if (!loggedInEmployeeId) {
        throw new Error('Unable to identify the logged-in employee. Please sign in again.');
      }

      const currentTask = taskType === 'requirement' ? newTask : complaintTask;
      const taskToCreate = {
        ...currentTask,
        assignedById: loggedInEmployeeId,
        taskType,
        storeId: visitDetail?.storeId ?? 0,
        assignedToId: visitDetail?.employeeId ?? 0,
        assignedToName: visitDetail?.employeeName ?? '',
        storeName: visitDetail?.storeName ?? '',
        visitId: Number(visitId),
      };

      const response = await fetch('https://api.gajkesaristeels.in/task/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(taskToCreate),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `Failed to create ${taskType} (${response.status})`);
      }

      const data = await response.json();
      const createdTask = normalizeVisitTask({ ...taskToCreate, ...data });

      if (taskType === 'requirement') {
        setRequirements(prevTasks => [createdTask, ...prevTasks]);
        setNewTask({
          id: 0,
          taskTitle: '',
          taskDesciption: '',
          dueDate: '',
          assignedToId: 0,
          assignedToName: '',
          assignedById: 0,
          assignedByName: '',
          storeId: 0,
          storeName: '',
          storeCity: '',
          visitId: Number(visitId),
          visitDate: '',
          status: 'Assigned',
          priority: 'low',
          taskType: 'requirement',
          attachment: [],
          attachmentResponse: [],
          createdAt: '',
          updatedAt: '',
          createdTime: '',
          updatedTime: '',
        });
        setIsRequirementModalOpen(false);
        setActiveRequirementTab('general');
      } else {
        setComplaints(prevTasks => [createdTask, ...prevTasks]);
        setComplaintTask({
          id: 0,
          taskTitle: '',
          taskDesciption: '',
          dueDate: '',
          assignedToId: 0,
          assignedToName: '',
          assignedById: 0,
          assignedByName: '',
          storeId: 0,
          storeName: '',
          storeCity: '',
          visitId: Number(visitId),
          visitDate: '',
          status: 'Assigned',
          priority: 'low',
          taskType: 'complaint',
          attachment: [],
          attachmentResponse: [],
          createdAt: '',
          updatedAt: '',
          createdTime: '',
          updatedTime: '',
        });
        setIsComplaintModalOpen(false);
        setActiveComplaintTab('general');
      }
    } catch (taskErr) {
      console.error('Error creating task:', taskErr);
      setTaskCreateError(taskErr instanceof Error ? taskErr.message : `Failed to create ${taskType}`);
    } finally {
      setIsCreatingTask(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-8">
        <div className="mx-auto max-w-[1200px] space-y-6">
          <div className="flex flex-wrap justify-between gap-4">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div>
                <Skeleton className="h-4 w-36 mb-2" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-9 w-24" />
              <Skeleton className="h-9 w-24" />
              <Skeleton className="h-9 w-24" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, idx) => (
              <div key={idx} className="rounded-xl border p-4 bg-muted/20 space-y-3">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-6 w-16" />
                <Skeleton className="h-2 w-20" />
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="space-y-4">
              <div className="rounded-xl border p-5 space-y-4 bg-card">
                <Skeleton className="h-4 w-32" />
                {[...Array(4)].map((_, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <Skeleton className="h-9 w-9 rounded-lg" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-3 w-28" />
                      <Skeleton className="h-2 w-20" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="lg:col-span-2 space-y-6">
              {[...Array(3)].map((_, idx) => (
                <div key={idx} className="rounded-xl border bg-card">
                  <div className="border-b p-5">
                    <Skeleton className="h-4 w-32" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1600px] py-4">
      <div className="visit-details grid grid-cols-1 items-start gap-3 lg:grid-cols-[216px_minmax(0,1fr)_216px] xl:grid-cols-[232px_minmax(0,1fr)_232px]">
        {/* Record context rail */}
        <aside className="min-w-0 space-y-3 lg:sticky lg:top-3">
          <div className="back-button-container flex items-start justify-between gap-2">
            <button className="back-button inline-flex h-9 items-center rounded-md px-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground" onClick={handleBack}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </button>
            <div className="flex flex-col items-end gap-1.5">
              <Badge className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium">
                {getStatusIcon(visitStatus.status as 'Assigned' | 'On Going' | 'Checked Out' | 'Completed')}
                <span>{visitStatus.status}</span>
              </Badge>
              {userRole && (
                <Badge variant={isManager ? "secondary" : "default"} className="px-2 py-0.5 text-[11px]">
                  {isManager ? "Manager View" : "Admin View"}
                </Badge>
              )}
            </div>
          </div>

          <Card className="gap-0 overflow-hidden rounded-lg border-border/80 py-0 shadow-none">
            <CardContent className="flex flex-col gap-3 p-3">
              <div className="profile flex min-w-0 items-center gap-3">
                <div className="avatar flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <span className="text-sm font-semibold">
                    {getInitials(visitDetail?.storeName || '')}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-medium text-muted-foreground">Store</p>
                  <h2 className="break-words text-sm font-semibold leading-5 text-foreground">
                    {visitDetail?.storeName || 'Unknown store'}
                  </h2>
                  <p className="mt-0.5 break-words text-xs leading-4 text-muted-foreground">
                    {visitDetail?.employeeName || 'Unknown employee'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 lg:grid-cols-1">
                <div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 w-full justify-start px-2.5 text-xs"
                    onClick={handleViewStore}
                  >
                    <Store className="mr-1.5 h-3.5 w-3.5" />
                    Store
                  </Button>
                </div>
                <div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 w-full justify-start px-2.5 text-xs"
                    onClick={() => {
                      setTaskCreateError(null);
                      setIsRequirementModalOpen(true);
                    }}
                  >
                    <FileText className="mr-1.5 h-3.5 w-3.5" />
                    Requirement
                  </Button>
                </div>
                <div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 w-full justify-start px-2.5 text-xs"
                    onClick={() => {
                      setTaskCreateError(null);
                      setIsComplaintModalOpen(true);
                    }}
                  >
                    <AlertCircle className="mr-1.5 h-3.5 w-3.5" />
                    Complaint
                  </Button>
                </div>
                {canCheckoutVisit && (
                  <div>
                    <Button
                      variant="default"
                      size="sm"
                      className="h-8 w-full justify-start px-2.5 text-xs"
                      onClick={openCheckoutModal}
                      disabled={isCheckingOut}
                    >
                      {isCheckingOut ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <LogOut className="mr-1.5 h-3.5 w-3.5" />
                      )}
                      Check out
                    </Button>
                  </div>
                )}
              </div>

              {(checkoutMessage || checkoutError || error) && (
                <div className="space-y-2">
                  {checkoutMessage && (
                    <div className="rounded-md border border-emerald-200 bg-emerald-50 p-2 text-xs text-emerald-700">
                      {checkoutMessage}
                    </div>
                  )}
                  {(checkoutError || error) && (
                    <div className="rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-700">
                      {checkoutError || error}
                    </div>
                  )}
                </div>
              )}

            </CardContent>
          </Card>

          {/* Visit Information Card */}
          <Card className="w-full gap-0 overflow-hidden rounded-lg border-border/80 bg-card py-0 shadow-none">
            <header className="border-b px-3 py-2.5">
              <CardTitle className="text-sm font-semibold text-foreground">
                Visit information
              </CardTitle>
            </header>
            <CardContent className="p-0">
              <div className="flex border-b border-border bg-muted/20">
                <button
                  className={`flex-1 px-2 py-2 text-xs font-medium border-b-2 transition-colors ${
                    activeInfoTab === 'visit-info' 
                      ? 'border-primary text-foreground bg-background'
                      : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  }`}
                  onClick={() => setActiveInfoTab('visit-info')}
                >
                  <div className="flex items-center justify-center gap-2">
                    <ClipboardList className="h-4 w-4" />
                    <span>Visit</span>
                  </div>
                </button>
                <button
                  className={`flex-1 px-2 py-2 text-xs font-medium border-b-2 transition-colors ${
                    activeInfoTab === 'store-info' 
                      ? 'border-primary text-foreground bg-background'
                      : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  }`}
                  onClick={() => setActiveInfoTab('store-info')}
                >
                  <div className="flex items-center justify-center gap-2">
                    <Store className="h-4 w-4" />
                    <span>Store</span>
                  </div>
                </button>
              </div>

              <div className="p-3">
                {activeInfoTab === 'visit-info' && (
                  <dl className="grid grid-cols-2 gap-3 lg:grid-cols-1">
                    {[
                      { label: 'Purpose', icon: ListTodo, value: visitDetail?.purpose || 'Not recorded' },
                      { label: 'Location', icon: MapMarker, value: visitDetail?.checkinLatitude && visitDetail?.checkinLongitude ? (
                        <button onClick={handleOpenLocation} className="inline-flex items-center gap-1 text-primary hover:underline">
                          View location <ExternalLink className="h-3 w-3" />
                        </button>
                      ) : 'Not recorded' },
                      { label: 'Check-in', icon: LogIn, value: visitDetail?.checkinDate && visitDetail?.checkinTime ? (
                        <><span className="block">{format(new Date(visitDetail.checkinDate), "MMM dd, yyyy")}</span><span className="text-[11px] text-muted-foreground">{format(parseISO(`1970-01-01T${visitDetail.checkinTime}`), 'h:mm a')}</span></>
                      ) : 'Not checked in' },
                      { label: 'Check-out', icon: LogOut, value: visitDetail?.checkoutDate && visitDetail?.checkoutTime ? (
                        <><span className="block">{format(new Date(visitDetail.checkoutDate), "MMM dd, yyyy")}</span><span className="text-[11px] text-muted-foreground">{format(parseISO(`1970-01-01T${visitDetail.checkoutTime}`), 'h:mm a')}</span></>
                      ) : 'Not checked out' },
                    ].map(({ label, icon: Icon, value }) => (
                      <div key={label} className="flex min-w-0 items-start gap-2">
                        <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        <div className="min-w-0">
                          <dt className="text-[11px] leading-4 text-muted-foreground">{label}</dt>
                          <dd className="mt-0.5 break-words text-xs leading-4 text-foreground">{value}</dd>
                        </div>
                      </div>
                    ))}
                  </dl>
                )}

                {activeInfoTab === 'store-info' && (
                  <dl className="space-y-3">
                    <div className="flex items-start gap-2">
                      <Phone className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <div className="min-w-0">
                        <dt className="text-[11px] text-muted-foreground">Contact</dt>
                        <dd className="mt-0.5 break-words text-xs leading-4">
                          {storeDetails?.contactNumber ? <a href={`tel:${storeDetails.contactNumber}`} className="hover:underline">{storeDetails.contactNumber}</a> : 'Not recorded'}
                        </dd>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <MapMarker className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <div className="min-w-0">
                        <dt className="text-[11px] text-muted-foreground">Address</dt>
                        <dd className="mt-0.5 break-words text-xs leading-5">
                          {storeDetails?.address || 'Not recorded'}
                          {storeDetails?.city && <span className="block text-muted-foreground">{formatCityLabel(storeDetails.city)}</span>}
                          {storeDetails?.city && (
                            <button onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${visitDetail?.storeName} ${storeDetails?.address}`)}`, "_blank")} className="mt-1 inline-flex items-center gap-1 text-primary hover:underline">
                              View map <ExternalLink className="h-3 w-3" />
                            </button>
                          )}
                        </dd>
                      </div>
                    </div>
                  </dl>
                )}
              </div>
            </CardContent>
          </Card>
        </aside>

        {/* Main Content */}
        <section className="min-w-0">
          <div className="tabs mb-4 rounded-lg border bg-card p-1 shadow-sm">
            <div className="md:hidden mb-3">
              <Select value={activeTab} onValueChange={setActiveTab}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select section" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="metrics">Activity & Overview</SelectItem>
                  <SelectItem value="visits">Recent Visits</SelectItem>
                  <SelectItem value="brands">Brands</SelectItem>
                  <SelectItem value="requirements">Requirements</SelectItem>
                  <SelectItem value="complaints">Complaints</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="hidden min-w-0 grid-cols-5 gap-1 md:grid">
              <button
                className={`tab inline-flex min-w-0 items-center justify-center gap-1.5 rounded-md px-1 py-2 text-xs font-medium transition-colors xl:px-2 ${
                  activeTab === 'metrics' 
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
                onClick={() => setActiveTab('metrics')}
              >
                <TrendingUp className="hidden h-4 w-4 2xl:inline" />
                <span>Activity</span>
              </button>
              <button
                className={`tab inline-flex min-w-0 items-center justify-center gap-1.5 rounded-md px-1 py-2 text-xs font-medium transition-colors xl:px-2 ${
                  activeTab === 'visits' 
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
                onClick={() => setActiveTab('visits')}
              >
                <Calendar className="hidden h-4 w-4 2xl:inline" />
                <span>Visits</span>
              </button>
              <button
                className={`tab inline-flex min-w-0 items-center justify-center gap-1.5 rounded-md px-1 py-2 text-xs font-medium transition-colors xl:px-2 ${
                  activeTab === 'brands' 
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
                onClick={() => setActiveTab('brands')}
              >
                <Building className="hidden h-4 w-4 2xl:inline" />
                <span>Brands</span>
              </button>
              <button
                className={`tab inline-flex min-w-0 items-center justify-center gap-1.5 rounded-md px-1 py-2 text-xs font-medium transition-colors xl:px-2 ${
                  activeTab === 'requirements' 
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
                onClick={() => setActiveTab('requirements')}
              >
                <FileText className="hidden h-4 w-4 2xl:inline" />
                <span>Requirements</span>
              </button>
              <button
                className={`tab inline-flex min-w-0 items-center justify-center gap-1.5 rounded-md px-1 py-2 text-xs font-medium transition-colors xl:px-2 ${
                  activeTab === 'complaints' 
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
                onClick={() => setActiveTab('complaints')}
              >
                <AlertCircle className="hidden h-4 w-4 2xl:inline" />
                <span>Complaints</span>
              </button>
            </div>
          </div>

          {/* Tab Content */}
          <div className="tab-content">
            {activeTab === 'metrics' && (
              <div className="space-y-4">
                <Card className="gap-0 overflow-hidden rounded-lg border-border/80 py-0 shadow-none">
                  <header className="border-b px-3 py-2.5">
                    <div>
                      <CardTitle className="text-sm font-semibold">Visit overview</CardTitle>
                    </div>
                  </header>
                  <CardContent className="p-3">
                    <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                      {displayMetrics.map((metric, index) => (
                        <div key={index} className="rounded-md bg-muted/45 px-3 py-2.5">
                          <Text size="sm" tone="muted" weight="medium" className="mb-1 text-xs">
                            {metric.label}
                          </Text>
                          <Heading size="lg" weight="semibold" className="break-words text-base text-foreground">
                            {metric.value}
                          </Heading>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card className="gap-0 overflow-hidden rounded-lg border-border/80 py-0 shadow-none">
                  <header className="border-b px-3 py-2.5">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <CardTitle className="text-sm font-semibold">Visit activity</CardTitle>
                      </div>
                      <Button onClick={addNote} size="sm" className="h-8 shrink-0 text-xs">
                        <Plus className="mr-1.5 h-3.5 w-3.5" />
                        Add note
                      </Button>
                    </div>
                  </header>
                  <CardContent className="p-3">
                    <div className="relative space-y-0 before:absolute before:bottom-4 before:left-[15px] before:top-4 before:w-px before:bg-border">
                      <div className="relative flex gap-3 pb-5">
                        <div className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border bg-background">
                          <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                        </div>
                        <div className="min-w-0 pt-0.5">
                          <p className="text-sm font-medium text-foreground">Visit scheduled</p>
                          <p className="text-xs text-muted-foreground">
                            {visitDetail?.visit_date ? format(new Date(visitDetail.visit_date), "MMM dd, yyyy") : 'Date unavailable'}
                            {visitDetail?.purpose ? ` · ${visitDetail.purpose}` : ''}
                          </p>
                        </div>
                      </div>

                      {visitDetail?.checkinDate && visitDetail?.checkinTime && (
                        <div className="relative flex gap-3 pb-5">
                          <div className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950">
                            <LogIn className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                          </div>
                          <div className="min-w-0 pt-0.5">
                            <p className="text-sm font-medium text-foreground">Checked in</p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(visitDetail.checkinDate), "MMM dd, yyyy")} at {format(parseISO(`1970-01-01T${visitDetail.checkinTime}`), 'h:mm a')}
                            </p>
                          </div>
                        </div>
                      )}

                      {notes.map((note) => (
                        <div key={`activity-note-${note.id}`} className="relative flex gap-3 pb-5">
                          <div className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950">
                            <MessageSquare className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div className="min-w-0 flex-1 pt-0.5">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-foreground">Note added</p>
                                <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-5 text-muted-foreground">{note.content}</p>
                                <p className="mt-1 text-xs text-muted-foreground">
                                  {format(new Date(note.createdDate), "MMM dd, yyyy")}{note.employeeName ? ` · ${note.employeeName}` : ''}
                                </p>
                              </div>
                              <div className="flex shrink-0 items-center gap-0.5">
                                <Button variant="ghost" size="icon" onClick={() => editNote(note)} className="h-7 w-7 text-muted-foreground hover:text-foreground" aria-label="Edit note">
                                  <Edit className="h-3.5 w-3.5" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => setNotePendingDelete(note)} className="h-7 w-7 text-muted-foreground hover:text-destructive" aria-label="Delete note">
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}

                      {visitDetail?.checkoutDate && visitDetail?.checkoutTime ? (
                        <div className="relative flex gap-3">
                          <div className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-primary/20 bg-primary/10">
                            <CheckCircle className="h-3.5 w-3.5 text-primary" />
                          </div>
                          <div className="min-w-0 pt-0.5">
                            <p className="text-sm font-medium text-foreground">Visit completed</p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(visitDetail.checkoutDate), "MMM dd, yyyy")} at {format(parseISO(`1970-01-01T${visitDetail.checkoutTime}`), 'h:mm a')}
                            </p>
                            {(visitDetail.outcome || visitDetail.feedback) && (
                              <p className="mt-1 text-sm leading-5 text-muted-foreground">
                                <span className="font-medium text-foreground">Outcome:</span> {visitDetail.outcome || visitDetail.feedback}
                              </p>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="relative flex gap-3">
                          <div className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border bg-background">
                            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                          </div>
                          <div className="min-w-0 pt-0.5">
                            <p className="text-sm font-medium text-foreground">Visit in progress</p>
                            <p className="text-xs text-muted-foreground">Waiting for check-out</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {activeTab === 'visits' && (
              <section className="space-y-3" aria-labelledby="visit-history-heading">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 id="visit-history-heading" className="text-sm font-semibold text-foreground">Visit history</h2>
                    <p className="text-xs text-muted-foreground">{filteredVisits.length} visits recorded for this store</p>
                  </div>
                  <div className="relative w-full sm:w-64">
                    <Input
                      placeholder="Search visit purpose"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="h-9 pr-9 text-sm shadow-none"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        aria-label="Clear visit search"
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                        onClick={() => {
                          setSearchQuery('');
                          setCurrentPage(1);
                        }}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
                <div className="overflow-hidden rounded-lg border bg-card">
                  {currentVisits.map((visit: VisitDto) => {
                    const getVisitStatus = () => {
                      if (visit.checkinDate && visit.checkinTime && visit.checkoutDate && visit.checkoutTime) {
                        return { status: 'Completed', color: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300', icon: CheckCircle };
                      } else if (visit.checkinDate && visit.checkinTime) {
                        return { status: 'In progress', color: 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-300', icon: Clock };
                      } else {
                        return { status: 'Scheduled', color: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300', icon: Calendar };
                      }
                    };

                    const statusInfo = getVisitStatus();
                    const VisitStatusIcon = statusInfo.icon;

                    return (
                      <article
                        key={visit.id}
                        className="group grid gap-3 border-b px-3 py-3 transition-colors last:border-b-0 hover:bg-muted/25 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-4"
                      >
                        <div className="flex min-w-0 items-start gap-3">
                          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                            <Calendar className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                              <h3 className="text-sm font-semibold text-foreground">{visit.purpose || 'Visit'}</h3>
                              <span className="text-[11px] text-muted-foreground">#{visit.id}</span>
                            </div>
                            <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                              <span className="flex min-w-0 items-center gap-1.5">
                                <Store className="h-3.5 w-3.5 shrink-0" />
                                <span className="truncate">{visit.storeName || 'Store unavailable'}</span>
                              </span>
                              <span className="flex min-w-0 items-center gap-1.5">
                                <User className="h-3.5 w-3.5 shrink-0" />
                                <span className="truncate">{visit.employeeName || 'Employee unavailable'}</span>
                              </span>
                              <span className="flex items-center gap-1.5">
                                <Clock className="h-3.5 w-3.5" />
                                {visit.checkinDate && visit.checkinTime && visit.checkoutDate && visit.checkoutTime
                                  ? calculateDuration(visit.checkinTime, visit.checkoutTime)
                                  : 'Duration unavailable'}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-3 pl-11 sm:justify-end sm:pl-0">
                          <Badge variant="outline" className={`${statusInfo.color} gap-1 px-1.5 py-0.5 text-[11px] font-medium shadow-none`}>
                            <VisitStatusIcon className="h-3 w-3" />
                            {statusInfo.status}
                          </Badge>
                          <div className="min-w-[78px] text-right">
                            <p className="text-xs font-medium text-foreground">
                              {visit.checkinDate && visit.checkinTime
                                ? format(new Date(visit.checkinDate), "MMM dd, yyyy")
                                : 'Date pending'}
                            </p>
                            <p className="text-[11px] text-muted-foreground">
                              {visit.checkinDate && visit.checkinTime
                                ? format(parseISO(`1970-01-01T${visit.checkinTime}`), 'h:mm a')
                                : 'Time pending'}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.push(`/dashboard/visits/${visit.id}`)}
                            className="h-8 px-2 text-xs font-medium"
                          >
                            View
                            <ChevronRight className="ml-1 h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </article>
                    );
                  })}
                  {currentVisits.length === 0 && (
                    <div className="flex min-h-28 flex-col items-center justify-center px-4 py-8 text-center">
                      <Calendar className="mb-2 h-5 w-5 text-muted-foreground" />
                      <p className="text-sm font-medium text-foreground">No matching visits</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">Try a different visit purpose.</p>
                    </div>
                  )}
                </div>
                {storeVisits.length > pageSize && (
                  <div className="mt-4">
                    <Button onClick={() => setShowAll(!showAll)}>
                      {showAll ? 'Show Less' : 'Show More'}
                    </Button>
                    {showAll && (
                      <div className="flex items-center justify-between mt-4">
                        <div className="flex items-center space-x-2">
                          <Label htmlFor="pageSize">Rows per page:</Label>
                          <Select value={pageSize.toString()} onValueChange={(value) => setPageSize(parseInt(value))}>
                            <SelectTrigger className="w-20">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="3">3</SelectItem>
                              <SelectItem value="5">5</SelectItem>
                              <SelectItem value="10">10</SelectItem>
                              <SelectItem value="25">25</SelectItem>
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
                            Page {currentPage} of {totalPages}
                          </span>
                          
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                            disabled={currentPage >= totalPages}
                          >
                            Next
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </section>
            )}

            {activeTab === 'brands' && (
              <BrandTab
                brands={brandProCons}
                setBrands={setBrandProCons}
                visitId={visitId}
                token={localStorage.getItem('authToken')}
                fetchVisitDetail={async () => {
                  if (visitId) {
                    await fetchVisitDetail(visitId);
                  }
                }}
              />
            )}

            {activeTab === 'requirements' && (
              <VisitTasksTab tasks={requirements} type="requirement" priority={priorityFilter} onPriorityChange={handlePriorityChange} loading={taskLoading.requirement} error={taskErrors.requirement} />
            )}

            {activeTab === 'complaints' && (
              <VisitTasksTab tasks={complaints} type="complaint" priority={priorityFilter} onPriorityChange={handlePriorityChange} loading={taskLoading.complaint} error={taskErrors.complaint} />
            )}
          </div>
        </section>

        {/* Right Panel */}
        <aside className="min-w-0 space-y-3 lg:sticky lg:top-3">
          {hasSavedGift && (
            <Card className="gap-0 overflow-hidden rounded-lg border-border/80 py-0 shadow-none">
              <header className="border-b px-3 py-2.5">
                <div className="flex items-center justify-between gap-3">
                  <Heading as="h3" size="sm" weight="semibold" className="text-sm leading-5">
                    Gift details
                  </Heading>
                  <Gift className="h-5 w-5 text-rose-500" aria-hidden="true" />
                </div>
              </header>
              <CardContent className="space-y-2.5 p-3">
                <dl className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg border bg-muted/30 p-3">
                    <dt className="text-xs font-medium text-muted-foreground">Gift name</dt>
                    <dd className="mt-1 text-sm font-semibold text-foreground break-words">
                      {visitDetail?.giftName?.trim() || 'Not recorded'}
                    </dd>
                  </div>
                  <div className="rounded-lg border bg-muted/30 p-3">
                    <dt className="text-xs font-medium text-muted-foreground">Quantity</dt>
                    <dd className="mt-1 text-sm font-semibold text-foreground">
                      {visitDetail?.giftQuantity ?? 'Not recorded'}
                    </dd>
                  </div>
                </dl>

                <div>
                  <p className="text-xs font-medium text-muted-foreground">Remarks</p>
                  <p className="mt-1 text-sm text-foreground whitespace-pre-wrap break-words">
                    {visitDetail?.giftRemarks?.trim() || 'No remarks added'}
                  </p>
                </div>

                <Separator />

                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Gift image</p>
                  {isGiftImageLoading ? (
                    <Skeleton className="h-32 w-full rounded-lg" />
                  ) : giftImage ? (
                    <div className="overflow-hidden rounded-lg border">
                      <div className="relative h-32 w-full bg-muted">
                        <Image
                          src={giftImage}
                          alt={`${visitDetail?.giftName?.trim() || 'Gift'} image`}
                          width={300}
                          height={200}
                          className="h-full w-full cursor-pointer object-cover transition-opacity hover:opacity-90"
                          onClick={() => handleImageClick(giftImage)}
                        />
                      </div>
                      <div className="p-2 md:p-3">
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full text-xs md:text-sm"
                          onClick={() => handleImageClick(giftImage)}
                        >
                          View Full Size
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-lg border border-dashed p-5 text-center">
                      <ImageIcon className="mx-auto mb-1.5 h-5 w-5 text-muted-foreground/60" />
                      <Text tone="muted" className="text-sm">
                        {giftImageError ? 'Gift image could not be loaded' : 'No gift image uploaded'}
                      </Text>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="gap-0 overflow-hidden rounded-lg border-border/80 py-0 shadow-none">
            <header className="border-b px-3 py-2.5">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold leading-5">Check-in images</h3>
                {visitDetail?.checkinLatitude && visitDetail?.checkinLongitude && (
                  <button type="button" onClick={handleOpenLocation} aria-label="View check-in location" title="View check-in location" className="inline-flex h-7 items-center gap-1 rounded-md px-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                    <MapPin className="h-3.5 w-3.5" /> Map
                  </button>
                )}
              </div>
            </header>
            <CardContent className="space-y-2.5 p-3">
              {checkinImages.length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                  {checkinImages.map((img, index) => (
                    <div key={index} className="min-w-0">
                      <div className="relative aspect-video w-full overflow-hidden rounded-md bg-muted">
                        <Image
                          src={img}
                          alt={`Check-in image ${index + 1}`}
                          width={300}
                          height={200}
                          className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() => handleImageClick(img)}
                        />
                      </div>
                      <div className="flex items-center justify-between gap-2 pt-1">
                        <Heading as="h4" size="sm" weight="medium" className="text-xs">
                          Image {index + 1}
                        </Heading>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-1 text-xs text-muted-foreground hover:text-foreground"
                          onClick={() => handleImageClick(img)}
                        >
                          View full size
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-md bg-muted/25 px-2 py-4 text-center">
                  <ImageIcon className="mx-auto mb-1.5 h-5 w-5 text-muted-foreground/60" />
                  <Text tone="muted" className="text-xs">No check-in images</Text>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="gap-0 overflow-hidden rounded-lg border-border/80 py-0 shadow-none">
            <header className="border-b px-3 py-2.5">
              <Heading as="h3" size="sm" weight="semibold" className="text-sm leading-5">
                Related records
              </Heading>
            </header>
            <CardContent className="p-0">
              <div className="divide-y">
                <button type="button" onClick={() => setActiveTab('requirements')} className="flex min-h-10 w-full items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-muted/40">
                  <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1 text-xs font-medium text-foreground">Requirements</span>
                  <Badge variant="secondary" className="min-w-6 justify-center px-1.5 text-[11px]">{requirements.length}</Badge>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </button>
                <button type="button" onClick={() => setActiveTab('complaints')} className="flex min-h-10 w-full items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-muted/40">
                  <AlertCircle className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1 text-xs font-medium text-foreground">Complaints</span>
                  <Badge variant="secondary" className="min-w-6 justify-center px-1.5 text-[11px]">{complaints.length}</Badge>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </button>
                <button type="button" onClick={() => setActiveTab('brands')} className="flex min-h-10 w-full items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-muted/40">
                  <Building className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1 text-xs font-medium text-foreground">Brands</span>
                  <Badge variant="secondary" className="min-w-6 justify-center px-1.5 text-[11px]">{brandProCons.length}</Badge>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </button>
                <button type="button" onClick={() => setActiveTab('visits')} className="flex min-h-10 w-full items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-muted/40">
                  <Calendar className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1 text-xs font-medium text-foreground">Previous visits</span>
                  <Badge variant="secondary" className="min-w-6 justify-center px-1.5 text-[11px]">{storeVisits.length}</Badge>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </button>
              </div>
            </CardContent>
          </Card>
        </aside>
      </div>

      {/* Modals */}
      {/* Notes Modal */}
      <Dialog open={isNoteModalVisible} onOpenChange={(open) => {
        if (open) setIsNoteModalVisible(true);
        else closeNoteModal();
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{isNoteEditMode ? 'Edit Note' : 'Add Note'}</DialogTitle>
            <DialogDescription>
              {isNoteEditMode ? 'Update the existing note.' : 'Add a quick note for this visit.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <textarea
              placeholder="Enter note content"
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
            />
            <div className="flex flex-col sm:flex-row justify-end gap-2">
              <Button variant="outline" onClick={closeNoteModal} className="w-full sm:w-auto">Cancel</Button>
              <Button onClick={saveNote} disabled={isNoteSaving || !noteContent.trim()} className="w-full sm:w-auto">
                {isNoteSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isNoteEditMode ? 'Update Note' : 'Save Note'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Checkout Modal */}
      <Dialog open={isCheckoutModalOpen} onOpenChange={(open) => {
        if (open) setIsCheckoutModalOpen(true);
        else closeCheckoutModal();
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Check out Visit</DialogTitle>
            <DialogDescription>
              Enter the visit outcome and feedback before checking out.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="checkout-outcome">Outcome</Label>
              <Input
                id="checkout-outcome"
                placeholder="Enter outcome (e.g. Interested, Follow-up required)"
                value={checkoutOutcome}
                onChange={(e) => setCheckoutOutcome(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="checkout-feedback">Feedback</Label>
              <textarea
                id="checkout-feedback"
                placeholder="Enter visit feedback"
                value={checkoutFeedback}
                onChange={(e) => setCheckoutFeedback(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            {checkoutError && (
              <div className="rounded-md border border-red-200 bg-red-50 p-2.5 text-xs text-red-700">
                {checkoutError}
              </div>
            )}

            <div className="flex flex-col sm:flex-row justify-end gap-2">
              <Button variant="outline" onClick={closeCheckoutModal} className="w-full sm:w-auto">Cancel</Button>
              <Button onClick={handleCheckoutVisit} disabled={isCheckingOut || !checkoutOutcome.trim()} className="w-full sm:w-auto">
                {isCheckingOut && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Confirm Check Out
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Requirement Modal */}
      {isRequirementModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-2xl border-0 shadow-lg max-h-[90vh] overflow-y-auto">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg md:text-xl font-semibold text-foreground">Create Requirement</CardTitle>
              <p className="text-xs md:text-sm text-muted-foreground">Fill in the requirement details</p>
            </CardHeader>
            <CardContent>
              <Tabs value={activeRequirementTab} onValueChange={setActiveRequirementTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-4">
                  <TabsTrigger value="general">General</TabsTrigger>
                  <TabsTrigger value="details">Details</TabsTrigger>
                </TabsList>
                
                <TabsContent value="general">
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="requirementTitle">Requirement Title</Label>
                      <Input
                        id="requirementTitle"
                        placeholder="Enter requirement title"
                        value={newTask.taskTitle}
                        onChange={(e) => setNewTask({ ...newTask, taskTitle: e.target.value })}
                        className="w-full"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="requirementDescription">Requirement Description</Label>
                      <Input
                        id="requirementDescription"
                        placeholder="Enter requirement description"
                        value={newTask.taskDesciption}
                        onChange={(e) => setNewTask({ ...newTask, taskDesciption: e.target.value })}
                        className="w-full"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="requirementCategory">Category</Label>
                      <Select value="requirement" disabled>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Requirement" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="requirement">Requirement</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="requirementStoreName">Store</Label>
                      <Input
                        id="requirementStoreName"
                        value={visitDetail ? `${visitDetail.storeName}` : 'Loading...'}
                        disabled
                        className="w-full bg-gray-100 text-foreground font-medium cursor-not-allowed"
                      />
                    </div>
                    <div className="flex flex-col sm:flex-row justify-between gap-2 mt-4">
                      <Button variant="outline" onClick={closeRequirementModal} className="w-full sm:w-auto">Cancel</Button>
                      <Button onClick={() => setActiveRequirementTab('details')} className="w-full sm:w-auto">Next</Button>
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="details">
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="requirementDueDate">Due Date</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button 
                            variant="outline"
                            className={`w-full justify-start text-left font-normal ${!newTask.dueDate && 'text-muted-foreground'}`}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {newTask.dueDate ? format(new Date(newTask.dueDate), 'MMM dd, yyyy') : <span>Pick a date</span>}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <CalendarComponent
                            mode="single"
                            selected={newTask.dueDate ? new Date(newTask.dueDate) : undefined}
                            onSelect={(date) => setNewTask({ ...newTask, dueDate: date ? date.toISOString().split('T')[0] : '' })}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="requirementAssignedTo">Assigned To</Label>
                      <Input
                        id="requirementAssignedTo"
                        value={visitDetail ? `${visitDetail.employeeName}` : ''}
                        disabled
                        className="w-full bg-gray-100 text-foreground font-medium cursor-not-allowed"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="requirementPriority">Priority</Label>
                      <Select value={newTask.priority} onValueChange={(value) => setNewTask({ ...newTask, priority: value as Priority })}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select a priority" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {taskCreateError && (
                      <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                        {taskCreateError}
                      </div>
                    )}
                    <div className="flex flex-col sm:flex-row justify-between gap-2 mt-4">
                      <div className="flex gap-2">
                        <Button variant="outline" onClick={() => setActiveRequirementTab('general')} className="w-full sm:w-auto">Back</Button>
                        <Button variant="ghost" onClick={closeRequirementModal} className="w-full sm:w-auto">Cancel</Button>
                      </div>
                      <Button onClick={() => createTask('requirement')} disabled={isCreatingTask} className="w-full sm:w-auto">
                        {isCreatingTask && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Create Requirement
                      </Button>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Complaint Modal */}
      {isComplaintModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-2xl border-0 shadow-lg max-h-[90vh] overflow-y-auto">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg md:text-xl font-semibold text-foreground">Create Complaint</CardTitle>
              <p className="text-xs md:text-sm text-muted-foreground">Fill in the complaint details</p>
            </CardHeader>
            <CardContent>
              <Tabs value={activeComplaintTab} onValueChange={setActiveComplaintTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-4">
                  <TabsTrigger value="general">General</TabsTrigger>
                  <TabsTrigger value="details">Details</TabsTrigger>
                </TabsList>
                
                <TabsContent value="general">
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="complaintTitle">Complaint Title</Label>
                      <Input
                        id="complaintTitle"
                        placeholder="Enter complaint title"
                        value={complaintTask.taskTitle}
                        onChange={(e) => setComplaintTask({ ...complaintTask, taskTitle: e.target.value })}
                        className="w-full"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="complaintDescription">Complaint Description</Label>
                      <Input
                        id="complaintDescription"
                        placeholder="Enter complaint description"
                        value={complaintTask.taskDesciption}
                        onChange={(e) => setComplaintTask({ ...complaintTask, taskDesciption: e.target.value })}
                        className="w-full"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="complaintCategory">Category</Label>
                      <Select value="complaint" disabled>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Complaint" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="complaint">Complaint</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="complaintStoreName">Store</Label>
                      <Input
                        id="complaintStoreName"
                        value={visitDetail ? `${visitDetail.storeName}` : 'Loading...'}
                        disabled
                        className="w-full bg-gray-100 text-foreground font-medium cursor-not-allowed"
                      />
                    </div>
                    <div className="flex flex-col sm:flex-row justify-between gap-2 mt-4">
                      <Button variant="outline" onClick={closeComplaintModal} className="w-full sm:w-auto">Cancel</Button>
                      <Button onClick={() => setActiveComplaintTab('details')} className="w-full sm:w-auto">Next</Button>
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="details">
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="complaintDueDate">Due Date</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button 
                            variant="outline"
                            className={`w-full justify-start text-left font-normal ${!complaintTask.dueDate && 'text-muted-foreground'}`}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {complaintTask.dueDate ? format(new Date(complaintTask.dueDate), 'MMM dd, yyyy') : <span>Pick a date</span>}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <CalendarComponent
                            mode="single"
                            selected={complaintTask.dueDate ? new Date(complaintTask.dueDate) : undefined}
                            onSelect={(date) => setComplaintTask({ ...complaintTask, dueDate: date ? date.toISOString().split('T')[0] : '' })}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="complaintAssignedTo">Assigned To</Label>
                      <Input
                        id="complaintAssignedTo"
                        value={visitDetail ? `${visitDetail.employeeName}` : ''}
                        disabled
                        className="w-full bg-gray-100 text-foreground font-medium cursor-not-allowed"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="complaintPriority">Priority</Label>
                      <Select value={complaintTask.priority} onValueChange={(value) => setComplaintTask({ ...complaintTask, priority: value as Priority })}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select a priority" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {taskCreateError && (
                      <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                        {taskCreateError}
                      </div>
                    )}
                    <div className="flex flex-col sm:flex-row justify-between gap-2 mt-4">
                      <div className="flex gap-2">
                        <Button variant="outline" onClick={() => setActiveComplaintTab('general')} className="w-full sm:w-auto">Back</Button>
                        <Button variant="ghost" onClick={closeComplaintModal} className="w-full sm:w-auto">Cancel</Button>
                      </div>
                      <Button onClick={() => createTask('complaint')} disabled={isCreatingTask} className="w-full sm:w-auto">
                        {isCreatingTask && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Create Complaint
                      </Button>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Image Preview Modal */}
      {previewVisible && previewImage && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50" onClick={() => setPreviewVisible(false)}>
          <div className="relative max-w-4xl max-h-4xl p-4">
            <Image 
              src={previewImage} 
              alt="Preview Image" 
              width={800}
              height={600}
              className="max-w-full max-h-full object-contain"
              onClick={(e) => e.stopPropagation()}
            />
            <button
              className="absolute top-2 right-2 bg-white rounded-full p-2 hover:bg-gray-100"
              onClick={() => setPreviewVisible(false)}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
