"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  Download,
  Eye,
  Filter,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Users,
  X,
} from "lucide-react";
import { format } from "date-fns";

import { useAuth } from "@/components/auth-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ATTENDEE_CATEGORIES,
  formatMeetingStatus,
  Meeting,
  MeetingAttendee,
  MEETING_TYPES,
  meetingsApi,
} from "@/lib/meetings-api";
import { hasAdminSetupPrivileges } from "@/lib/auth";

const ALL_VALUE = "all";

const DEFAULT_FILTERS = {
  start: "",
  end: "",
  status: ALL_VALUE,
  meetingType: ALL_VALUE,
  city: "",
  state: "",
};

type MeetingRequestForm = {
  meetingType: string;
  meetingDate: string;
  meetingTime: string;
  city: string;
  state: string;
  location: string;
  customerReference: string;
  objective: string;
  expectedBudget: string;
  expectedGiftsMaterials: string;
  allowWalkInAttendees: boolean;
  remarks: string;
};

type NewMeetingStep = "request" | "attendees";

const today = () => format(new Date(), "yyyy-MM-dd");

const emptyRequestForm = (): MeetingRequestForm => ({
  meetingType: "Dealer",
  meetingDate: today(),
  meetingTime: "11:00",
  city: "",
  state: "",
  location: "",
  customerReference: "",
  objective: "",
  expectedBudget: "",
  expectedGiftsMaterials: "",
  allowWalkInAttendees: true,
  remarks: "",
});

const emptyAttendee = (): MeetingAttendee => ({
  name: "",
  mobileNumber: "",
  email: "",
  category: "mason",
  cityArea: "",
  companyShopProject: "",
  expected: true,
  categoryDetails: "",
  remarks: "",
});

const formatCurrency = (amount?: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(amount || 0));

const formatDate = (value?: string) => {
  if (!value) return "-";
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return format(parsed, "dd MMM yyyy");
};

const statusBadgeClass = (status?: string) => {
  switch (status) {
    case "APPROVED":
      return "border-blue-200 bg-blue-50 text-blue-700";
    case "PENDING_APPROVAL":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "EXECUTED":
    case "EXPENSE_SUBMITTED":
    case "REPORT_SUBMITTED":
      return "border-purple-200 bg-purple-50 text-purple-700";
    case "CLOSED":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "REJECTED":
    case "CANCELLED":
      return "border-red-200 bg-red-50 text-red-700";
    case "CORRECTION_REQUIRED":
      return "border-orange-200 bg-orange-50 text-orange-700";
    default:
      return "border-slate-200 bg-slate-50 text-slate-700";
  }
};

const normaliseMobile = (value: string) => value.replace(/\D/g, "");

const getValidAttendees = (attendees: MeetingAttendee[]) =>
  attendees
    .map((attendee) => ({
      ...attendee,
      name: attendee.name.trim(),
      mobileNumber: normaliseMobile(attendee.mobileNumber),
      email: attendee.email?.trim() || undefined,
      cityArea: attendee.cityArea?.trim() || undefined,
      companyShopProject: attendee.companyShopProject?.trim() || undefined,
      categoryDetails: attendee.categoryDetails?.trim() || undefined,
      remarks: attendee.remarks?.trim() || undefined,
      expected: true,
    }))
    .filter((attendee) => attendee.name || attendee.mobileNumber);

const getDuplicateMobileError = (attendees: MeetingAttendee[]) => {
  const seen = new Set<string>();
  for (const attendee of attendees) {
    const mobile = normaliseMobile(attendee.mobileNumber || "");
    if (!mobile) continue;
    if (seen.has(mobile)) {
      return `Mobile number ${mobile} is already added in this meeting.`;
    }
    seen.add(mobile);
  }
  return null;
};

function NewMeetingDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}) {
  const router = useRouter();
  const { userData } = useAuth();
  const [step, setStep] = useState<NewMeetingStep>("request");
  const [form, setForm] = useState<MeetingRequestForm>(() => emptyRequestForm());
  const [attendees, setAttendees] = useState<MeetingAttendee[]>([emptyAttendee()]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const creatorId = userData?.employeeId;
  const validAttendees = useMemo(() => getValidAttendees(attendees), [attendees]);

  const reset = () => {
    setStep("request");
    setForm(emptyRequestForm());
    setAttendees([emptyAttendee()]);
    setError(null);
    setIsSaving(false);
  };

  const close = (nextOpen: boolean) => {
    if (isSaving) return;
    onOpenChange(nextOpen);
    if (!nextOpen) reset();
  };

  const updateForm = <K extends keyof MeetingRequestForm>(key: K, value: MeetingRequestForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const updateAttendee = <K extends keyof MeetingAttendee>(
    index: number,
    key: K,
    value: MeetingAttendee[K]
  ) => {
    setAttendees((prev) =>
      prev.map((attendee, currentIndex) =>
        currentIndex === index ? { ...attendee, [key]: value } : attendee
      )
    );
  };

  const validateRequest = () => {
    if (!creatorId) return "Creator employee id was not found for this login.";
    if (!form.meetingType) return "Select a meeting type.";
    if (!form.meetingDate) return "Select a meeting date.";
    if (!form.meetingTime) return "Select a meeting time.";
    if (!form.city.trim()) return "Enter the meeting city.";
    if (!form.state.trim()) return "Enter the meeting state.";
    if (!form.location.trim()) return "Enter the meeting location.";
    if (!form.objective.trim()) return "Enter the purpose or objective.";
    const budget = Number(form.expectedBudget);
    if (!Number.isFinite(budget) || budget < 0) return "Enter a valid expected budget.";
    return null;
  };

  const validateAttendeesForSubmit = () => {
    if (validAttendees.length === 0) {
      return "Add at least one expected attendee before submitting for approval.";
    }

    const duplicateError = getDuplicateMobileError(validAttendees);
    if (duplicateError) return duplicateError;

    const incomplete = validAttendees.find((attendee) => !attendee.name || !attendee.mobileNumber || !attendee.category);
    if (incomplete) {
      return "Each attendee needs a name, mobile number, and category.";
    }

    return null;
  };

  const createMeeting = async (submitForApproval: boolean) => {
    const requestError = validateRequest();
    if (requestError) {
      setError(requestError);
      setStep("request");
      return;
    }

    if (submitForApproval) {
      const attendeeError = validateAttendeesForSubmit();
      if (attendeeError) {
        setError(attendeeError);
        setStep("attendees");
        return;
      }
    } else {
      const duplicateError = getDuplicateMobileError(validAttendees);
      if (duplicateError) {
        setError(duplicateError);
        setStep("attendees");
        return;
      }
    }

    setError(null);
    setIsSaving(true);
    try {
      const meetingId = await meetingsApi.createMeeting({
        meetingType: form.meetingType,
        creatorId: creatorId as number,
        meetingDate: form.meetingDate,
        meetingTime: `${form.meetingTime}:00`,
        city: form.city.trim(),
        state: form.state.trim(),
        location: form.location.trim(),
        customerReference: form.customerReference.trim() || undefined,
        expectedAttendees: validAttendees.length,
        objective: form.objective.trim(),
        expectedBudget: Number(form.expectedBudget || 0),
        expectedGiftsMaterials: form.expectedGiftsMaterials.trim() || undefined,
        allowWalkInAttendees: form.allowWalkInAttendees,
        remarks: form.remarks.trim() || undefined,
      });

      if (validAttendees.length > 0) {
        await meetingsApi.saveExpectedAttendees(meetingId, validAttendees);
      }

      if (submitForApproval) {
        await meetingsApi.submitForApproval(meetingId);
      }

      onCreated();
      close(false);
      router.push(`/dashboard/meetings/${meetingId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create meeting.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>New Meeting</DialogTitle>
          <DialogDescription>
            Create the request first, then add expected attendees before submitting for approval.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant={step === "request" ? "default" : "outline"}
            size="sm"
            onClick={() => setStep("request")}
          >
            1. Request
          </Button>
          <Button
            type="button"
            variant={step === "attendees" ? "default" : "outline"}
            size="sm"
            onClick={() => setStep("attendees")}
          >
            2. Expected Attendees
          </Button>
        </div>

        {step === "request" ? (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Meeting type</Label>
              <Select value={form.meetingType} onValueChange={(value) => updateForm("meetingType", value)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MEETING_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Expected budget</Label>
              <Input
                type="number"
                min="0"
                value={form.expectedBudget}
                onChange={(event) => updateForm("expectedBudget", event.target.value)}
                placeholder="15000"
              />
            </div>
            <div className="space-y-2">
              <Label>Date</Label>
              <Input
                type="date"
                value={form.meetingDate}
                onChange={(event) => updateForm("meetingDate", event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Time</Label>
              <Input
                type="time"
                value={form.meetingTime}
                onChange={(event) => updateForm("meetingTime", event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>City</Label>
              <Input value={form.city} onChange={(event) => updateForm("city", event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>State</Label>
              <Input value={form.state} onChange={(event) => updateForm("state", event.target.value)} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Location</Label>
              <Input value={form.location} onChange={(event) => updateForm("location", event.target.value)} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Dealer / counter / customer reference</Label>
              <Input
                value={form.customerReference}
                onChange={(event) => updateForm("customerReference", event.target.value)}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Purpose / objective</Label>
              <Textarea
                value={form.objective}
                onChange={(event) => updateForm("objective", event.target.value)}
                placeholder="What should this meeting achieve?"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Expected gifts / materials</Label>
              <Textarea
                value={form.expectedGiftsMaterials}
                onChange={(event) => updateForm("expectedGiftsMaterials", event.target.value)}
                placeholder="Catalogs, diaries, sample material"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Remarks</Label>
              <Textarea value={form.remarks} onChange={(event) => updateForm("remarks", event.target.value)} />
            </div>
            <label className="flex items-center gap-2 rounded-md border p-3 text-sm md:col-span-2">
              <Checkbox
                checked={form.allowWalkInAttendees}
                onCheckedChange={(checked) => updateForm("allowWalkInAttendees", checked === true)}
              />
              Allow walk-in attendees during execution
            </label>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-medium">Expected attendees</h3>
                <p className="text-xs text-muted-foreground">
                  {validAttendees.length} attendee{validAttendees.length === 1 ? "" : "s"} will be saved on the request.
                </p>
              </div>
              <Button type="button" size="sm" variant="outline" onClick={() => setAttendees((prev) => [...prev, emptyAttendee()])}>
                <Plus className="h-4 w-4" />
                Add
              </Button>
            </div>

            {attendees.map((attendee, index) => (
              <div key={index} className="rounded-lg border p-3">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <span className="text-sm font-medium">Attendee {index + 1}</span>
                  {attendees.length > 1 && (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => setAttendees((prev) => prev.filter((_, currentIndex) => currentIndex !== index))}
                    >
                      Remove
                    </Button>
                  )}
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Name</Label>
                    <Input value={attendee.name} onChange={(event) => updateAttendee(index, "name", event.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Mobile number</Label>
                    <Input
                      value={attendee.mobileNumber}
                      onChange={(event) => updateAttendee(index, "mobileNumber", event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select value={attendee.category} onValueChange={(value) => updateAttendee(index, "category", value)}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ATTENDEE_CATEGORIES.map((category) => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>City / area</Label>
                    <Input value={attendee.cityArea || ""} onChange={(event) => updateAttendee(index, "cityArea", event.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Company / shop / project</Label>
                    <Input
                      value={attendee.companyShopProject || ""}
                      onChange={(event) => updateAttendee(index, "companyShopProject", event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input value={attendee.email || ""} onChange={(event) => updateAttendee(index, "email", event.target.value)} />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>Remarks</Label>
                    <Input value={attendee.remarks || ""} onChange={(event) => updateAttendee(index, "remarks", event.target.value)} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <DialogFooter className="gap-2 sm:justify-between">
          <Button type="button" variant="outline" onClick={() => close(false)} disabled={isSaving}>
            Cancel
          </Button>
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            {step === "request" ? (
              <Button type="button" onClick={() => setStep("attendees")} disabled={isSaving}>
                Continue
              </Button>
            ) : (
              <>
                <Button type="button" variant="outline" onClick={() => createMeeting(false)} disabled={isSaving}>
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Save Draft
                </Button>
                <Button type="button" onClick={() => createMeeting(true)} disabled={isSaving}>
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Submit for Approval
                </Button>
              </>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function MeetingsList() {
  const router = useRouter();
  const { userRole, currentUser } = useAuth();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isNewMeetingOpen, setIsNewMeetingOpen] = useState(false);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const isAdmin = hasAdminSetupPrivileges(userRole, currentUser);

  const loadMeetings = async (appliedFilters = filters) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await meetingsApi.getMeetings({
        start: appliedFilters.start || undefined,
        end: appliedFilters.end || undefined,
        status: appliedFilters.status === ALL_VALUE ? undefined : appliedFilters.status,
        meetingType: appliedFilters.meetingType === ALL_VALUE ? undefined : appliedFilters.meetingType,
        city: appliedFilters.city.trim() || undefined,
        state: appliedFilters.state.trim() || undefined,
      });
      setMeetings(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load meetings.");
    } finally {
      setIsLoading(false);
    }
  };

  const activeFilterCount = useMemo(() => {
    return [
      search.trim(),
      filters.start,
      filters.end,
      filters.status !== ALL_VALUE ? filters.status : "",
      filters.meetingType !== ALL_VALUE ? filters.meetingType : "",
      filters.city.trim(),
      filters.state.trim(),
    ].filter(Boolean).length;
  }, [filters, search]);

  const clearFilters = () => {
    setSearch("");
    setFilters(DEFAULT_FILTERS);
    loadMeetings(DEFAULT_FILTERS);
  };

  useEffect(() => {
    loadMeetings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredMeetings = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return meetings;

    return meetings.filter((meeting) =>
      [
        meeting.meetingType,
        meeting.status,
        meeting.city,
        meeting.state,
        meeting.location,
        meeting.creatorName,
        meeting.objective,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term))
    );
  }, [meetings, search]);

  const stats = useMemo(() => {
    const pending = meetings.filter((meeting) => meeting.status === "PENDING_APPROVAL").length;
    const scheduled = meetings.filter((meeting) => meeting.status === "APPROVED").length;
    const completed = meetings.filter((meeting) => meeting.status === "CLOSED" || meeting.status === "REPORT_SUBMITTED").length;
    return { total: meetings.length, pending, scheduled, completed };
  }, [meetings]);

  const exportCsv = () => {
    const rows = filteredMeetings.map((meeting) => ({
      id: meeting.id,
      type: meeting.meetingType,
      status: formatMeetingStatus(meeting.status),
      date: meeting.meetingDate || "",
      time: meeting.meetingTime || "",
      city: meeting.city || "",
      state: meeting.state || "",
      creator: meeting.creatorName || "",
      budget: meeting.expectedBudget || 0,
      attendees: meeting.attendees?.length || 0,
      gifts: meeting.gifts?.length || 0,
      expenses: meeting.expenses?.reduce((sum, expense) => sum + Number(expense.amount || 0), 0) || 0,
    }));

    const headers = Object.keys(rows[0] || {
      id: "",
      type: "",
      status: "",
      date: "",
      time: "",
      city: "",
      state: "",
      creator: "",
      budget: "",
      attendees: "",
      gifts: "",
      expenses: "",
    });
    const csv = [
      headers.join(","),
      ...rows.map((row) => headers.map((header) => `"${String(row[header as keyof typeof row] ?? "").replace(/"/g, '""')}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `meetings-${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="outline" onClick={() => loadMeetings()} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button variant="outline" onClick={() => setIsFiltersOpen((open) => !open)}>
            <Filter className="h-4 w-4" />
            Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
          </Button>
          <Button variant="outline" onClick={exportCsv} disabled={filteredMeetings.length === 0}>
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
          {!isAdmin && (
            <Button onClick={() => setIsNewMeetingOpen(true)}>
              <Plus className="h-4 w-4" />
              New Meeting
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{stats.total}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Approval</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{stats.pending}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Scheduled</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{stats.scheduled}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Final Review / Closed</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{stats.completed}</CardContent>
        </Card>
      </div>

      {isFiltersOpen && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3 pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Filter className="h-4 w-4" />
              Filters
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={() => setIsFiltersOpen(false)}>
              <X className="h-4 w-4" />
              <span className="sr-only">Close filters</span>
            </Button>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-6">
            <div className="space-y-2 md:col-span-2">
              <Label>Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input className="pl-9" value={search} onChange={(event) => setSearch(event.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Start</Label>
              <Input type="date" value={filters.start} onChange={(event) => setFilters((prev) => ({ ...prev, start: event.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>End</Label>
              <Input type="date" value={filters.end} onChange={(event) => setFilters((prev) => ({ ...prev, end: event.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={filters.status} onValueChange={(value) => setFilters((prev) => ({ ...prev, status: value }))}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_VALUE}>All statuses</SelectItem>
                  {[
                    "DRAFT",
                    "PENDING_APPROVAL",
                    "APPROVED",
                    "EXECUTED",
                    "EXPENSE_SUBMITTED",
                    "REPORT_SUBMITTED",
                    "CLOSED",
                    "CORRECTION_REQUIRED",
                    "REJECTED",
                    "CANCELLED",
                  ].map((status) => (
                    <SelectItem key={status} value={status}>
                      {formatMeetingStatus(status)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={filters.meetingType} onValueChange={(value) => setFilters((prev) => ({ ...prev, meetingType: value }))}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_VALUE}>All types</SelectItem>
                  {MEETING_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>City</Label>
              <Input value={filters.city} onChange={(event) => setFilters((prev) => ({ ...prev, city: event.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>State</Label>
              <Input value={filters.state} onChange={(event) => setFilters((prev) => ({ ...prev, state: event.target.value }))} />
            </div>
            <div className="flex flex-wrap items-end gap-2 md:col-span-4">
              <Button onClick={() => loadMeetings()} disabled={isLoading}>
                Apply Filters
              </Button>
              <Button variant="outline" onClick={clearFilters} disabled={isLoading || activeFilterCount === 0}>
                Clear Filters
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {error && <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex min-h-64 items-center justify-center text-muted-foreground">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Loading meetings
            </div>
          ) : filteredMeetings.length === 0 ? (
            <div className="flex min-h-64 flex-col items-center justify-center gap-2 p-6 text-center text-muted-foreground">
              <CalendarDays className="h-8 w-8" />
              <div>No meetings found</div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Meeting</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Budget</TableHead>
                  <TableHead>Attendees</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMeetings.map((meeting) => (
                  <TableRow key={meeting.id}>
                    <TableCell>
                      <div className="font-medium">{meeting.meetingType}</div>
                      <div className="max-w-[260px] truncate text-xs text-muted-foreground">
                        {meeting.objective || meeting.customerReference || `Meeting #${meeting.id}`}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>{formatDate(meeting.meetingDate)}</div>
                      <div className="text-xs text-muted-foreground">{meeting.meetingTime || ""}</div>
                    </TableCell>
                    <TableCell>
                      <div>{meeting.city || "-"}</div>
                      <div className="text-xs text-muted-foreground">{meeting.state || meeting.location || ""}</div>
                    </TableCell>
                    <TableCell>{meeting.creatorName || "-"}</TableCell>
                    <TableCell>{formatCurrency(meeting.expectedBudget)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        {meeting.attendees?.length || meeting.expectedAttendees || 0}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={statusBadgeClass(meeting.status)}>
                        {formatMeetingStatus(meeting.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" onClick={() => router.push(`/dashboard/meetings/${meeting.id}`)}>
                        <Eye className="h-4 w-4" />
                        Open
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {!isAdmin && <NewMeetingDialog open={isNewMeetingOpen} onOpenChange={setIsNewMeetingOpen} onCreated={loadMeetings} />}
    </div>
  );
}
