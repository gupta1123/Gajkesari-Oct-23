"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  Filter,
  Info,
  Loader2,
  Plus,
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  ATTENDEE_CATEGORIES,
  formatMeetingStatus,
  MeetingConfigItem,
  getMeetingStatusLabel,
  Meeting,
  MeetingAttendee,
  MeetingPage,
  MEETING_TYPES,
  meetingsApi,
} from "@/lib/meetings-api";
import { hasAdminSetupPrivileges } from "@/lib/auth";
import { formatTimeTo12Hour } from "@/lib/utils";
import { DateRangeError, isDateRangeInvalid } from "@/components/date-range-error";

const ALL_VALUE = "all";

const DEFAULT_FILTERS = {
  start: "",
  end: "",
  status: ALL_VALUE,
  meetingType: ALL_VALUE,
  dealer: "",
  owner: "",
  overBudget: ALL_VALUE,
  city: "",
  state: "",
};

const DEFAULT_PAGE_SIZE = 10;

type StatusOption = {
  status: string;
  label: string;
};

type BackendStatusOption =
  | string
  | {
      status?: string;
      value?: string;
      code?: string;
      label?: string;
      statusLabel?: string;
      displayLabel?: string;
      stageLabel?: string;
      name?: string;
    };

const normalizeStatusOption = (item: BackendStatusOption): StatusOption | null => {
  if (typeof item === "string") {
    const status = item.trim();
    return status ? { status, label: formatMeetingStatus(status) } : null;
  }

  const status = String(item.status || item.value || item.code || "").trim();
  if (!status) return null;

  const label = String(
    item.label || item.statusLabel || item.displayLabel || item.stageLabel || item.name || formatMeetingStatus(status)
  ).trim();

  return { status, label: label || formatMeetingStatus(status) };
};

type MeetingRequestForm = {
  meetingType: string;
  meetingDate: string;
  meetingTime: string;
  city: string;
  state: string;
  location: string;
  customerReference: string;
  expectedAttendees: string;
  expectedBudget: string;
  companyContribution: string;
  allowWalkInAttendees: boolean;
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
  expectedAttendees: "",
  expectedBudget: "",
  companyContribution: "",
  allowWalkInAttendees: true,
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
  return format(parsed, "MMM dd, yyyy");
};

const statusBadgeClass = (status?: string) => {
  switch (status) {
    case "APPROVED":
      return "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300";
    case "PENDING_APPROVAL":
      return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300";
    case "EXECUTED":
    case "EXPENSE_SUBMITTED":
    case "REPORT_SUBMITTED":
      return "border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-900 dark:bg-purple-950/40 dark:text-purple-300";
    case "CLOSED":
      return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300";
    case "REJECTED":
    case "CANCELLED":
      return "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300";
    case "CORRECTION_REQUIRED":
      return "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-900 dark:bg-orange-950/40 dark:text-orange-300";
    default:
      return "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300";
  }
};

const ACTUAL_SUMMARY_STATUSES = new Set(["EXECUTED", "EXPENSE_SUBMITTED", "REPORT_SUBMITTED", "CLOSED"]);

const normaliseMobile = (value: string) => value.replace(/\D/g, "");
const formatMeetingTime = (value?: string) => (value ? formatTimeTo12Hour(value) || value : "");

const MEETING_STAGE_GUIDE = [
  {
    phase: "Phase 1: Preparation",
    stage: "Draft",
    meaning: "The field team is still preparing the meeting request. The plan may be incomplete and has not been submitted.",
    adminAction: "No approval action is needed yet.",
    tone: "normal",
  },
  {
    phase: "Phase 2: Authorization",
    stage: "Submitted for Approval",
    meaning: "The complete meeting plan has been submitted for an admin or manager decision.",
    adminAction: "Review the dealer, expected people, named attendees, budget, planned expenses, gifts, and contribution. Approve, reject, or request correction.",
    tone: "normal",
  },
  {
    phase: "Phase 3: Schedule Locked",
    stage: "Scheduled",
    meaning: "The meeting is scheduled and the field team can execute it.",
    adminAction: "Monitor only. Execution is handled by the field team.",
    tone: "normal",
  },
  {
    phase: "Phase 4: Post-Meeting Review",
    stage: "Meeting Conducted",
    meaning: "The meeting happened and final attendance is available. Gifts and expenses may still be in progress.",
    adminAction: "Monitor completion. Gift and expense differences are final only after each section is completed or marked as none.",
    tone: "normal",
  },
  {
    phase: "Phase 5: Financial Reconciliation",
    stage: "Expenses Submitted",
    meaning: "Attendance, gifts, and expenses are finalized. The meeting now waits for the field team's final report.",
    adminAction: "Review the completed gift and expense records if needed. No final decision is required until the report is submitted.",
    tone: "normal",
  },
  {
    phase: "Phase 6: Final Review",
    stage: "Submitted for Final Review",
    meaning: "The final report and plan-versus-actual results are ready for admin review.",
    adminAction: "Approve and close the meeting, or request correction for the specific attendance, gifts, expenses, leads, or final-report section.",
    tone: "normal",
  },
  {
    phase: "Phase 7: Complete",
    stage: "Closed",
    meaning: "The final report has been approved and the workflow is complete.",
    adminAction: "The record is read-only. View the outcome, comparisons, history, or export the final record.",
    tone: "normal",
  },
  {
    phase: "Exception: Correction",
    stage: "Correction Required",
    meaning: "A specific request or post-meeting section has been sent back to the field team.",
    adminAction: "The detail page opens the requested section and keeps the correct planning or actual context. Wait for the field team to correct and resubmit it.",
    tone: "warning",
  },
  {
    phase: "Exception: Rejected",
    stage: "Rejected",
    meaning: "The submitted request was rejected and cannot continue through execution.",
    adminAction: "Open the meeting to view the rejection reason and decision history.",
    tone: "danger",
  },
  {
    phase: "Exception: Cancelled",
    stage: "Cancelled",
    meaning: "The meeting was cancelled before execution and will not continue.",
    adminAction: "Open the meeting to view the cancellation reason and decision history.",
    tone: "danger",
  },
];

const workflowToneClasses = (tone?: string) => {
  if (tone === "warning") {
    return {
      card: "border-amber-500/30 bg-amber-500/10",
      label: "text-amber-600 dark:text-amber-400",
    };
  }

  if (tone === "danger") {
    return {
      card: "border-destructive/30 bg-destructive/10",
      label: "text-destructive",
    };
  }

  return {
    card: "border-primary/30 bg-primary/10",
    label: "text-primary",
  };
};

const getValidAttendees = (attendees: MeetingAttendee[]) =>
  attendees
    .map((attendee) => ({
      ...attendee,
      name: attendee.name.trim(),
      mobileNumber: normaliseMobile(attendee.mobileNumber),
      email: (attendee.email || "").trim(),
      cityArea: (attendee.cityArea || "").trim(),
      companyShopProject: (attendee.companyShopProject || "").trim(),
      categoryDetails: (attendee.categoryDetails || "").trim(),
      remarks: (attendee.remarks || "").trim(),
    }))
    .filter((attendee) => Boolean(attendee.name || attendee.mobileNumber || attendee.companyShopProject));

const getDuplicateMobileError = (attendees: MeetingAttendee[]) => {
  const seenMobiles = new Set<string>();
  for (const attendee of attendees) {
    if (attendee.mobileNumber) {
      if (seenMobiles.has(attendee.mobileNumber)) {
        return `Duplicate mobile number detected (${attendee.mobileNumber}). Each attendee must have a unique mobile number.`;
      }
      seenMobiles.add(attendee.mobileNumber);
    }
  }
  return null;
};

type NewMeetingDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  meetingTypes: string[];
  onCreated: () => void;
  canCreateOnBehalf?: boolean;
  creatorId?: number;
};

function NewMeetingDialog({
  open,
  onOpenChange,
  meetingTypes,
  onCreated,
  canCreateOnBehalf = false,
  creatorId,
}: NewMeetingDialogProps) {
  const router = useRouter();
  const [step, setStep] = useState<NewMeetingStep>("request");
  const [form, setForm] = useState<MeetingRequestForm>(emptyRequestForm());
  const [attendees, setAttendees] = useState<MeetingAttendee[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUserChanges, setHasUserChanges] = useState(false);

  const reset = () => {
    setForm(emptyRequestForm());
    setAttendees([]);
    setError(null);
    setStep("request");
    setHasUserChanges(false);
  };

  const updateForm = <K extends keyof MeetingRequestForm>(field: K, value: MeetingRequestForm[K]) => {
    setHasUserChanges(true);
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const updateAttendee = <K extends keyof MeetingAttendee>(
    index: number,
    field: K,
    value: MeetingAttendee[K]
  ) => {
    setHasUserChanges(true);
    setAttendees((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  const validAttendees = useMemo(() => getValidAttendees(attendees), [attendees]);

  const dealerContribution = useMemo(() => {
    const budget = Number(form.expectedBudget || 0);
    const company = Number(form.companyContribution || 0);
    if (!Number.isFinite(budget) || !Number.isFinite(company)) return "0";
    return String(Math.max(0, budget - company));
  }, [form.companyContribution, form.expectedBudget]);

  const companyContribution = Number(form.companyContribution || 0);

  const close = (confirmed = false) => {
    if (!confirmed && hasUserChanges) {
      if (!window.confirm("You have unsaved changes. Are you sure you want to exit?")) {
        return;
      }
    }
    reset();
    onOpenChange(false);
  };

  const validateRequest = () => {
    if (!form.meetingType) return "Select a meeting type.";
    if (!form.meetingDate) return "Select a meeting date.";
    if (!form.meetingTime) return "Select a meeting time.";
    if (!form.city.trim()) return "Enter the meeting city.";
    if (!form.state.trim()) return "Enter the meeting state.";
    if (!form.location.trim()) return "Enter the meeting location.";
    const budget = Number(form.expectedBudget);
    if (!Number.isFinite(budget) || budget < 0) return "Enter a valid expected budget.";
    const contribution = Number(form.companyContribution || 0);
    if (!Number.isFinite(contribution) || contribution < 0 || contribution > budget) {
      return "Company contribution must be between 0 and the expected budget.";
    }
    const expectedPeople = Number(form.expectedAttendees || validAttendees.length);
    if (!Number.isFinite(expectedPeople) || expectedPeople < validAttendees.length) {
      return "Expected people cannot be lower than named attendees.";
    }
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
    if (submitForApproval) {
      const requestError = validateRequest();
      if (requestError) {
        setError(requestError);
        setStep("request");
        return;
      }

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
        ...(canCreateOnBehalf && creatorId ? { creatorId } : {}),
        meetingDate: form.meetingDate || undefined,
        meetingTime: form.meetingTime ? `${form.meetingTime}:00` : undefined,
        city: form.city.trim() || undefined,
        state: form.state.trim() || undefined,
        location: form.location.trim() || undefined,
        customerReference: form.customerReference.trim() || undefined,
        expectedAttendees: Number(form.expectedAttendees || validAttendees.length || 0),
        expectedBudget: Number(form.expectedBudget || 0),
        allowWalkInAttendees: form.allowWalkInAttendees,
        plan: {
          expectedBudget: Number(form.expectedBudget || 0),
          companyContribution,
          dealerContribution: Math.max(0, Number(form.expectedBudget || 0) - companyContribution),
        },
        attendees: validAttendees,
      });

      if (submitForApproval) {
        await meetingsApi.submitForApproval(meetingId);
      }

      onCreated();
      setHasUserChanges(false);
      onOpenChange(false);
      reset();
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
          <DialogTitle className="text-base font-semibold">New Meeting</DialogTitle>
          <DialogDescription className="text-xs">
            Create the request first, then add named attendees before submitting for approval.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant={step === "request" ? "default" : "outline"}
            size="sm"
            className="h-8 text-xs"
            onClick={() => setStep("request")}
          >
            1. Request
          </Button>
          <Button
            type="button"
            variant={step === "attendees" ? "default" : "outline"}
            size="sm"
            className="h-8 text-xs"
            onClick={() => setStep("attendees")}
          >
            2. Named Attendees
          </Button>
        </div>

        {step === "request" ? (
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-foreground">Meeting type</Label>
              <Select value={form.meetingType} onValueChange={(value) => updateForm("meetingType", value)}>
                <SelectTrigger className="h-9 w-full bg-background text-xs shadow-none">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="text-xs">
                  {meetingTypes.map((type) => (
                    <SelectItem key={type} value={type} className="text-xs">
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-foreground">Expected budget</Label>
              <Input
                type="number"
                min="0"
                className="h-9 text-xs bg-background shadow-none"
                value={form.expectedBudget}
                onChange={(event) => updateForm("expectedBudget", event.target.value)}
                placeholder="15000"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-foreground">Expected people</Label>
              <Input
                type="number"
                min="0"
                className="h-9 text-xs bg-background shadow-none"
                value={form.expectedAttendees}
                onChange={(event) => updateForm("expectedAttendees", event.target.value)}
                placeholder="40"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-foreground">Company contribution</Label>
              <Input
                type="number"
                min="0"
                max={form.expectedBudget || undefined}
                className="h-9 text-xs bg-background shadow-none"
                value={form.companyContribution}
                onChange={(event) => updateForm("companyContribution", event.target.value)}
                placeholder="0"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-foreground">Dealer contribution</Label>
              <Input className="h-9 text-xs bg-muted/40 shadow-none" value={dealerContribution} readOnly aria-readonly="true" />
              <p className="text-[11px] text-muted-foreground">Calculated from expected budget minus company contribution.</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-foreground">Date</Label>
              <Input
                type="date"
                className="h-9 text-xs bg-background shadow-none"
                value={form.meetingDate}
                onChange={(event) => updateForm("meetingDate", event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-foreground">Time</Label>
              <Input
                type="time"
                className="h-9 text-xs bg-background shadow-none"
                value={form.meetingTime}
                onChange={(event) => updateForm("meetingTime", event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-foreground">City</Label>
              <Input className="h-9 text-xs bg-background shadow-none" value={form.city} onChange={(event) => updateForm("city", event.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-foreground">State</Label>
              <Input className="h-9 text-xs bg-background shadow-none" value={form.state} onChange={(event) => updateForm("state", event.target.value)} />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label className="text-xs font-medium text-foreground">Location</Label>
              <Input className="h-9 text-xs bg-background shadow-none" value={form.location} onChange={(event) => updateForm("location", event.target.value)} />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label className="text-xs font-medium text-foreground">Dealer / counter / customer reference</Label>
              <Input
                className="h-9 text-xs bg-background shadow-none"
                value={form.customerReference}
                onChange={(event) => updateForm("customerReference", event.target.value)}
              />
            </div>
            <label className="flex items-center gap-2 rounded-md border p-3 text-xs md:col-span-2 cursor-pointer">
              <Checkbox
                checked={form.allowWalkInAttendees}
                onCheckedChange={(checked) => updateForm("allowWalkInAttendees", checked === true)}
              />
              Allow walk-in attendees during execution
            </label>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-xs font-semibold text-foreground">Named attendees</h3>
                <p className="text-[11px] text-muted-foreground">
                  {validAttendees.length} attendee{validAttendees.length === 1 ? "" : "s"} will be saved on the request.
                </p>
              </div>
              <Button type="button" size="sm" variant="outline" className="h-8 text-xs" onClick={() => {
                setHasUserChanges(true);
                setAttendees((prev) => [...prev, emptyAttendee()]);
              }}>
                <Plus className="mr-1 h-3.5 w-3.5" />
                Add
              </Button>
            </div>

            {attendees.map((attendee, index) => (
              <div key={index} className="rounded-lg border p-3 space-y-3">
                <div className="flex items-center justify-between gap-3 border-b pb-2">
                  <span className="text-xs font-semibold text-foreground">Attendee {index + 1}</span>
                  {attendees.length > 1 && (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs text-destructive hover:bg-destructive/10"
                      onClick={() => {
                        setHasUserChanges(true);
                        setAttendees((prev) => prev.filter((_, currentIndex) => currentIndex !== index));
                      }}
                    >
                      Remove
                    </Button>
                  )}
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-foreground">Name</Label>
                    <Input className="h-9 text-xs bg-background shadow-none" value={attendee.name} onChange={(event) => updateAttendee(index, "name", event.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-foreground">Mobile number</Label>
                    <Input
                      className="h-9 text-xs bg-background shadow-none"
                      value={attendee.mobileNumber}
                      onChange={(event) => updateAttendee(index, "mobileNumber", event.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-foreground">Category</Label>
                    <Select value={attendee.category} onValueChange={(value) => updateAttendee(index, "category", value)}>
                      <SelectTrigger className="h-9 w-full bg-background text-xs shadow-none">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="text-xs">
                        {ATTENDEE_CATEGORIES.map((category) => (
                          <SelectItem key={category} value={category} className="text-xs">
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-foreground">City / area</Label>
                    <Input className="h-9 text-xs bg-background shadow-none" value={attendee.cityArea || ""} onChange={(event) => updateAttendee(index, "cityArea", event.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-foreground">Company / shop / project</Label>
                    <Input
                      className="h-9 text-xs bg-background shadow-none"
                      value={attendee.companyShopProject || ""}
                      onChange={(event) => updateAttendee(index, "companyShopProject", event.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-foreground">Email</Label>
                    <Input className="h-9 text-xs bg-background shadow-none" value={attendee.email || ""} onChange={(event) => updateAttendee(index, "email", event.target.value)} />
                  </div>
                  <div className="space-y-1.5 md:col-span-2">
                    <Label className="text-xs font-medium text-foreground">Remarks</Label>
                    <Input className="h-9 text-xs bg-background shadow-none" value={attendee.remarks || ""} onChange={(event) => updateAttendee(index, "remarks", event.target.value)} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
            {error}
          </div>
        )}

        <DialogFooter className="gap-2 sm:justify-between">
          <Button type="button" variant="outline" size="sm" className="h-9 text-xs" onClick={() => close(false)} disabled={isSaving}>
            Cancel
          </Button>
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            {step === "request" ? (
              <Button type="button" size="sm" className="h-9 text-xs" onClick={() => setStep("attendees")} disabled={isSaving}>
                Continue
              </Button>
            ) : (
              <>
                <Button type="button" variant="outline" size="sm" className="h-9 text-xs" onClick={() => createMeeting(false)} disabled={isSaving}>
                  {isSaving ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
                  Save Draft
                </Button>
                <Button type="button" size="sm" className="h-9 text-xs" onClick={() => createMeeting(true)} disabled={isSaving}>
                  {isSaving ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
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
  const [pageInfo, setPageInfo] = useState<MeetingPage<Meeting> | null>(null);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [meetingTypes, setMeetingTypes] = useState<string[]>([...MEETING_TYPES]);
  const [statusOptions, setStatusOptions] = useState<StatusOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [isNewMeetingOpen, setIsNewMeetingOpen] = useState(false);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [isWorkflowInfoOpen, setIsWorkflowInfoOpen] = useState(false);
  const [workflowGuideStep, setWorkflowGuideStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const dateRangeInvalid = isDateRangeInvalid(filters.start, filters.end);
  const isAdmin = hasAdminSetupPrivileges(userRole, currentUser);

  const backendFiltersFor = (appliedFilters = filters) => ({
    start: appliedFilters.start || undefined,
    end: appliedFilters.end || undefined,
    status: appliedFilters.status === ALL_VALUE ? undefined : appliedFilters.status,
    meetingType: appliedFilters.meetingType === ALL_VALUE ? undefined : appliedFilters.meetingType,
    city: appliedFilters.city.trim() || undefined,
    state: appliedFilters.state.trim() || undefined,
  });

  const loadMeetings = async (appliedFilters = filters, page = 0, size = pageSize) => {
    if (isDateRangeInvalid(appliedFilters.start, appliedFilters.end)) return;
    setIsLoading(true);
    setError(null);
    try {
      const backendFilters = backendFiltersFor(appliedFilters);
      const data = await meetingsApi.getMeetingsPage({
        ...backendFilters,
        page,
        size,
      });
      setMeetings(data.content);
      setPageInfo(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load meetings.");
    } finally {
      setIsLoading(false);
    }
  };

  const loadConfig = async () => {
    const normalizeConfig = (items: MeetingConfigItem[] | string[] | undefined, fallback: readonly string[]) => {
      if (!items?.length) return [...fallback];
      const names = items
        .map((item) => (typeof item === "string" ? item : item.active === false ? "" : item.name))
        .map((name) => name.trim())
        .filter(Boolean);
      return names.length ? Array.from(new Set(names)) : [...fallback];
    };

    meetingsApi
      .getMeetingTypes()
      .then((items) => setMeetingTypes(normalizeConfig(items, MEETING_TYPES)))
      .catch(() => setMeetingTypes([...MEETING_TYPES]));

    meetingsApi
      .getStatuses()
      .then((items) => {
        const normalized = items
          .map((item) => normalizeStatusOption(item as BackendStatusOption))
          .filter((item): item is StatusOption => Boolean(item?.status));
        setStatusOptions(normalized);
      })
      .catch(() => setStatusOptions([]));
  };

  const activeFilterCount = useMemo(() => {
    return [
      search.trim(),
      filters.start,
      filters.end,
      filters.status !== ALL_VALUE ? filters.status : "",
      filters.meetingType !== ALL_VALUE ? filters.meetingType : "",
      filters.dealer.trim(),
      filters.owner.trim(),
      filters.overBudget !== ALL_VALUE ? filters.overBudget : "",
      filters.city.trim(),
      filters.state.trim(),
    ].filter(Boolean).length;
  }, [filters, search]);

  const statusFilterOptions = useMemo(() => {
    const optionMap = new Map<string, StatusOption>();

    statusOptions.forEach((option) => {
      const status = option.status.trim();
      if (!status) return;
      optionMap.set(status, { status, label: option.label || formatMeetingStatus(status) });
    });

    meetings.forEach((meeting) => {
      const status = String(meeting.status || "").trim();
      if (!status) return;
      optionMap.set(status, { status, label: getMeetingStatusLabel(meeting) });
    });

    return Array.from(optionMap.values());
  }, [meetings, statusOptions]);

  const clearFilters = () => {
    setSearch("");
    setFilters(DEFAULT_FILTERS);
    loadMeetings(DEFAULT_FILTERS, 0, pageSize);
  };

  const openWorkflowGuide = () => {
    setWorkflowGuideStep(0);
    setIsWorkflowInfoOpen(true);
  };

  const closeWorkflowGuide = () => {
    setIsWorkflowInfoOpen(false);
  };

  const goToNextWorkflowStep = () => {
    if (workflowGuideStep === MEETING_STAGE_GUIDE.length - 1) {
      closeWorkflowGuide();
      return;
    }
    setWorkflowGuideStep((step) => Math.min(MEETING_STAGE_GUIDE.length - 1, step + 1));
  };

  useEffect(() => {
    loadConfig();
    loadMeetings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredMeetings = useMemo(() => {
    const term = search.trim().toLowerCase();
    const dealer = filters.dealer.trim().toLowerCase();
    const owner = filters.owner.trim().toLowerCase();
    const overBudget = filters.overBudget;

    return meetings.filter((meeting) => {
      const actualExpenseTotal = meeting.expenses?.reduce((sum, expense) => sum + Number(expense.amount || 0), 0) || 0;
      const isOverBudget = actualExpenseTotal > Number(meeting.expectedBudget || 0);
      if (overBudget === "yes" && !isOverBudget) return false;
      if (overBudget === "no" && isOverBudget) return false;
      if (dealer) {
        const dealerText = [meeting.storeName, meeting.dealerName, meeting.customerReference].filter(Boolean).join(" ").toLowerCase();
        if (!dealerText.includes(dealer)) return false;
      }
      if (owner && !String(meeting.creatorName || "").toLowerCase().includes(owner)) return false;
      if (!term) return true;
      return [
        meeting.meetingType,
        getMeetingStatusLabel(meeting),
        meeting.stageLabel,
        meeting.city,
        meeting.state,
        meeting.location,
        meeting.storeName,
        meeting.dealerName,
        meeting.creatorName,
        meeting.customerReference,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term));
    });
  }, [filters.dealer, filters.owner, filters.overBudget, meetings, search]);

  const getAttendanceDisplay = (meeting: Meeting) => {
    if (ACTUAL_SUMMARY_STATUSES.has(String(meeting.status || ""))) {
      const actualCount = meeting.actualAttendeeCount ?? meeting.attendees?.filter((attendee) => attendee.present).length ?? 0;
      const plannedCount = meeting.expectedAttendees || meeting.attendees?.length || 0;
      return plannedCount ? `${actualCount}/${plannedCount}` : String(actualCount);
    }
    return String(meeting.expectedAttendees || meeting.attendees?.length || 0);
  };

  const exportCsv = async () => {
    if (dateRangeInvalid) return;
    setIsExporting(true);
    setError(null);
    try {
      const blob = await meetingsApi.exportReport(backendFiltersFor(filters));
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `meetings-report-${format(new Date(), "yyyy-MM-dd")}.csv`;
      link.click();
      URL.revokeObjectURL(link.href);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to export meetings report.");
    } finally {
      setIsExporting(false);
    }
  };

  const currentWorkflowStep = MEETING_STAGE_GUIDE[workflowGuideStep] || MEETING_STAGE_GUIDE[0];
  const workflowProgress =
    MEETING_STAGE_GUIDE.length > 1 ? (workflowGuideStep / (MEETING_STAGE_GUIDE.length - 1)) * 100 : 0;
  const workflowTone = workflowToneClasses(currentWorkflowStep.tone);
  const isLastWorkflowStep = workflowGuideStep === MEETING_STAGE_GUIDE.length - 1;

  return (
    <div className="space-y-4 px-4 sm:px-6 py-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="text-xs text-muted-foreground">
          Showing <span className="font-semibold text-foreground">{filteredMeetings.length}</span> of <span className="font-semibold text-foreground">{pageInfo?.totalElements ?? meetings.length}</span> meetings
        </div>
        <div className="flex flex-wrap gap-2 lg:justify-end">
          <Button variant="outline" size="sm" className="h-9 text-xs shadow-none" onClick={() => setIsFiltersOpen((open) => !open)}>
            <Filter className="h-4 w-4 mr-1.5" />
            {isFiltersOpen ? "Hide filters" : "Show filters"}{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
          </Button>
          <Button variant="outline" size="sm" className="h-9 w-9 shrink-0 p-0" onClick={openWorkflowGuide} aria-label="Meeting workflow guide">
            <Info className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" className="h-9 text-xs shadow-none" onClick={exportCsv} disabled={isExporting || dateRangeInvalid}>
            {isExporting ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Download className="h-4 w-4 mr-1.5" />}
            Export CSV
          </Button>
          {!isAdmin && (
            <Button size="sm" className="h-9 text-xs" onClick={() => setIsNewMeetingOpen(true)}>
              <Plus className="h-4 w-4 mr-1.5" />
              New Meeting
            </Button>
          )}
        </div>
      </div>

      {isFiltersOpen && (
        <Card className="overflow-hidden border-border/70 bg-card shadow-sm">
          <CardContent className="grid gap-3 md:grid-cols-6 p-4">
            <div className="space-y-1.5 md:col-span-2">
              <Label className="text-xs font-medium text-foreground">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input className="pl-9 h-9 text-xs bg-background shadow-none" value={search} onChange={(event) => setSearch(event.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-foreground">Start</Label>
              <Input type="date" className="h-9 text-xs bg-background shadow-none" value={filters.start} onChange={(event) => setFilters((prev) => ({ ...prev, start: event.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-foreground">End</Label>
              <Input type="date" className="h-9 text-xs bg-background shadow-none" value={filters.end} onChange={(event) => setFilters((prev) => ({ ...prev, end: event.target.value }))} />
            </div>
            <DateRangeError fromDate={filters.start} toDate={filters.end} className="md:col-span-6" />
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-foreground">Status</Label>
              <Select value={filters.status} onValueChange={(value) => {
                setFilters((prev) => ({ ...prev, status: value }));
              }}>
                <SelectTrigger className="h-9 w-full bg-background text-xs shadow-none">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="z-[100] max-h-48 text-xs">
                  <SelectItem value={ALL_VALUE} className="text-xs">All statuses</SelectItem>
                  {statusFilterOptions.map((status) => (
                    <SelectItem key={status.status} value={status.status} className="text-xs">
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-foreground">Type</Label>
              <Select value={filters.meetingType} onValueChange={(value) => setFilters((prev) => ({ ...prev, meetingType: value }))}>
                <SelectTrigger className="h-9 w-full bg-background text-xs shadow-none">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="text-xs">
                  <SelectItem value={ALL_VALUE} className="text-xs">All types</SelectItem>
                  {meetingTypes.map((type) => (
                    <SelectItem key={type} value={type} className="text-xs">
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-foreground">Dealer / Shop</Label>
              <Input
                className="h-9 text-xs bg-background shadow-none"
                value={filters.dealer}
                onChange={(event) => setFilters((prev) => ({ ...prev, dealer: event.target.value }))}
                placeholder="Dealer name"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-foreground">Owner</Label>
              <Input
                className="h-9 text-xs bg-background shadow-none"
                value={filters.owner}
                onChange={(event) => setFilters((prev) => ({ ...prev, owner: event.target.value }))}
                placeholder="Field officer"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-foreground">Budget</Label>
              <Select value={filters.overBudget} onValueChange={(value) => setFilters((prev) => ({ ...prev, overBudget: value }))}>
                <SelectTrigger className="h-9 w-full bg-background text-xs shadow-none">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="text-xs">
                  <SelectItem value={ALL_VALUE} className="text-xs">All</SelectItem>
                  <SelectItem value="yes" className="text-xs">Over budget</SelectItem>
                  <SelectItem value="no" className="text-xs">Within budget</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-foreground">City</Label>
              <Input className="h-9 text-xs bg-background shadow-none" value={filters.city} onChange={(event) => setFilters((prev) => ({ ...prev, city: event.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-foreground">State</Label>
              <Input className="h-9 text-xs bg-background shadow-none" value={filters.state} onChange={(event) => setFilters((prev) => ({ ...prev, state: event.target.value }))} />
            </div>
            <div className="flex flex-wrap items-end gap-2 md:col-span-6 pt-1">
              <Button size="sm" className="h-9 text-xs" onClick={() => loadMeetings(filters, 0, pageSize)} disabled={isLoading || dateRangeInvalid}>
                Apply Filters
              </Button>
              <Button size="sm" variant="outline" className="h-9 text-xs" onClick={clearFilters} disabled={isLoading || activeFilterCount === 0}>
                Clear Filters
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {error && <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">{error}</div>}

      <Card className="overflow-hidden border-border/70 bg-card shadow-sm">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex min-h-64 items-center justify-center text-xs text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading meetings...
            </div>
          ) : filteredMeetings.length === 0 ? (
            <div className="flex min-h-64 flex-col items-center justify-center gap-2 p-6 text-center text-xs text-muted-foreground">
              <CalendarDays className="h-8 w-8 text-muted-foreground/60" />
              <div className="font-semibold text-foreground">No meetings found</div>
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead className="text-xs font-medium">Meeting</TableHead>
                  <TableHead className="text-xs font-medium">Date</TableHead>
                  <TableHead className="text-xs font-medium">Location</TableHead>
                  <TableHead className="text-xs font-medium">Dealer</TableHead>
                  <TableHead className="text-xs font-medium">Owner</TableHead>
                  <TableHead className="text-xs font-medium">Budget</TableHead>
                  <TableHead className="text-xs font-medium">People</TableHead>
                  <TableHead className="text-xs font-medium">Status</TableHead>
                  <TableHead className="text-right text-xs font-medium">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMeetings.map((meeting) => (
                  <TableRow key={meeting.id}>
                    <TableCell className="text-xs font-medium">
                      <div className="font-medium">{meeting.meetingType}</div>
                      <div className="max-w-[260px] truncate text-[11px] text-muted-foreground">
                        {meeting.customerReference || meeting.storeName || meeting.dealerName || `Meeting #${meeting.id}`}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">
                      <div>{formatDate(meeting.meetingDate)}</div>
                      <div className="text-[11px] text-muted-foreground">{formatMeetingTime(meeting.meetingTime)}</div>
                    </TableCell>
                    <TableCell className="text-xs">
                      <div>{meeting.city || "-"}</div>
                      <div className="text-[11px] text-muted-foreground">{meeting.state || meeting.location || ""}</div>
                    </TableCell>
                    <TableCell className="text-xs">
                      <div className="max-w-[180px] truncate">{meeting.storeName || meeting.dealerName || "-"}</div>
                      <div className="max-w-[180px] truncate text-[11px] text-muted-foreground">{meeting.customerReference || ""}</div>
                    </TableCell>
                    <TableCell className="text-xs">{meeting.creatorName || "-"}</TableCell>
                    <TableCell className="text-xs">{formatCurrency(meeting.expectedBudget)}</TableCell>
                    <TableCell className="text-xs">
                      <div className="flex items-center gap-1">
                        <Users className="h-3.5 w-3.5 text-muted-foreground" />
                        {getAttendanceDisplay(meeting)}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">
                      <Badge variant="outline" className={`text-xs py-0.5 ${statusBadgeClass(meeting.status)}`}>
                        {getMeetingStatusLabel(meeting)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs"
                        onClick={() => router.push(`/dashboard/meetings/${meeting.id}`)}
                      >
                        <Eye className="mr-1.5 h-3.5 w-3.5" />
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {pageInfo && (
        <div className="flex flex-col gap-3 rounded-lg border border-border/70 bg-card p-3 sm:flex-row sm:items-center sm:justify-between text-xs">
          <div className="flex items-center gap-2">
            <Label htmlFor="meetingsPageSize" className="text-xs font-medium">
              Rows per page:
            </Label>
            <Select
              value={String(pageSize)}
              onValueChange={(value) => {
                const nextSize = Number(value);
                setPageSize(nextSize);
                loadMeetings(filters, 0, nextSize);
              }}
            >
              <SelectTrigger id="meetingsPageSize" className="h-8 w-18 text-xs bg-background shadow-none">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="text-xs">
                <SelectItem value="10" className="text-xs">10</SelectItem>
                <SelectItem value="25" className="text-xs">25</SelectItem>
                <SelectItem value="50" className="text-xs">50</SelectItem>
                <SelectItem value="100" className="text-xs">100</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              disabled={isLoading || pageInfo.first}
              onClick={() => loadMeetings(filters, Math.max(0, pageInfo.number - 1), pageSize)}
            >
              <ChevronLeft className="mr-1 h-3.5 w-3.5" />
              Previous
            </Button>
            <span className="text-xs text-muted-foreground">
              Page {pageInfo.number + 1} of {pageInfo.totalPages || 1}
              {typeof pageInfo.totalElements === "number" ? ` · ${pageInfo.totalElements} meetings` : ""}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              disabled={isLoading || pageInfo.last}
              onClick={() => loadMeetings(filters, Math.max(0, Math.min(pageInfo.totalPages - 1, pageInfo.number + 1)), pageSize)}
            >
              Next
              <ChevronRight className="ml-1 h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}

      <Dialog open={isWorkflowInfoOpen} onOpenChange={setIsWorkflowInfoOpen}>
        <DialogContent className="max-h-[88vh] overflow-hidden p-0 sm:max-w-[720px]">
          <div className="flex max-h-[88vh] flex-col">
            <DialogHeader className="px-8 pb-4 pt-7 text-left border-b">
              <DialogTitle className="text-base font-semibold">Meeting Workflow Guide</DialogTitle>
              <DialogDescription className="text-xs">
                An interactive guide to stages, statuses, and administrative actions.
              </DialogDescription>
            </DialogHeader>

            <div className="border-b px-8 pb-6 pt-4">
              <div className="relative flex items-center justify-between">
                <div className="absolute left-0 right-0 top-1/2 h-px -translate-y-1/2 bg-border" />
                <div
                  className="absolute left-0 top-1/2 h-px -translate-y-1/2 bg-primary transition-all duration-300"
                  style={{ width: `${workflowProgress}%` }}
                />
                {MEETING_STAGE_GUIDE.map((item, index) => {
                  const isActive = index === workflowGuideStep;
                  const isComplete = index < workflowGuideStep;
                  return (
                    <button
                      key={item.stage}
                      type="button"
                      title={item.stage}
                      onClick={() => setWorkflowGuideStep(index)}
                      className={[
                        "relative z-10 flex h-7 w-7 items-center justify-center rounded-full border text-xs font-semibold transition",
                        isActive
                          ? "border-primary bg-primary text-primary-foreground shadow-sm ring-4 ring-primary/15"
                          : isComplete
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-card text-muted-foreground hover:border-foreground/30 hover:text-foreground",
                      ].join(" ")}
                    >
                      {index + 1}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="min-h-[260px] overflow-y-auto px-8 py-6 sm:px-10">
              <div key={currentWorkflowStep.stage} className="animate-in fade-in slide-in-from-right-2 space-y-4 duration-300">
                <div className={`text-xs font-bold uppercase tracking-wider ${workflowTone.label}`}>
                  {currentWorkflowStep.phase}
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-bold tracking-tight text-foreground">{currentWorkflowStep.stage}</h3>
                  <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">{currentWorkflowStep.meaning}</p>
                </div>

                <div className={`rounded-lg border p-4 text-xs leading-relaxed ${workflowTone.card}`}>
                  <div className="font-semibold text-foreground mb-1">Administrative Action</div>
                  <div>{currentWorkflowStep.adminAction}</div>
                </div>
              </div>
            </div>

            <DialogFooter className="border-t px-8 py-4 sm:justify-between">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                disabled={workflowGuideStep === 0}
                onClick={() => setWorkflowGuideStep((step) => Math.max(0, step - 1))}
              >
                Previous
              </Button>
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" className="h-8 text-xs" onClick={closeWorkflowGuide}>
                  Close
                </Button>
                <Button type="button" size="sm" className="h-8 text-xs" onClick={goToNextWorkflowStep}>
                  {isLastWorkflowStep ? "Got It" : "Next Stage"}
                </Button>
              </div>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      <NewMeetingDialog
        open={isNewMeetingOpen}
        onOpenChange={setIsNewMeetingOpen}
        meetingTypes={meetingTypes}
        onCreated={() => loadMeetings(filters, 0, pageSize)}
      />
    </div>
  );
}
