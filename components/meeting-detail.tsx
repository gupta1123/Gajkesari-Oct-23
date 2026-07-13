"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Download,
  FileText,
  Gift,
  Loader2,
  Lock,
  Plus,
  RefreshCw,
  Save,
  Send,
  UserCheck,
  XCircle,
} from "lucide-react";
import { format } from "date-fns";

import { useAuth } from "@/components/auth-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  ATTENDEE_CATEGORIES,
  AttendancePayload,
  EXPENSE_HEADS,
  FinalReportPayload,
  formatMeetingStatus,
  hasMeetingAction,
  isMeetingTabEnabled,
  Meeting,
  MeetingAttendee,
  MeetingExpense,
  MeetingGift,
  MeetingTabs,
  MEETING_TYPES,
  meetingsApi,
} from "@/lib/meetings-api";
import { hasAdminSetupPrivileges } from "@/lib/auth";

type WorkflowTab = keyof MeetingTabs;
type AdminReviewTab = "details" | "attendees" | "gifts" | "expenses";

type RequestForm = {
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

type ExecutionForm = {
  actualMeetingDate: string;
  actualMeetingTime: string;
  actualLocation: string;
  executionRemarks: string;
};

const WORKFLOW_TABS: Array<{ key: WorkflowTab; label: string }> = [
  { key: "request", label: "Request" },
  { key: "attendees", label: "Attendees" },
  { key: "approval", label: "Approval" },
  { key: "execution", label: "Execution" },
  { key: "gifts", label: "Gifts" },
  { key: "expenses", label: "Expenses" },
  { key: "finalReport", label: "Final Report" },
];

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

const timeForInput = (value?: string) => (value ? value.slice(0, 5) : "");
const timeForApi = (value: string) => (value.length === 5 ? `${value}:00` : value);
const cleanMobile = (value?: string) => String(value || "").replace(/\D/g, "");

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

const requestFormFromMeeting = (meeting: Meeting): RequestForm => ({
  meetingType: meeting.meetingType || "Dealer",
  meetingDate: meeting.meetingDate || "",
  meetingTime: timeForInput(meeting.meetingTime),
  city: meeting.city || "",
  state: meeting.state || "",
  location: meeting.location || "",
  customerReference: meeting.customerReference || "",
  objective: meeting.objective || "",
  expectedBudget: meeting.expectedBudget == null ? "" : String(meeting.expectedBudget),
  expectedGiftsMaterials: meeting.expectedGiftsMaterials || "",
  allowWalkInAttendees: meeting.allowWalkInAttendees !== false,
  remarks: meeting.remarks || "",
});

const attendeeDraft = (): MeetingAttendee => ({
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

const expenseDraft = (date?: string): MeetingExpense => ({
  expenseHead: "food/snacks",
  amount: 0,
  expenseDate: date || "",
  remarks: "",
});

const giftDraft = (meetingAttendeeId?: number): MeetingGift => ({
  meetingAttendeeId,
  giftItem: "",
  quantity: 1,
  remarks: "",
});

const getDuplicateMobileError = (attendees: MeetingAttendee[]) => {
  const seen = new Set<string>();
  for (const attendee of attendees) {
    const mobile = cleanMobile(attendee.mobileNumber);
    if (!mobile) continue;
    if (seen.has(mobile)) return `Mobile number ${mobile} is duplicated in this meeting.`;
    seen.add(mobile);
  }
  return null;
};

const normaliseAttendees = (attendees: MeetingAttendee[]) =>
  attendees
    .map((attendee) => ({
      ...attendee,
      name: attendee.name.trim(),
      mobileNumber: cleanMobile(attendee.mobileNumber),
      email: attendee.email?.trim() || undefined,
      cityArea: attendee.cityArea?.trim() || undefined,
      companyShopProject: attendee.companyShopProject?.trim() || undefined,
      categoryDetails: attendee.categoryDetails?.trim() || undefined,
      remarks: attendee.remarks?.trim() || undefined,
      expected: attendee.expected !== false,
    }))
    .filter((attendee) => attendee.name || attendee.mobileNumber);

function ReadOnlyField({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="rounded-md border p-3">
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 break-words text-sm font-medium">{value ?? "-"}</div>
    </div>
  );
}

function LockedPanel({ label }: { label: string }) {
  return (
    <div className="flex min-h-40 flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-6 text-center text-muted-foreground">
      <Lock className="h-6 w-6" />
      <div className="text-sm">{label}</div>
    </div>
  );
}

function MeetingDetailCard({
  title,
  icon,
  children,
}: {
  title: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card className="gap-0 rounded-lg border-border/80 py-0 shadow-sm transition-colors hover:border-border hover:bg-muted/10">
      <CardHeader className="px-8 pb-0 pt-8">
        <CardTitle className="flex items-center gap-2 text-base">
          <span className="text-primary">{icon}</span>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-8 pb-8 pt-5">{children}</CardContent>
    </Card>
  );
}

function MeetingDataRow({ label, value }: { label: string; value?: ReactNode }) {
  return (
    <div className="grid items-center gap-2 border-b border-border/50 py-3 last:border-b-0 sm:grid-cols-[160px_1fr]">
      <dt className="text-sm font-medium text-muted-foreground">{label}</dt>
      <dd className="break-words text-sm font-semibold text-foreground">{value ?? "-"}</dd>
    </div>
  );
}

function MeetingNoteBlock({ label, value }: { label: string; value?: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <dt className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="whitespace-pre-wrap break-words text-sm font-semibold leading-6 text-foreground">{value ?? "-"}</dd>
    </div>
  );
}

const getInitials = (name?: string) => {
  const words = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) return "-";
  return words.slice(0, 2).map((word) => word[0]?.toUpperCase()).join("");
};

function GiftAttendeeCell({
  name,
  isWalkIn,
}: {
  name?: string;
  isWalkIn?: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-bold ${
        isWalkIn
          ? "border-primary/25 bg-primary/10 text-primary"
          : "border-border bg-muted text-foreground"
      }`}>
        {getInitials(name)}
      </div>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-foreground">{name || "-"}</span>
          {isWalkIn && (
            <Badge variant="outline" className="border-primary/25 bg-primary/10 text-primary">
              Walk-in
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}

function QuantityChip({ value }: { value?: number }) {
  return (
    <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-md border bg-muted px-2 text-sm font-bold text-foreground">
      {Number(value || 0)}
    </span>
  );
}

function ExpenseMetricCard({
  label,
  value,
  valueClassName = "",
  badge,
}: {
  label: string;
  value: string;
  valueClassName?: string;
  badge?: ReactNode;
}) {
  return (
    <Card className="gap-0 rounded-lg border-border/80 py-0 shadow-sm transition-colors hover:border-border hover:bg-muted/10">
      <CardContent className="flex flex-col gap-1.5 p-6">
        <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{label}</span>
        <span className={`text-2xl font-extrabold tracking-tight text-foreground ${valueClassName}`}>
          {value}
        </span>
        {badge}
      </CardContent>
    </Card>
  );
}

const getExpenseIndicatorClass = (head?: string) => {
  const normalized = String(head || "").toLowerCase();
  if (normalized.includes("food") || normalized.includes("snack")) return "bg-amber-500";
  if (normalized.includes("gift")) return "bg-primary";
  if (normalized.includes("travel")) return "bg-sky-500";
  if (normalized.includes("venue")) return "bg-emerald-500";
  if (normalized.includes("print") || normalized.includes("material")) return "bg-violet-500";
  return "bg-muted-foreground";
};

function ExpenseHeadChip({ head }: { head?: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-1.5 text-sm font-semibold text-foreground">
      <span className={`h-1.5 w-1.5 rounded-full ${getExpenseIndicatorClass(head)}`} />
      {head || "-"}
    </span>
  );
}

export default function MeetingDetail({ meetingId }: { meetingId: number }) {
  const router = useRouter();
  const { userRole, currentUser } = useAuth();
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [activeTab, setActiveTab] = useState<WorkflowTab>("request");
  const [adminTab, setAdminTab] = useState<AdminReviewTab>("details");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [requestForm, setRequestForm] = useState<RequestForm | null>(null);
  const [attendees, setAttendees] = useState<MeetingAttendee[]>([]);
  const [approvalRemarks, setApprovalRemarks] = useState("");
  const [executionForm, setExecutionForm] = useState<ExecutionForm>({
    actualMeetingDate: "",
    actualMeetingTime: "",
    actualLocation: "",
    executionRemarks: "",
  });
  const [attendance, setAttendance] = useState<Record<number, { present: boolean; remarks: string }>>({});
  const [walkIn, setWalkIn] = useState<MeetingAttendee>(attendeeDraft());
  const [gifts, setGifts] = useState<MeetingGift[]>([]);
  const [expenses, setExpenses] = useState<MeetingExpense[]>([]);
  const [expenseRemarks, setExpenseRemarks] = useState("");
  const [finalReport, setFinalReport] = useState<FinalReportPayload>({
    meetingSummary: "",
    keyDiscussionPoints: "",
    leadsGenerated: "",
    interestedCustomers: "",
    competitorInformation: "",
    finalRemarks: "",
  });
  const [finalApprovalRemarks, setFinalApprovalRemarks] = useState("");
  const [closeRemarks, setCloseRemarks] = useState("");
  const [cancelRemarks, setCancelRemarks] = useState("");

  const loadMeeting = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await meetingsApi.getMeetingById(meetingId);
      setMeeting(data);
      setRequestForm(requestFormFromMeeting(data));
      setAttendees(data.attendees?.length ? data.attendees.map((attendee) => ({ ...attendee })) : [attendeeDraft()]);
      setExecutionForm({
        actualMeetingDate: data.actualMeetingDate || data.meetingDate || "",
        actualMeetingTime: timeForInput(data.actualMeetingTime || data.meetingTime),
        actualLocation: data.actualLocation || data.location || "",
        executionRemarks: data.executionRemarks || "",
      });
      setAttendance(
        (data.attendees || []).reduce<Record<number, { present: boolean; remarks: string }>>((acc, attendee) => {
          if (attendee.id != null) {
            acc[attendee.id] = {
              present: attendee.present === true,
              remarks: attendee.remarks || "",
            };
          }
          return acc;
        }, {})
      );
      setGifts(data.gifts?.length ? data.gifts.map((gift) => ({ ...gift })) : [giftDraft()]);
      setExpenses(data.expenses?.length ? data.expenses.map((expense) => ({ ...expense })) : [expenseDraft(data.actualMeetingDate || data.meetingDate)]);
      setFinalReport({
        meetingSummary: data.meetingSummary || "",
        keyDiscussionPoints: data.keyDiscussionPoints || "",
        leadsGenerated: data.leadsGenerated || "",
        interestedCustomers: data.interestedCustomers || "",
        competitorInformation: data.competitorInformation || "",
        finalRemarks: data.finalRemarks || "",
      });
      setFinalApprovalRemarks(data.finalReportApprovalRemarks || "");
      setCloseRemarks(data.finalRemarks || "");

      const currentTabEnabled = isMeetingTabEnabled(data, activeTab);
      if (!currentTabEnabled) {
        const nextTab = WORKFLOW_TABS.find((tab) => isMeetingTabEnabled(data, tab.key))?.key || "request";
        setActiveTab(nextTab);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load meeting.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMeeting();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meetingId]);

  const presentAttendees = useMemo(
    () => (meeting?.attendees || []).filter((attendee) => attendee.present === true && attendee.id != null),
    [meeting]
  );

  const totalExpenses = useMemo(
    () => expenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0),
    [expenses]
  );

  const actualExpenseTotal = useMemo(
    () => (meeting?.expenses || []).reduce((sum, expense) => sum + Number(expense.amount || 0), 0),
    [meeting]
  );
  const isAdmin = hasAdminSetupPrivileges(userRole, currentUser);

  const canEditRequest = Boolean(meeting && (hasMeetingAction(meeting, "EDIT_REQUEST") || ["DRAFT", "CORRECTION_REQUIRED"].includes(meeting.status)));
  const canSubmit = Boolean(meeting && !isAdmin && (hasMeetingAction(meeting, "SUBMIT") || ["DRAFT", "CORRECTION_REQUIRED"].includes(meeting.status)));
  const canApprove = Boolean(meeting && (hasMeetingAction(meeting, "APPROVE") || meeting.status === "PENDING_APPROVAL"));
  const canReject = Boolean(meeting && (hasMeetingAction(meeting, "REJECT") || meeting.status === "PENDING_APPROVAL"));
  const canRequestCorrection = Boolean(meeting && (hasMeetingAction(meeting, "REQUEST_CORRECTION") || meeting.status === "PENDING_APPROVAL"));
  const canExecute = Boolean(meeting && (hasMeetingAction(meeting, "EXECUTE") || meeting.status === "APPROVED"));
  const canMarkAttendance = Boolean(meeting && (hasMeetingAction(meeting, "MARK_ATTENDANCE") || ["APPROVED", "EXECUTED"].includes(meeting.status)));
  const canIssueGifts = Boolean(meeting && isMeetingTabEnabled(meeting, "gifts") && ["EXECUTED", "EXPENSE_SUBMITTED", "REPORT_SUBMITTED"].includes(meeting.status));
  const canSubmitExpenses = Boolean(meeting && (hasMeetingAction(meeting, "SUBMIT_EXPENSES") || meeting.status === "EXECUTED"));
  const canSubmitFinalReport = Boolean(meeting && (hasMeetingAction(meeting, "SUBMIT_FINAL_REPORT") || meeting.status === "EXPENSE_SUBMITTED"));
  const canApproveFinalReport = Boolean(meeting && (hasMeetingAction(meeting, "APPROVE_FINAL_REPORT") || meeting.status === "REPORT_SUBMITTED"));
  const canClose = Boolean(meeting && (hasMeetingAction(meeting, "CLOSE") || meeting.status === "REPORT_SUBMITTED"));
  const canCancel = Boolean(meeting && !["CLOSED", "CANCELLED", "REJECTED"].includes(meeting.status));

  const runAction = async (callback: () => Promise<unknown>, successMessage: string) => {
    setIsSaving(true);
    setError(null);
    setMessage(null);
    try {
      await callback();
      setMessage(successMessage);
      await loadMeeting();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed.");
    } finally {
      setIsSaving(false);
    }
  };

  const updateRequestForm = <K extends keyof RequestForm>(key: K, value: RequestForm[K]) => {
    setRequestForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const saveRequest = async () => {
    if (!meeting || !requestForm) return;
    if (!requestForm.meetingDate || !requestForm.meetingTime || !requestForm.city.trim() || !requestForm.state.trim()) {
      setError("Meeting date, time, city, and state are required.");
      return;
    }

    await runAction(
      () =>
        meetingsApi.editMeetingRequest(meeting.id, {
          meetingType: requestForm.meetingType,
          meetingDate: requestForm.meetingDate,
          meetingTime: timeForApi(requestForm.meetingTime),
          city: requestForm.city.trim(),
          state: requestForm.state.trim(),
          location: requestForm.location.trim(),
          customerReference: requestForm.customerReference.trim() || undefined,
          expectedAttendees: normaliseAttendees(attendees).length,
          objective: requestForm.objective.trim(),
          expectedBudget: Number(requestForm.expectedBudget || 0),
          expectedGiftsMaterials: requestForm.expectedGiftsMaterials.trim() || undefined,
          allowWalkInAttendees: requestForm.allowWalkInAttendees,
          remarks: requestForm.remarks.trim() || undefined,
        }),
      "Meeting request updated."
    );
  };

  const saveAttendees = async () => {
    if (!meeting) return;
    const cleaned = normaliseAttendees(attendees);
    const duplicateError = getDuplicateMobileError(cleaned);
    if (duplicateError) {
      setError(duplicateError);
      return;
    }
    const incomplete = cleaned.find((attendee) => !attendee.name || !attendee.mobileNumber || !attendee.category);
    if (incomplete) {
      setError("Every attendee needs a name, mobile number, and category.");
      return;
    }
    await runAction(() => meetingsApi.saveExpectedAttendees(meeting.id, cleaned), "Expected attendees saved.");
  };

  const submitForApproval = async () => {
    if (!meeting) return;
    const attendeeCount = normaliseAttendees(attendees).length || meeting.attendees?.length || 0;
    if (attendeeCount === 0) {
      setError("Add expected attendees before submitting for approval.");
      setActiveTab("attendees");
      return;
    }
    await runAction(() => meetingsApi.submitForApproval(meeting.id), "Meeting submitted for approval.");
  };

  const approvalAction = async (action: "approve" | "reject" | "correction") => {
    if (!meeting) return;
    if ((action === "reject" || action === "correction") && !approvalRemarks.trim()) {
      setError("Remarks are required for rejection or correction.");
      return;
    }
    const payload = { approvalRemarks: approvalRemarks.trim() };
    if (action === "approve") {
      await runAction(() => meetingsApi.approveMeeting(meeting.id, payload), "Meeting approved.");
    } else if (action === "reject") {
      await runAction(() => meetingsApi.rejectMeeting(meeting.id, payload), "Meeting rejected.");
    } else {
      await runAction(() => meetingsApi.requestCorrection(meeting.id, payload), "Meeting sent for correction.");
    }
    setApprovalRemarks("");
  };

  const executeMeeting = async () => {
    if (!meeting) return;
    if (!executionForm.actualMeetingDate || !executionForm.actualMeetingTime || !executionForm.actualLocation.trim()) {
      setError("Actual meeting date, time, and location are required.");
      return;
    }
    await runAction(
      () =>
        meetingsApi.executeMeeting(meeting.id, {
          actualMeetingDate: executionForm.actualMeetingDate,
          actualMeetingTime: timeForApi(executionForm.actualMeetingTime),
          actualLocation: executionForm.actualLocation.trim(),
          executionRemarks: executionForm.executionRemarks.trim() || undefined,
        }),
      "Meeting execution started."
    );
  };

  const saveAttendance = async () => {
    if (!meeting) return;
    const payload: AttendancePayload[] = (meeting.attendees || [])
      .filter((attendee) => attendee.id != null)
      .map((attendee) => ({
        id: attendee.id as number,
        present: attendance[attendee.id as number]?.present === true,
        attendanceSource: "MANUAL",
        remarks: attendance[attendee.id as number]?.remarks || "",
      }));

    await runAction(() => meetingsApi.markAttendance(meeting.id, payload), "Attendance updated.");
  };

  const addWalkIn = async () => {
    if (!meeting) return;
    const cleaned = normaliseAttendees([walkIn])[0];
    if (!cleaned?.name || !cleaned.mobileNumber || !cleaned.category) {
      setError("Walk-in attendee needs a name, mobile number, and category.");
      return;
    }
    const existingMobiles = new Set((meeting.attendees || []).map((attendee) => cleanMobile(attendee.mobileNumber)));
    if (existingMobiles.has(cleaned.mobileNumber)) {
      setError("This mobile number already exists in this meeting.");
      return;
    }
    await runAction(() => meetingsApi.addWalkInAttendee(meeting.id, cleaned), "Walk-in attendee added and marked present.");
    setWalkIn(attendeeDraft());
  };

  const saveGifts = async () => {
    if (!meeting) return;
    const presentIds = new Set(presentAttendees.map((attendee) => attendee.id));
    const cleaned = gifts
      .map((gift) => ({
        ...gift,
        meetingAttendeeId: Number(gift.meetingAttendeeId),
        giftItem: gift.giftItem.trim(),
        quantity: Number(gift.quantity || 0),
        remarks: gift.remarks?.trim() || undefined,
      }))
      .filter((gift) => gift.meetingAttendeeId && gift.giftItem && gift.quantity > 0);

    const invalidGift = cleaned.find((gift) => !presentIds.has(gift.meetingAttendeeId));
    if (invalidGift) {
      setError("Gifts can be issued only to attendees marked present.");
      return;
    }

    if (cleaned.length === 0) {
      setError("Add at least one valid gift row.");
      return;
    }

    await runAction(() => meetingsApi.saveGifts(meeting.id, cleaned), "Gifts saved.");
  };

  const submitExpenses = async () => {
    if (!meeting) return;
    const cleaned = expenses
      .map((expense) => ({
        ...expense,
        amount: Number(expense.amount || 0),
        expenseDate: expense.expenseDate || executionForm.actualMeetingDate || meeting.meetingDate,
        remarks: expense.remarks?.trim() || undefined,
      }))
      .filter((expense) => expense.expenseHead && expense.amount > 0);

    if (cleaned.length === 0) {
      setError("Add at least one expense row.");
      return;
    }

    if (totalExpenses > Number(meeting.expectedBudget || 0) && !expenseRemarks.trim()) {
      setError("Remarks are mandatory when actual expense is higher than approved budget.");
      return;
    }

    await runAction(
      () => meetingsApi.submitExpenses(meeting.id, { remarks: expenseRemarks.trim() || undefined, expenses: cleaned }),
      "Expenses submitted."
    );
  };

  const submitFinalReport = async () => {
    if (!meeting) return;
    if (!finalReport.meetingSummary.trim()) {
      setError("Meeting summary is required for final report.");
      return;
    }
    await runAction(() => meetingsApi.submitFinalReport(meeting.id, finalReport), "Final report submitted.");
  };

  const approveFinalReport = async () => {
    if (!meeting) return;
    await runAction(
      () => meetingsApi.approveFinalReport(meeting.id, { finalReportApprovalRemarks: finalApprovalRemarks.trim() }),
      "Final report approved."
    );
  };

  const closeMeeting = async () => {
    if (!meeting) return;
    if (!closeRemarks.trim()) {
      setError("Closure remarks are required.");
      return;
    }
    await runAction(() => meetingsApi.closeMeeting(meeting.id, { finalRemarks: closeRemarks.trim() }), "Meeting closed.");
  };

  const cancelMeeting = async () => {
    if (!meeting) return;
    if (!cancelRemarks.trim()) {
      setError("Cancellation remarks are required.");
      return;
    }
    await runAction(() => meetingsApi.cancelMeeting(meeting.id, { remarks: cancelRemarks.trim() }), "Meeting cancelled.");
  };

  const exportMeeting = () => {
    if (!meeting) return;
    const payload = JSON.stringify(meeting, null, 2);
    const blob = new Blob([payload], { type: "application/json;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `meeting-${meeting.id}-${format(new Date(), "yyyy-MM-dd")}.json`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  if (isLoading) {
    return (
      <div className="flex min-h-96 items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Loading meeting
      </div>
    );
  }

  if (!meeting || !requestForm) {
    return (
      <div className="space-y-4">
        <Button variant="outline" onClick={() => router.push("/dashboard/meetings")}>
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error || "Meeting not found."}
        </div>
      </div>
    );
  }

  if (isAdmin) {
    const adminTabs: Array<{ key: AdminReviewTab; label: string }> = [
      { key: "details", label: "Details" },
      { key: "attendees", label: "Attendees" },
      { key: "gifts", label: "Gifts" },
      { key: "expenses", label: "Expenses" },
    ];

    return (
      <div className="space-y-4">
        <div className="grid gap-3 md:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Status</div>
              <div className="mt-1 text-lg font-bold">{formatMeetingStatus(meeting.status)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Expected Budget</div>
              <div className="mt-1 text-lg font-bold">{formatCurrency(meeting.expectedBudget)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Attendees</div>
              <div className="mt-1 text-lg font-bold">{meeting.attendees?.length || meeting.expectedAttendees || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Gifts</div>
              <div className="mt-1 text-lg font-bold">{meeting.gifts?.length || 0}</div>
            </CardContent>
          </Card>
        </div>

        {message && <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{message}</div>}
        {error && <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

        {(canApprove || canReject) && (
          <Card>
            <CardHeader>
              <CardTitle>Approval Decision</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <Label>Rejection note</Label>
                <Textarea
                  value={approvalRemarks}
                  onChange={(event) => setApprovalRemarks(event.target.value)}
                  placeholder="Required only if rejecting this meeting."
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {canApprove && (
                  <Button onClick={() => approvalAction("approve")} disabled={isSaving}>
                    <CheckCircle2 className="h-4 w-4" />
                    Approve
                  </Button>
                )}
                {canReject && (
                  <Button variant="destructive" onClick={() => approvalAction("reject")} disabled={isSaving || !approvalRemarks.trim()}>
                    <XCircle className="h-4 w-4" />
                    Reject
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex gap-2 overflow-x-auto rounded-lg border bg-muted/30 p-1">
          {adminTabs.map((tab) => (
            <Button
              key={tab.key}
              type="button"
              variant={adminTab === tab.key ? "default" : "ghost"}
              size="sm"
              onClick={() => setAdminTab(tab.key)}
              className="shrink-0"
            >
              {tab.label}
            </Button>
          ))}
        </div>

        {adminTab === "details" && (
          <div className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <MeetingDetailCard title="Schedule" icon={<CalendarDays className="h-4 w-4" />}>
                <dl>
                  <MeetingDataRow label="Meeting type" value={meeting.meetingType} />
                  <MeetingDataRow label="Date" value={formatDate(meeting.meetingDate)} />
                  <MeetingDataRow label="Time" value={meeting.meetingTime} />
                  <MeetingDataRow label="City" value={meeting.city} />
                  <MeetingDataRow label="State" value={meeting.state} />
                  <MeetingDataRow label="Location" value={meeting.location} />
                </dl>
              </MeetingDetailCard>

              <MeetingDetailCard title="Request" icon={<FileText className="h-4 w-4" />}>
                <dl>
                  <MeetingDataRow label="Created by" value={meeting.creatorName} />
                  <MeetingDataRow label="Customer reference" value={meeting.customerReference} />
                  <MeetingDataRow label="Expected budget" value={formatCurrency(meeting.expectedBudget)} />
                  <MeetingDataRow label="Expected attendees" value={meeting.expectedAttendees} />
                  <MeetingDataRow
                    label="Status"
                    value={
                      <Badge variant="outline" className={statusBadgeClass(meeting.status)}>
                        {formatMeetingStatus(meeting.status)}
                      </Badge>
                    }
                  />
                </dl>
              </MeetingDetailCard>
            </div>

            <Card className="rounded-lg border-border/80 py-0 shadow-sm">
              <CardContent className="p-8">
                <dl className="grid gap-8 md:grid-cols-3">
                  <MeetingNoteBlock label="Purpose / objective" value={meeting.objective} />
                  <MeetingNoteBlock label="Expected gifts / materials" value={meeting.expectedGiftsMaterials} />
                  <MeetingNoteBlock label="Remarks" value={meeting.remarks} />
                  {meeting.approvalRemarks && (
                    <MeetingNoteBlock label="Approval / rejection note" value={meeting.approvalRemarks} />
                  )}
                </dl>
              </CardContent>
            </Card>
          </div>
        )}

        {adminTab === "attendees" && (
          <Card>
            <CardHeader>
              <CardTitle>Attendees</CardTitle>
            </CardHeader>
            <CardContent>
              {meeting.attendees?.length ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Mobile</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>City / Area</TableHead>
                      <TableHead>Company / Project</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {meeting.attendees.map((attendee) => (
                      <TableRow key={attendee.id || attendee.mobileNumber}>
                        <TableCell>{attendee.name}</TableCell>
                        <TableCell>{attendee.mobileNumber}</TableCell>
                        <TableCell>{attendee.category}</TableCell>
                        <TableCell>{attendee.cityArea || "-"}</TableCell>
                        <TableCell>{attendee.companyShopProject || "-"}</TableCell>
                        <TableCell>
                          {attendee.present ? (
                            <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">Present</Badge>
                          ) : attendee.expected ? (
                            <Badge variant="outline">Expected</Badge>
                          ) : (
                            <Badge variant="outline">Walk-in</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">No attendees found.</div>
              )}
            </CardContent>
          </Card>
        )}

        {adminTab === "gifts" && (
          <div className="space-y-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-2xl font-bold tracking-tight">Gifts</h2>
              <Badge variant="outline" className="w-fit rounded-full border-border bg-muted px-4 py-1.5 text-sm font-semibold text-foreground">
                {meeting.gifts?.length || 0} Items Issued
              </Badge>
            </div>

            <Card className="rounded-lg border-border/80 py-0 shadow-sm transition-colors hover:border-border hover:bg-muted/10">
              {meeting.gifts?.length ? (
                <CardContent className="p-8">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[35%] px-4 pb-4 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                          Attendee
                        </TableHead>
                        <TableHead className="w-[20%] px-4 pb-4 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                          Gift / Item
                        </TableHead>
                        <TableHead className="w-[15%] px-4 pb-4 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                          Quantity
                        </TableHead>
                        <TableHead className="w-[30%] px-4 pb-4 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                          Remarks
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {meeting.gifts.map((gift, index) => {
                        const attendee = meeting.attendees?.find((item) => item.id === gift.meetingAttendeeId);
                        const attendeeName = gift.attendeeName || attendee?.name;
                        const isWalkIn = attendee?.expected === false;

                        return (
                          <TableRow key={gift.id || index} className="hover:bg-transparent">
                            <TableCell className="px-4 py-4 align-middle">
                              <GiftAttendeeCell name={attendeeName} isWalkIn={isWalkIn} />
                            </TableCell>
                            <TableCell className="px-4 py-4 align-middle">
                              <span className="font-semibold text-foreground">{gift.giftItem || "-"}</span>
                            </TableCell>
                            <TableCell className="px-4 py-4 align-middle">
                              <QuantityChip value={gift.quantity} />
                            </TableCell>
                            <TableCell className="px-4 py-4 align-middle">
                              <span className="text-sm font-medium leading-5 text-muted-foreground">{gift.remarks || "-"}</span>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              ) : (
                <CardContent className="p-8">
                  <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">No gifts recorded yet.</div>
                </CardContent>
              )}
            </Card>
          </div>
        )}

        {adminTab === "expenses" && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold tracking-tight">Expenses</h2>

            <div className="grid gap-5 md:grid-cols-3">
              <ExpenseMetricCard label="Expected Budget" value={formatCurrency(meeting.expectedBudget)} />
              <ExpenseMetricCard label="Actual Expenses" value={formatCurrency(actualExpenseTotal)} />
              <ExpenseMetricCard
                label="Difference"
                value={formatCurrency(actualExpenseTotal - Number(meeting.expectedBudget || 0))}
                valueClassName={actualExpenseTotal <= Number(meeting.expectedBudget || 0) ? "text-emerald-600" : "text-amber-600"}
              />
            </div>

            <Card className="rounded-lg border-border/80 py-0 shadow-sm transition-colors hover:border-border hover:bg-muted/10">
              {meeting.expenses?.length ? (
                <CardContent className="p-8">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[30%] px-4 pb-4 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                          Head
                        </TableHead>
                        <TableHead className="w-[20%] px-4 pb-4 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                          Amount
                        </TableHead>
                        <TableHead className="w-[20%] px-4 pb-4 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                          Date
                        </TableHead>
                        <TableHead className="w-[30%] px-4 pb-4 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                          Remarks
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {meeting.expenses.map((expense, index) => (
                        <TableRow key={expense.id || index} className="hover:bg-transparent">
                          <TableCell className="px-4 py-4 align-middle">
                            <ExpenseHeadChip head={expense.expenseHead} />
                          </TableCell>
                          <TableCell className="px-4 py-4 align-middle">
                            <span className="font-bold text-foreground">{formatCurrency(expense.amount)}</span>
                          </TableCell>
                          <TableCell className="px-4 py-4 align-middle">
                            <span className="font-medium text-foreground">{formatDate(expense.expenseDate)}</span>
                          </TableCell>
                          <TableCell className="px-4 py-4 align-middle">
                            <span className="text-sm font-medium leading-5 text-muted-foreground">{expense.remarks || "-"}</span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              ) : (
                <CardContent className="p-8">
                  <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">No expenses recorded yet.</div>
                </CardContent>
              )}
            </Card>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={loadMeeting} disabled={isSaving}>
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
          <Button variant="outline" onClick={exportMeeting}>
            <Download className="h-4 w-4" />
            Export
          </Button>
          {canSubmit && (
            <Button onClick={submitForApproval} disabled={isSaving}>
              <Send className="h-4 w-4" />
              Submit
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Expected Budget</div>
            <div className="mt-1 text-xl font-bold">{formatCurrency(meeting.expectedBudget)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Actual Expenses</div>
            <div className="mt-1 text-xl font-bold">{formatCurrency(actualExpenseTotal)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Attendees Present</div>
            <div className="mt-1 text-xl font-bold">
              {(meeting.attendees || []).filter((attendee) => attendee.present).length}/{meeting.attendees?.length || meeting.expectedAttendees || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Gifts Issued</div>
            <div className="mt-1 text-xl font-bold">{meeting.gifts?.length || 0}</div>
          </CardContent>
        </Card>
      </div>

      {message && <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{message}</div>}
      {error && <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <div className="flex gap-2 overflow-x-auto rounded-lg border bg-muted/30 p-1">
        {WORKFLOW_TABS.map((tab) => {
          const enabled = isMeetingTabEnabled(meeting, tab.key);
          return (
            <Button
              key={tab.key}
              type="button"
              variant={activeTab === tab.key ? "default" : "ghost"}
              size="sm"
              disabled={!enabled}
              onClick={() => setActiveTab(tab.key)}
              className="shrink-0"
            >
              {!enabled && <Lock className="h-3.5 w-3.5" />}
              {tab.label}
            </Button>
          );
        })}
      </div>

      {activeTab === "request" && (
        <Card>
          <CardHeader>
            <CardTitle>Request</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {canEditRequest ? (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Meeting type</Label>
                  <Select value={requestForm.meetingType} onValueChange={(value) => updateRequestForm("meetingType", value)}>
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
                  <Input type="number" value={requestForm.expectedBudget} onChange={(event) => updateRequestForm("expectedBudget", event.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input type="date" value={requestForm.meetingDate} onChange={(event) => updateRequestForm("meetingDate", event.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Time</Label>
                  <Input type="time" value={requestForm.meetingTime} onChange={(event) => updateRequestForm("meetingTime", event.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>City</Label>
                  <Input value={requestForm.city} onChange={(event) => updateRequestForm("city", event.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>State</Label>
                  <Input value={requestForm.state} onChange={(event) => updateRequestForm("state", event.target.value)} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Location</Label>
                  <Input value={requestForm.location} onChange={(event) => updateRequestForm("location", event.target.value)} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Dealer / counter / customer reference</Label>
                  <Input value={requestForm.customerReference} onChange={(event) => updateRequestForm("customerReference", event.target.value)} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Purpose / objective</Label>
                  <Textarea value={requestForm.objective} onChange={(event) => updateRequestForm("objective", event.target.value)} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Expected gifts / materials</Label>
                  <Textarea value={requestForm.expectedGiftsMaterials} onChange={(event) => updateRequestForm("expectedGiftsMaterials", event.target.value)} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Remarks</Label>
                  <Textarea value={requestForm.remarks} onChange={(event) => updateRequestForm("remarks", event.target.value)} />
                </div>
                <label className="flex items-center gap-2 rounded-md border p-3 text-sm md:col-span-2">
                  <Checkbox
                    checked={requestForm.allowWalkInAttendees}
                    onCheckedChange={(checked) => updateRequestForm("allowWalkInAttendees", checked === true)}
                  />
                  Allow walk-in attendees during execution
                </label>
                <div className="md:col-span-2">
                  <Button onClick={saveRequest} disabled={isSaving}>
                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Save Request
                  </Button>
                </div>
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-3">
                <ReadOnlyField label="Meeting type" value={meeting.meetingType} />
                <ReadOnlyField label="Date" value={formatDate(meeting.meetingDate)} />
                <ReadOnlyField label="Time" value={meeting.meetingTime} />
                <ReadOnlyField label="City" value={meeting.city} />
                <ReadOnlyField label="State" value={meeting.state} />
                <ReadOnlyField label="Location" value={meeting.location} />
                <ReadOnlyField label="Reference" value={meeting.customerReference} />
                <ReadOnlyField label="Expected budget" value={formatCurrency(meeting.expectedBudget)} />
                <ReadOnlyField label="Expected attendees" value={meeting.expectedAttendees} />
                <div className="md:col-span-3">
                  <ReadOnlyField label="Objective" value={meeting.objective} />
                </div>
                <div className="md:col-span-3">
                  <ReadOnlyField label="Expected gifts / materials" value={meeting.expectedGiftsMaterials} />
                </div>
                <div className="md:col-span-3">
                  <ReadOnlyField label="Remarks" value={meeting.remarks} />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === "attendees" && (
        <Card>
          <CardHeader>
            <CardTitle>Expected Attendees</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {canEditRequest ? (
              <>
                <div className="flex justify-end">
                  <Button variant="outline" size="sm" onClick={() => setAttendees((prev) => [...prev, attendeeDraft()])}>
                    <Plus className="h-4 w-4" />
                    Add Attendee
                  </Button>
                </div>
                {attendees.map((attendee, index) => (
                  <div key={index} className="rounded-lg border p-3">
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-sm font-medium">Attendee {index + 1}</span>
                      {attendees.length > 1 && (
                        <Button variant="ghost" size="sm" onClick={() => setAttendees((prev) => prev.filter((_, currentIndex) => currentIndex !== index))}>
                          Remove
                        </Button>
                      )}
                    </div>
                    <div className="grid gap-3 md:grid-cols-3">
                      <Input placeholder="Name" value={attendee.name} onChange={(event) => setAttendees((prev) => prev.map((item, currentIndex) => currentIndex === index ? { ...item, name: event.target.value } : item))} />
                      <Input placeholder="Mobile" value={attendee.mobileNumber} onChange={(event) => setAttendees((prev) => prev.map((item, currentIndex) => currentIndex === index ? { ...item, mobileNumber: event.target.value } : item))} />
                      <Select value={attendee.category || "mason"} onValueChange={(value) => setAttendees((prev) => prev.map((item, currentIndex) => currentIndex === index ? { ...item, category: value } : item))}>
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
                      <Input placeholder="City / area" value={attendee.cityArea || ""} onChange={(event) => setAttendees((prev) => prev.map((item, currentIndex) => currentIndex === index ? { ...item, cityArea: event.target.value } : item))} />
                      <Input placeholder="Company / shop / project" value={attendee.companyShopProject || ""} onChange={(event) => setAttendees((prev) => prev.map((item, currentIndex) => currentIndex === index ? { ...item, companyShopProject: event.target.value } : item))} />
                      <Input placeholder="Email" value={attendee.email || ""} onChange={(event) => setAttendees((prev) => prev.map((item, currentIndex) => currentIndex === index ? { ...item, email: event.target.value } : item))} />
                      <Input className="md:col-span-3" placeholder="Remarks" value={attendee.remarks || ""} onChange={(event) => setAttendees((prev) => prev.map((item, currentIndex) => currentIndex === index ? { ...item, remarks: event.target.value } : item))} />
                    </div>
                  </div>
                ))}
                <Button onClick={saveAttendees} disabled={isSaving}>
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save Attendees
                </Button>
              </>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Mobile</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>City / Area</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(meeting.attendees || []).map((attendee) => (
                    <TableRow key={attendee.id || attendee.mobileNumber}>
                      <TableCell>{attendee.name}</TableCell>
                      <TableCell>{attendee.mobileNumber}</TableCell>
                      <TableCell>{attendee.category}</TableCell>
                      <TableCell>{attendee.cityArea || "-"}</TableCell>
                      <TableCell>
                        {attendee.present ? (
                          <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">Present</Badge>
                        ) : attendee.expected ? (
                          <Badge variant="outline">Expected</Badge>
                        ) : (
                          <Badge variant="outline">Walk-in</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === "approval" && (
        <Card>
          <CardHeader>
            <CardTitle>Approval</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-3">
              <ReadOnlyField label="Status" value={formatMeetingStatus(meeting.status)} />
              <ReadOnlyField label="Current approval remarks" value={meeting.approvalRemarks} />
              <ReadOnlyField label="Budget" value={formatCurrency(meeting.expectedBudget)} />
            </div>
            {canApprove || canReject || canRequestCorrection ? (
              <>
                <div className="space-y-2">
                  <Label>Approval remarks</Label>
                  <Textarea value={approvalRemarks} onChange={(event) => setApprovalRemarks(event.target.value)} />
                </div>
                <div className="flex flex-wrap gap-2">
                  {canApprove && (
                    <Button onClick={() => approvalAction("approve")} disabled={isSaving}>
                      <CheckCircle2 className="h-4 w-4" />
                      Approve
                    </Button>
                  )}
                  {canRequestCorrection && (
                    <Button variant="outline" onClick={() => approvalAction("correction")} disabled={isSaving}>
                      Request Correction
                    </Button>
                  )}
                  {canReject && (
                    <Button variant="destructive" onClick={() => approvalAction("reject")} disabled={isSaving}>
                      <XCircle className="h-4 w-4" />
                      Reject
                    </Button>
                  )}
                </div>
              </>
            ) : (
              <LockedPanel label="Approval actions are available only when this meeting is pending approval." />
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === "execution" && (
        <Card>
          <CardHeader>
            <CardTitle>Execution</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {canExecute || canMarkAttendance ? (
              <>
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Actual date</Label>
                    <Input type="date" value={executionForm.actualMeetingDate} onChange={(event) => setExecutionForm((prev) => ({ ...prev, actualMeetingDate: event.target.value }))} disabled={!canExecute} />
                  </div>
                  <div className="space-y-2">
                    <Label>Actual time</Label>
                    <Input type="time" value={executionForm.actualMeetingTime} onChange={(event) => setExecutionForm((prev) => ({ ...prev, actualMeetingTime: event.target.value }))} disabled={!canExecute} />
                  </div>
                  <div className="space-y-2">
                    <Label>Actual location</Label>
                    <Input value={executionForm.actualLocation} onChange={(event) => setExecutionForm((prev) => ({ ...prev, actualLocation: event.target.value }))} disabled={!canExecute} />
                  </div>
                  <div className="space-y-2 md:col-span-3">
                    <Label>Execution remarks</Label>
                    <Textarea value={executionForm.executionRemarks} onChange={(event) => setExecutionForm((prev) => ({ ...prev, executionRemarks: event.target.value }))} disabled={!canExecute} />
                  </div>
                </div>
                {canExecute && (
                  <Button onClick={executeMeeting} disabled={isSaving}>
                    <UserCheck className="h-4 w-4" />
                    Start Execution
                  </Button>
                )}
                {canMarkAttendance && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-medium">Actual attendance</h3>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Present</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Mobile</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead>Remarks</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(meeting.attendees || []).map((attendee) => (
                          <TableRow key={attendee.id || attendee.mobileNumber}>
                            <TableCell>
                              <Checkbox
                                checked={attendee.id != null ? attendance[attendee.id]?.present === true : false}
                                disabled={attendee.id == null}
                                onCheckedChange={(checked) =>
                                  attendee.id != null &&
                                  setAttendance((prev) => ({
                                    ...prev,
                                    [attendee.id as number]: {
                                      present: checked === true,
                                      remarks: prev[attendee.id as number]?.remarks || "",
                                    },
                                  }))
                                }
                              />
                            </TableCell>
                            <TableCell>{attendee.name}</TableCell>
                            <TableCell>{attendee.mobileNumber}</TableCell>
                            <TableCell>{attendee.category}</TableCell>
                            <TableCell>
                              <Input
                                value={attendee.id != null ? attendance[attendee.id]?.remarks || "" : ""}
                                disabled={attendee.id == null}
                                onChange={(event) =>
                                  attendee.id != null &&
                                  setAttendance((prev) => ({
                                    ...prev,
                                    [attendee.id as number]: {
                                      present: prev[attendee.id as number]?.present === true,
                                      remarks: event.target.value,
                                    },
                                  }))
                                }
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    <Button onClick={saveAttendance} disabled={isSaving}>
                      <Save className="h-4 w-4" />
                      Save Attendance
                    </Button>
                  </div>
                )}
                {meeting.allowWalkInAttendees !== false && canMarkAttendance && (
                  <div className="space-y-3 rounded-lg border p-3">
                    <h3 className="text-sm font-medium">Add walk-in attendee</h3>
                    <div className="grid gap-3 md:grid-cols-3">
                      <Input placeholder="Name" value={walkIn.name} onChange={(event) => setWalkIn((prev) => ({ ...prev, name: event.target.value }))} />
                      <Input placeholder="Mobile" value={walkIn.mobileNumber} onChange={(event) => setWalkIn((prev) => ({ ...prev, mobileNumber: event.target.value }))} />
                      <Select value={walkIn.category || "mason"} onValueChange={(value) => setWalkIn((prev) => ({ ...prev, category: value }))}>
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
                      <Input placeholder="City / area" value={walkIn.cityArea || ""} onChange={(event) => setWalkIn((prev) => ({ ...prev, cityArea: event.target.value }))} />
                      <Input placeholder="Company / project" value={walkIn.companyShopProject || ""} onChange={(event) => setWalkIn((prev) => ({ ...prev, companyShopProject: event.target.value }))} />
                      <Input placeholder="Remarks" value={walkIn.remarks || ""} onChange={(event) => setWalkIn((prev) => ({ ...prev, remarks: event.target.value }))} />
                    </div>
                    <Button variant="outline" onClick={addWalkIn} disabled={isSaving}>
                      <Plus className="h-4 w-4" />
                      Add Walk-in
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <LockedPanel label="Execution unlocks only after approval." />
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === "gifts" && (
        <Card>
          <CardHeader>
            <CardTitle>Gifts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {canIssueGifts ? (
              <>
                <div className="rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground">
                  Gifts can be issued only to attendees marked present.
                </div>
                <div className="flex justify-end">
                  <Button variant="outline" size="sm" onClick={() => setGifts((prev) => [...prev, giftDraft(presentAttendees[0]?.id)])}>
                    <Plus className="h-4 w-4" />
                    Add Gift
                  </Button>
                </div>
                {gifts.map((gift, index) => (
                  <div key={index} className="grid gap-3 rounded-lg border p-3 md:grid-cols-4">
                    <Select
                      value={gift.meetingAttendeeId ? String(gift.meetingAttendeeId) : ""}
                      onValueChange={(value) => setGifts((prev) => prev.map((item, currentIndex) => currentIndex === index ? { ...item, meetingAttendeeId: Number(value) } : item))}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Present attendee" />
                      </SelectTrigger>
                      <SelectContent>
                        {presentAttendees.map((attendee) => (
                          <SelectItem key={attendee.id} value={String(attendee.id)}>
                            {attendee.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input placeholder="Gift / item" value={gift.giftItem} onChange={(event) => setGifts((prev) => prev.map((item, currentIndex) => currentIndex === index ? { ...item, giftItem: event.target.value } : item))} />
                    <Input type="number" min="1" placeholder="Qty" value={gift.quantity} onChange={(event) => setGifts((prev) => prev.map((item, currentIndex) => currentIndex === index ? { ...item, quantity: Number(event.target.value) } : item))} />
                    <div className="flex gap-2">
                      <Input placeholder="Remarks" value={gift.remarks || ""} onChange={(event) => setGifts((prev) => prev.map((item, currentIndex) => currentIndex === index ? { ...item, remarks: event.target.value } : item))} />
                      {gifts.length > 1 && (
                        <Button variant="ghost" size="icon" onClick={() => setGifts((prev) => prev.filter((_, currentIndex) => currentIndex !== index))}>
                          <XCircle className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
                <Button onClick={saveGifts} disabled={isSaving || presentAttendees.length === 0}>
                  <Gift className="h-4 w-4" />
                  Save Gifts
                </Button>
              </>
            ) : (
              <LockedPanel label="Gifts unlock after execution and can be issued only to present attendees." />
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === "expenses" && (
        <Card>
          <CardHeader>
            <CardTitle>Expenses</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {canSubmitExpenses ? (
              <>
                <div className="grid gap-3 md:grid-cols-3">
                  <ReadOnlyField label="Approved budget" value={formatCurrency(meeting.expectedBudget)} />
                  <ReadOnlyField label="Actual expense total" value={formatCurrency(totalExpenses)} />
                  <ReadOnlyField label="Difference" value={formatCurrency(totalExpenses - Number(meeting.expectedBudget || 0))} />
                </div>
                <div className="flex justify-end">
                  <Button variant="outline" size="sm" onClick={() => setExpenses((prev) => [...prev, expenseDraft(executionForm.actualMeetingDate || meeting.meetingDate)])}>
                    <Plus className="h-4 w-4" />
                    Add Expense
                  </Button>
                </div>
                {expenses.map((expense, index) => (
                  <div key={index} className="grid gap-3 rounded-lg border p-3 md:grid-cols-5">
                    <Select value={expense.expenseHead} onValueChange={(value) => setExpenses((prev) => prev.map((item, currentIndex) => currentIndex === index ? { ...item, expenseHead: value } : item))}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {EXPENSE_HEADS.map((head) => (
                          <SelectItem key={head} value={head}>
                            {head}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input type="number" min="0" value={expense.amount} onChange={(event) => setExpenses((prev) => prev.map((item, currentIndex) => currentIndex === index ? { ...item, amount: Number(event.target.value) } : item))} />
                    <Input type="date" value={expense.expenseDate || ""} onChange={(event) => setExpenses((prev) => prev.map((item, currentIndex) => currentIndex === index ? { ...item, expenseDate: event.target.value } : item))} />
                    <Input placeholder="Remarks" value={expense.remarks || ""} onChange={(event) => setExpenses((prev) => prev.map((item, currentIndex) => currentIndex === index ? { ...item, remarks: event.target.value } : item))} />
                    <Button variant="ghost" size="icon" disabled={expenses.length === 1} onClick={() => setExpenses((prev) => prev.filter((_, currentIndex) => currentIndex !== index))}>
                      <XCircle className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <div className="space-y-2">
                  <Label>Expense remarks {totalExpenses > Number(meeting.expectedBudget || 0) ? "(required because actual is higher)" : ""}</Label>
                  <Textarea value={expenseRemarks} onChange={(event) => setExpenseRemarks(event.target.value)} />
                </div>
                <Button onClick={submitExpenses} disabled={isSaving}>
                  <Send className="h-4 w-4" />
                  Submit Expenses
                </Button>
              </>
            ) : (
              <LockedPanel label="Expenses unlock after meeting execution." />
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === "finalReport" && (
        <Card>
          <CardHeader>
            <CardTitle>Final Report</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {isMeetingTabEnabled(meeting, "finalReport") ? (
              <>
                <div className="grid gap-3 md:grid-cols-3">
                  <ReadOnlyField label="Actual attendee count" value={(meeting.attendees || []).filter((attendee) => attendee.present).length} />
                  <ReadOnlyField label="Expense summary" value={formatCurrency(actualExpenseTotal || totalExpenses)} />
                  <ReadOnlyField label="Gift summary" value={`${meeting.gifts?.length || 0} gift rows`} />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2 md:col-span-2">
                    <Label>Meeting summary</Label>
                    <Textarea value={finalReport.meetingSummary} onChange={(event) => setFinalReport((prev) => ({ ...prev, meetingSummary: event.target.value }))} disabled={!canSubmitFinalReport} />
                  </div>
                  <div className="space-y-2">
                    <Label>Key discussion points</Label>
                    <Textarea value={finalReport.keyDiscussionPoints} onChange={(event) => setFinalReport((prev) => ({ ...prev, keyDiscussionPoints: event.target.value }))} disabled={!canSubmitFinalReport} />
                  </div>
                  <div className="space-y-2">
                    <Label>Leads generated</Label>
                    <Textarea value={finalReport.leadsGenerated} onChange={(event) => setFinalReport((prev) => ({ ...prev, leadsGenerated: event.target.value }))} disabled={!canSubmitFinalReport} />
                  </div>
                  <div className="space-y-2">
                    <Label>Interested customers / contractors</Label>
                    <Textarea value={finalReport.interestedCustomers} onChange={(event) => setFinalReport((prev) => ({ ...prev, interestedCustomers: event.target.value }))} disabled={!canSubmitFinalReport} />
                  </div>
                  <div className="space-y-2">
                    <Label>Competitor information</Label>
                    <Textarea value={finalReport.competitorInformation} onChange={(event) => setFinalReport((prev) => ({ ...prev, competitorInformation: event.target.value }))} disabled={!canSubmitFinalReport} />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>Final remarks</Label>
                    <Textarea value={finalReport.finalRemarks} onChange={(event) => setFinalReport((prev) => ({ ...prev, finalRemarks: event.target.value }))} disabled={!canSubmitFinalReport} />
                  </div>
                </div>
                {canSubmitFinalReport && (
                  <Button onClick={submitFinalReport} disabled={isSaving}>
                    <Send className="h-4 w-4" />
                    Submit Final Report
                  </Button>
                )}
                {(canApproveFinalReport || canClose || canCancel) && (
                  <div className="grid gap-4 border-t pt-4 md:grid-cols-2">
                    {canApproveFinalReport && (
                      <div className="space-y-2">
                        <Label>Final report approval remarks</Label>
                        <Textarea value={finalApprovalRemarks} onChange={(event) => setFinalApprovalRemarks(event.target.value)} />
                        <Button onClick={approveFinalReport} disabled={isSaving}>
                          <CheckCircle2 className="h-4 w-4" />
                          Approve Final Report
                        </Button>
                      </div>
                    )}
                    {canClose && (
                      <div className="space-y-2">
                        <Label>Closure remarks</Label>
                        <Textarea value={closeRemarks} onChange={(event) => setCloseRemarks(event.target.value)} />
                        <Button onClick={closeMeeting} disabled={isSaving}>
                          <CheckCircle2 className="h-4 w-4" />
                          Close Meeting
                        </Button>
                      </div>
                    )}
                    {canCancel && (
                      <div className="space-y-2 md:col-span-2">
                        <Label>Cancellation remarks</Label>
                        <Textarea value={cancelRemarks} onChange={(event) => setCancelRemarks(event.target.value)} />
                        <Button variant="destructive" onClick={cancelMeeting} disabled={isSaving}>
                          Cancel Meeting
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : (
              <LockedPanel label="Final report unlocks after expenses are submitted." />
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
