"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Download,
  Filter,
  FileText,
  Gift,
  IndianRupee,
  Loader2,
  Lock,
  Plus,
  RefreshCw,
  Save,
  Send,
  UserCheck,
  XCircle,
} from "lucide-react";
import { endOfMonth, format, startOfMonth } from "date-fns";

import { useAuth } from "@/components/auth-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  ATTENDEE_CATEGORIES,
  AttendancePayload,
  CorrectionStage,
  EXPENSE_HEADS,
  FinalReportPayload,
  formatMeetingStatus,
  getMeetingStageLabel,
  getMeetingStatusLabel,
  hasMeetingAction,
  isMeetingTabEnabled,
  Meeting,
  MeetingAuditHistory,
  MeetingAttendee,
  MeetingConfigItem,
  MeetingExpense,
  MeetingFilters,
  MeetingGift,
  MeetingTabs,
  MEETING_TYPES,
  meetingsApi,
} from "@/lib/meetings-api";
import { hasAdminSetupPrivileges } from "@/lib/auth";
import { formatTimeTo12Hour } from "@/lib/utils";

type WorkflowTab = keyof MeetingTabs;
type AdminReviewTab = "details" | "attendees" | "gifts" | "expenses" | "finalReport" | "history";
type AdminMeetingTone = "neutral" | "warning" | "success" | "danger";
type AdminMeetingPresentation = {
  tabs: Array<{ key: AdminReviewTab; label: string }>;
  defaultTab: AdminReviewTab;
  isPostMeeting: boolean;
  giftComparisonReady: boolean;
  expenseComparisonReady: boolean;
  showFinalReportContent: boolean;
  showFinalReportAwaiting: boolean;
  notice: { title: string; detail: string; tone: AdminMeetingTone };
};
type ApprovalDecision = "approve" | "correction" | "reject";
type FinalReviewDecision = "approveClose" | "correction";

type ReportFilterState = {
  start: string;
  end: string;
  status: string;
  meetingType: string;
  city: string;
  state: string;
};

type ReportView =
  | "summary"
  | "expenses"
  | "gifts"
  | "dealer"
  | "city"
  | "officer"
  | "market";

type RequestForm = {
  meetingType: string;
  meetingDate: string;
  meetingTime: string;
  city: string;
  state: string;
  location: string;
  customerReference: string;
  expectedAttendees: string;
  objective: string;
  expectedBusinessImpact: string;
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

const REPORT_ALL_VALUE = "all";
const REPORT_STATUS_OPTIONS = [
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
];

const REPORT_VIEW_OPTIONS: Array<{ key: ReportView; label: string }> = [
  { key: "summary", label: "Meeting Summary" },
  { key: "expenses", label: "Planned vs Actual Expenses" },
  { key: "gifts", label: "Planned vs Issued Gifts" },
  { key: "dealer", label: "Dealer Performance" },
  { key: "city", label: "City Performance" },
  { key: "officer", label: "Field Officer Performance" },
  { key: "market", label: "Market Database" },
];

const CORRECTION_STAGE_OPTIONS: Array<{ value: CorrectionStage; label: string }> = [
  { value: "REQUEST", label: "Request plan" },
  { value: "ATTENDEES", label: "Attendees" },
  { value: "ATTENDANCE", label: "Attendance data" },
  { value: "GIFTS", label: "Gifts" },
  { value: "EXPENSES", label: "Expenses" },
  { value: "LEADS", label: "Leads" },
  { value: "FINAL_REPORT", label: "Final Report" },
];

const formatCurrency = (amount?: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(amount || 0));

const formatSignedCurrency = (amount?: number) => {
  const value = Number(amount || 0);
  return `${value > 0 ? "+" : ""}${formatCurrency(value)}`;
};

const formatSignedNumber = (amount?: number) => {
  const value = Number(amount || 0);
  return `${value > 0 ? "+" : ""}${value}`;
};

const formatDate = (value?: string) => {
  if (!value) return "-";
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return format(parsed, "dd MMM yyyy");
};

const timeForInput = (value?: string) => (value ? value.slice(0, 5) : "");
const timeForApi = (value: string) => (value.length === 5 ? `${value}:00` : value);
const formatMeetingTime = (value?: string) => (value ? formatTimeTo12Hour(value) || value : "-");
const cleanMobile = (value?: string) => String(value || "").replace(/\D/g, "");

const emptyReportFilters = (): ReportFilterState => ({
  start: "",
  end: "",
  status: REPORT_ALL_VALUE,
  meetingType: REPORT_ALL_VALUE,
  city: "",
  state: "",
});

const reportFiltersFromMeeting = (meeting: Meeting): ReportFilterState => {
  const filters = emptyReportFilters();
  if (meeting.meetingDate) {
    const parsed = new Date(`${meeting.meetingDate}T00:00:00`);
    if (!Number.isNaN(parsed.getTime())) {
      filters.start = format(startOfMonth(parsed), "yyyy-MM-dd");
      filters.end = format(endOfMonth(parsed), "yyyy-MM-dd");
    }
  }
  return filters;
};

const currentMeetingReportFilters = (meeting: Meeting): ReportFilterState => ({
  start: meeting.meetingDate || "",
  end: meeting.meetingDate || "",
  status: meeting.status || REPORT_ALL_VALUE,
  meetingType: meeting.meetingType || REPORT_ALL_VALUE,
  city: meeting.city || "",
  state: meeting.state || "",
});

const reportFiltersForApi = (filters: ReportFilterState): MeetingFilters => ({
  start: filters.start || undefined,
  end: filters.end || undefined,
  status: filters.status === REPORT_ALL_VALUE ? undefined : filters.status,
  meetingType: filters.meetingType === REPORT_ALL_VALUE ? undefined : filters.meetingType,
  city: filters.city.trim() || undefined,
  state: filters.state.trim() || undefined,
});

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

const POST_MEETING_STATUSES = new Set(["EXECUTED", "EXPENSE_SUBMITTED", "REPORT_SUBMITTED", "CLOSED"]);
const POST_MEETING_CORRECTION_STAGES = new Set(["ATTENDANCE", "GIFTS", "EXPENSES", "LEADS", "FINAL_REPORT"]);
const FINAL_REPORT_STATUSES = new Set(["REPORT_SUBMITTED", "CLOSED"]);

const ADMIN_TAB_LABELS: Record<AdminReviewTab, string> = {
  details: "Request Plan",
  attendees: "Attendees",
  gifts: "Gifts",
  expenses: "Expenses",
  finalReport: "Final Report",
  history: "History",
};

const correctionStageLabel = (stage?: string | null) => {
  const labels: Record<string, string> = {
    REQUEST: "Request Plan",
    ATTENDEES: "Expected Attendees",
    ATTENDANCE: "Attendance",
    GIFTS: "Gifts",
    EXPENSES: "Expenses",
    LEADS: "Leads",
    FINAL_REPORT: "Final Report",
  };
  return labels[String(stage || "")] || "Meeting details";
};

const correctionStageTab = (stage?: string | null): AdminReviewTab => {
  switch (stage) {
    case "ATTENDEES":
    case "ATTENDANCE":
      return "attendees";
    case "GIFTS":
      return "gifts";
    case "EXPENSES":
      return "expenses";
    case "LEADS":
    case "FINAL_REPORT":
      return "finalReport";
    default:
      return "details";
  }
};

const getAdminMeetingPresentation = (meeting: Meeting): AdminMeetingPresentation => {
  const status = String(meeting.status || "");
  const correctionReturnStatus = String(meeting.correctionReturnStatus || "");
  const isCorrection = status === "CORRECTION_REQUIRED";
  const isPostMeetingCorrection =
    isCorrection &&
    (POST_MEETING_STATUSES.has(correctionReturnStatus) || POST_MEETING_CORRECTION_STAGES.has(String(meeting.correctionStage || "")));
  const isPostMeeting = POST_MEETING_STATUSES.has(status) || isPostMeetingCorrection;
  const giftComparisonReady = meeting.giftsCompleted === true || meeting.noGifts === true;
  const expenseComparisonReady = meeting.expensesCompleted === true || meeting.noExpenses === true;
  const showFinalReportContent =
    FINAL_REPORT_STATUSES.has(status) ||
    (isPostMeetingCorrection && hasFinalReportContent(meeting));
  const showFinalReportAwaiting =
    status === "EXPENSE_SUBMITTED" ||
    (isPostMeetingCorrection && correctionReturnStatus === "EXPENSE_SUBMITTED" && !showFinalReportContent);

  const tabKeys: AdminReviewTab[] = ["details", "attendees"];
  if (isPostMeeting) tabKeys.push("gifts", "expenses");
  if (showFinalReportContent || showFinalReportAwaiting) tabKeys.push("finalReport");
  tabKeys.push("history");

  let defaultTab: AdminReviewTab = "details";
  if (status === "EXECUTED") defaultTab = "attendees";
  if (status === "EXPENSE_SUBMITTED") defaultTab = "expenses";
  if (status === "REPORT_SUBMITTED" || status === "CLOSED") defaultTab = "finalReport";
  if (isCorrection) defaultTab = correctionStageTab(meeting.correctionStage);
  if (!tabKeys.includes(defaultTab)) defaultTab = "details";

  let notice: AdminMeetingPresentation["notice"];
  switch (status) {
    case "DRAFT":
      notice = { title: "Draft request", detail: "The field team is still preparing this plan. No admin decision is required yet.", tone: "neutral" };
      break;
    case "PENDING_APPROVAL":
      notice = { title: "Ready for approval", detail: "Review the complete request plan, expected attendees, planned gifts, expenses, and contribution before deciding.", tone: "warning" };
      break;
    case "APPROVED":
      notice = { title: "Scheduled for execution", detail: "The request is approved. Attendance, gifts, and actual expenses will appear after the field team conducts the meeting.", tone: "success" };
      break;
    case "EXECUTED":
      notice = { title: "Meeting conducted", detail: "Attendance is available. Gift and expense differences will become final only after those sections are completed.", tone: "neutral" };
      break;
    case "EXPENSE_SUBMITTED":
      {
        const incompleteSections = [
          meeting.attendanceFinalized !== true ? "attendance" : "",
          !giftComparisonReady ? "gifts" : "",
          !expenseComparisonReady ? "expenses" : "",
        ].filter(Boolean);
        notice = incompleteSections.length
          ? {
              title: "Final report pending with incomplete sections",
              detail: `The workflow is waiting for the final report, but ${incompleteSections.join(", ")} ${incompleteSections.length === 1 ? "is" : "are"} not marked complete by the backend.`,
              tone: "warning",
            }
          : {
              title: "Post-meeting sections complete",
              detail: "Attendance, gifts, and expenses are finalized. The final report is now awaited from the field team.",
              tone: "neutral",
            };
      }
      break;
    case "REPORT_SUBMITTED":
      notice = { title: "Ready for final review", detail: "Compare the approved plan with the actual outcome, then approve and close or request a section correction.", tone: "warning" };
      break;
    case "CLOSED":
      {
        const missingCompletionFlags = [
          meeting.attendanceFinalized !== true ? "attendance" : "",
          !giftComparisonReady ? "gifts" : "",
          !expenseComparisonReady ? "expenses" : "",
        ].filter(Boolean);
        notice = missingCompletionFlags.length
          ? {
              title: "Closed record with missing completion data",
              detail:
                missingCompletionFlags.length === 1
                  ? `This meeting is read-only, but the ${missingCompletionFlags[0]} completion flag is not recorded. Saved actual values are shown without final variance conclusions.`
                  : `This meeting is read-only, but completion flags for ${missingCompletionFlags.join(", ")} are not recorded. Saved actual values are shown without final variance conclusions.`,
              tone: "warning",
            }
          : {
              title: "Meeting closed",
              detail: "This is the final read-only meeting record. Review the final report, comparisons, and history as needed.",
              tone: "success",
            };
      }
      break;
    case "CORRECTION_REQUIRED":
      notice = {
        title: `${correctionStageLabel(meeting.correctionStage)} correction requested`,
        detail: meeting.correctionRemarks || "The field team must correct this section and resubmit it before the workflow can continue.",
        tone: "warning",
      };
      break;
    case "REJECTED":
      notice = { title: "Meeting rejected", detail: meeting.rejectionReason || meeting.approvalRemarks || "This request will not move forward.", tone: "danger" };
      break;
    case "CANCELLED":
      notice = { title: "Meeting cancelled", detail: meeting.cancellationReason || meeting.cancellationRemarks || "This meeting will not move forward.", tone: "danger" };
      break;
    default:
      notice = { title: getMeetingStatusLabel(meeting), detail: "Review the available meeting information and history for the current stage.", tone: "neutral" };
  }

  return {
    tabs: tabKeys.map((key) => ({ key, label: key === "attendees" && isPostMeeting ? "Attendance" : ADMIN_TAB_LABELS[key] })),
    defaultTab,
    isPostMeeting,
    giftComparisonReady,
    expenseComparisonReady,
    showFinalReportContent,
    showFinalReportAwaiting,
    notice,
  };
};

const isPostMeetingStatus = (status?: string) => POST_MEETING_STATUSES.has(String(status || ""));

const getActualAttendanceCount = (meeting: Meeting) =>
  meeting.actualAttendeeCount ?? (meeting.attendees || []).filter((attendee) => attendee.present).length;

const hasFinalReportContent = (meeting: Meeting) =>
  Boolean(
    meeting.meetingSummary ||
      meeting.keyDiscussionPoints ||
      meeting.leadsGenerated ||
      meeting.leadCount ||
      meeting.leadDetails ||
      meeting.interestedCustomers ||
      meeting.competitorInformation ||
      meeting.actualBusinessOutcome ||
      meeting.finalRemarks ||
      meeting.finalReportApprovalRemarks
  );

const normalizeConfigNames = (items: MeetingConfigItem[] | string[] | undefined, fallback: readonly string[]) => {
  if (!items?.length) return [...fallback];
  const names = items
    .map((item) => (typeof item === "string" ? item : item.active === false ? "" : item.name))
    .map((name) => name.trim())
    .filter(Boolean);
  return names.length ? Array.from(new Set(names)) : [...fallback];
};

const withCurrentOption = (options: string[], current?: string | null) => {
  const trimmed = String(current || "").trim();
  if (!trimmed || options.includes(trimmed)) return options;
  return [...options, trimmed];
};

const parsePlanArray = <T,>(value: unknown): T[] => {
  if (Array.isArray(value)) return value as T[];
  if (typeof value !== "string" || !value.trim()) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
};

const splitPlainPlanItems = (value: unknown) => {
  if (typeof value !== "string" || !value.trim()) return [];
  try {
    JSON.parse(value);
    return [];
  } catch {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
};

const normalizeGroupKey = (value?: string | null) => String(value || "Other").trim() || "Other";

const getPlannedExpenses = (meeting: Meeting): MeetingExpense[] =>
  parsePlanArray<MeetingExpense>(meeting.plan?.plannedExpenseDetails);

const getPlannedGifts = (meeting: Meeting): MeetingGift[] => {
  const detailed = parsePlanArray<MeetingGift>(meeting.plan?.plannedGiftDetails);
  if (detailed.length) return detailed;

  const expected = parsePlanArray<MeetingGift>(meeting.plan?.expectedGiftsMaterials);
  if (expected.length) return expected;

  const directExpected = parsePlanArray<MeetingGift>(meeting.expectedGiftsMaterials);
  if (directExpected.length) return directExpected;

  return splitPlainPlanItems(meeting.expectedGiftsMaterials || meeting.plan?.expectedGiftsMaterials).map((giftItem) => ({
    giftItem,
    quantity: 0,
  }));
};

const getExpenseComparisonRows = (meeting: Meeting) => {
  const rowMap = new Map<
    string,
    { head: string; planned: number; actual: number; company: number; dealer: number; difference: number }
  >();

  getPlannedExpenses(meeting).forEach((expense) => {
    const head = normalizeGroupKey(expense.expenseHead);
    const row = rowMap.get(head) || { head, planned: 0, actual: 0, company: 0, dealer: 0, difference: 0 };
    row.planned += Number(expense.amount || 0);
    rowMap.set(head, row);
  });

  (meeting.expenses || []).forEach((expense) => {
    const head = normalizeGroupKey(expense.expenseHead);
    const row = rowMap.get(head) || { head, planned: 0, actual: 0, company: 0, dealer: 0, difference: 0 };
    const amount = Number(expense.amount || 0);
    row.actual += amount;
    row.company += Number(expense.companyAmount ?? (expense.paidBy === "COMPANY" ? amount : 0) ?? 0);
    row.dealer += Number(expense.dealerAmount ?? (expense.paidBy === "DEALER" ? amount : 0) ?? 0);
    rowMap.set(head, row);
  });

  return Array.from(rowMap.values())
    .map((row) => ({ ...row, difference: row.actual - row.planned }))
    .sort((a, b) => a.head.localeCompare(b.head));
};

const getGiftComparisonRows = (meeting: Meeting) => {
  const rowMap = new Map<string, { item: string; planned: number; issued: number; difference: number; estimatedAmount: number }>();

  getPlannedGifts(meeting).forEach((gift) => {
    const item = normalizeGroupKey(gift.giftItem);
    const row = rowMap.get(item) || { item, planned: 0, issued: 0, difference: 0, estimatedAmount: 0 };
    row.planned += Number(gift.quantity || 0);
    row.estimatedAmount += Number(gift.estimatedAmount || 0);
    rowMap.set(item, row);
  });

  (meeting.gifts || []).forEach((gift) => {
    const item = normalizeGroupKey(gift.giftItem);
    const row = rowMap.get(item) || { item, planned: 0, issued: 0, difference: 0, estimatedAmount: 0 };
    row.issued += Number(gift.quantity || 0);
    rowMap.set(item, row);
  });

  return Array.from(rowMap.values())
    .map((row) => ({ ...row, difference: row.issued - row.planned }))
    .sort((a, b) => a.item.localeCompare(b.item));
};

const getMeetingActualExpenseTotal = (meeting: Meeting) =>
  (meeting.expenses || []).reduce((sum, expense) => sum + Number(expense.amount || 0), 0);

const getMeetingCompanyPaidTotal = (meeting: Meeting) =>
  (meeting.expenses || []).reduce((sum, expense) => {
    const fallbackAmount = expense.paidBy === "COMPANY" ? expense.amount : 0;
    return sum + Number(expense.companyAmount ?? fallbackAmount ?? 0);
  }, 0);

const getMeetingDealerPaidTotal = (meeting: Meeting) =>
  (meeting.expenses || []).reduce((sum, expense) => {
    const fallbackAmount = expense.paidBy === "DEALER" ? expense.amount : 0;
    return sum + Number(expense.dealerAmount ?? fallbackAmount ?? 0);
  }, 0);

const getMeetingIssuedGiftQuantity = (meeting: Meeting) =>
  (meeting.gifts || []).reduce((sum, gift) => sum + Number(gift.quantity || 0), 0);

const getMeetingDealerLabel = (meeting: Meeting) =>
  meeting.storeName || meeting.dealerName || meeting.customerReference || "Unassigned";

const getReportExpenseRows = (meetings: Meeting[]) => {
  const rowMap = new Map<
    string,
    { head: string; planned: number; actual: number; company: number; dealer: number; difference: number }
  >();

  meetings.forEach((meeting) => {
    getExpenseComparisonRows(meeting).forEach((expense) => {
      const row = rowMap.get(expense.head) || {
        head: expense.head,
        planned: 0,
        actual: 0,
        company: 0,
        dealer: 0,
        difference: 0,
      };
      row.planned += expense.planned;
      row.actual += expense.actual;
      row.company += expense.company;
      row.dealer += expense.dealer;
      rowMap.set(expense.head, row);
    });
  });

  return Array.from(rowMap.values())
    .map((row) => ({ ...row, difference: row.actual - row.planned }))
    .sort((a, b) => b.actual - a.actual);
};

const getReportGiftRows = (meetings: Meeting[]) => {
  const rowMap = new Map<string, { item: string; planned: number; issued: number; difference: number; estimatedAmount: number }>();

  meetings.forEach((meeting) => {
    getGiftComparisonRows(meeting).forEach((gift) => {
      const row = rowMap.get(gift.item) || {
        item: gift.item,
        planned: 0,
        issued: 0,
        difference: 0,
        estimatedAmount: 0,
      };
      row.planned += gift.planned;
      row.issued += gift.issued;
      row.estimatedAmount += gift.estimatedAmount;
      rowMap.set(gift.item, row);
    });
  });

  return Array.from(rowMap.values())
    .map((row) => ({ ...row, difference: row.issued - row.planned }))
    .sort((a, b) => b.issued - a.issued);
};

const getReportPerformanceRows = (meetings: Meeting[], groupBy: (meeting: Meeting) => string) => {
  const rowMap = new Map<
    string,
    {
      label: string;
      meetings: number;
      expectedBudget: number;
      actualExpenses: number;
      expectedTurnout: number;
      actualAttendance: number;
      giftsIssued: number;
      leads: number;
    }
  >();

  meetings.forEach((meeting) => {
    const label = groupBy(meeting) || "Unassigned";
    const row = rowMap.get(label) || {
      label,
      meetings: 0,
      expectedBudget: 0,
      actualExpenses: 0,
      expectedTurnout: 0,
      actualAttendance: 0,
      giftsIssued: 0,
      leads: 0,
    };
    row.meetings += 1;
    row.expectedBudget += Number(meeting.expectedBudget || 0);
    row.actualExpenses += getMeetingActualExpenseTotal(meeting);
    row.expectedTurnout += Number(meeting.expectedAttendees || meeting.attendees?.length || 0);
    row.actualAttendance += getActualAttendanceCount(meeting);
    row.giftsIssued += getMeetingIssuedGiftQuantity(meeting);
    row.leads += Number(meeting.leadCount || 0);
    rowMap.set(label, row);
  });

  return Array.from(rowMap.values()).sort((a, b) => b.meetings - a.meetings || a.label.localeCompare(b.label));
};

const getMarketDatabaseRows = (meetings: Meeting[]) => {
  const rowMap = new Map<
    string,
    {
      name: string;
      mobile: string;
      category: string;
      cityArea: string;
      companyShopProject: string;
      meetingType: string;
      dealer: string;
      status: string;
    }
  >();

  meetings.forEach((meeting) => {
    (meeting.attendees || []).forEach((attendee) => {
      const mobile = cleanMobile(attendee.mobileNumber);
      const key = mobile || `${meeting.id}-${attendee.name}-${attendee.category}`;
      if (rowMap.has(key)) return;
      rowMap.set(key, {
        name: attendee.name || "-",
        mobile: mobile || "-",
        category: attendee.category || "-",
        cityArea: attendee.cityArea || meeting.city || "-",
        companyShopProject: attendee.companyShopProject || "-",
        meetingType: meeting.meetingType || "-",
        dealer: getMeetingDealerLabel(meeting),
        status: attendee.present ? "Present" : attendee.expected === false ? "Walk-in" : "Expected",
      });
    });
  });

  return Array.from(rowMap.values()).sort((a, b) => a.name.localeCompare(b.name));
};

const getDraftMissingItems = (meeting: Meeting) => {
  const missing: string[] = [];
  if (!meeting.meetingType) missing.push("meeting type");
  if (!meeting.meetingDate) missing.push("date");
  if (!meeting.meetingTime) missing.push("time");
  if (!meeting.city) missing.push("city");
  if (!meeting.state) missing.push("state");
  if (!meeting.location) missing.push("location");
  if (!meeting.objective) missing.push("purpose");
  if (meeting.expectedBudget == null) missing.push("expected budget");
  if (!meeting.expectedBusinessImpact) missing.push("expected impact");
  if (!meeting.attendees?.length) missing.push("expected attendees");
  return missing;
};

const requestFormFromMeeting = (meeting: Meeting): RequestForm => ({
  meetingType: meeting.meetingType || "Dealer",
  meetingDate: meeting.meetingDate || "",
  meetingTime: timeForInput(meeting.meetingTime),
  city: meeting.city || "",
  state: meeting.state || "",
  location: meeting.location || "",
  customerReference: meeting.customerReference || "",
  expectedAttendees: meeting.expectedAttendees == null ? "" : String(meeting.expectedAttendees),
  objective: meeting.objective || "",
  expectedBusinessImpact: meeting.expectedBusinessImpact || "",
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

function ReadOnlyField({ label, value }: { label: string; value?: ReactNode }) {
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

function ExpectedGiftsDisplay({ gifts, fallback }: { gifts: MeetingGift[]; fallback?: unknown }) {
  const plainItems = gifts.length ? [] : splitPlainPlanItems(fallback);

  if (!gifts.length && !plainItems.length) {
    return <span>-</span>;
  }

  if (gifts.length) {
    return (
      <div className="space-y-1.5">
        {gifts.map((gift, index) => {
          const amount = Number(gift.estimatedAmount || 0);
          return (
            <div key={`${gift.giftItem || "gift"}-${index}`} className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span>{gift.giftItem || "Gift"}</span>
              <span className="text-muted-foreground">Qty {Number(gift.quantity || 0)}</span>
              {amount > 0 && <span className="text-muted-foreground">{formatCurrency(amount)}</span>}
              {gift.remarks && <span className="text-muted-foreground">{gift.remarks}</span>}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {plainItems.map((item, index) => (
        <div key={`${item}-${index}`}>{item}</div>
      ))}
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

function CompletionStateNotice({
  title,
  detail,
  state,
}: {
  title: string;
  detail: string;
  state: "complete" | "pending" | "none";
}) {
  const isComplete = state === "complete" || state === "none";

  return (
    <div
      className={`flex items-start gap-3 rounded-lg border px-4 py-3 text-sm ${
        isComplete ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-800"
      }`}
    >
      {isComplete ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />}
      <div className="space-y-1">
        <div className="font-bold">{title}</div>
        <div className="text-xs leading-5 opacity-90">{detail}</div>
      </div>
    </div>
  );
}

function AdminStageNotice({ notice }: { notice: AdminMeetingPresentation["notice"] }) {
  const toneClass: Record<AdminMeetingTone, string> = {
    neutral: "border-border bg-muted/30 text-foreground",
    warning: "border-amber-200 bg-amber-50 text-amber-900",
    success: "border-emerald-200 bg-emerald-50 text-emerald-900",
    danger: "border-red-200 bg-red-50 text-red-900",
  };

  return (
    <div className={`flex items-start gap-3 rounded-lg border px-4 py-3 text-sm ${toneClass[notice.tone]}`}>
      {notice.tone === "danger" || notice.tone === "warning" ? (
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      ) : notice.tone === "success" ? (
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
      ) : (
        <FileText className="mt-0.5 h-4 w-4 shrink-0" />
      )}
      <div className="space-y-1">
        <div className="font-bold">{notice.title}</div>
        <div className="text-xs leading-5 opacity-90">{notice.detail}</div>
      </div>
    </div>
  );
}

function ExpenseLedgerCard({
  label,
  value,
  tag,
  tagTone = "success",
  metrics,
}: {
  label: string;
  value: ReactNode;
  tag?: string;
  tagTone?: "success" | "warning";
  metrics: Array<{ label: string; value: ReactNode; valueClassName?: string }>;
}) {
  return (
    <Card className="gap-0 rounded-lg border-border/80 py-0 shadow-sm transition-colors hover:border-border hover:bg-muted/10">
      <CardContent className="flex min-h-[156px] flex-col justify-between gap-4 p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1.5">
            <div className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{label}</div>
            <div className="break-words text-2xl font-extrabold tracking-tight text-foreground">{value}</div>
          </div>
          {tag && (
            <Badge
              variant="outline"
              className={
                tagTone === "warning"
                  ? "border-amber-200 bg-amber-50 text-amber-700"
                  : "border-emerald-200 bg-emerald-50 text-emerald-700"
              }
            >
              {tag}
            </Badge>
          )}
        </div>
        <div className={`grid gap-3 border-t border-dashed pt-4 ${metrics.length > 2 ? "grid-cols-3" : "grid-cols-2"}`}>
          {metrics.map((metric) => (
            <div key={metric.label} className="min-w-0">
              <div className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{metric.label}</div>
              <div className={`mt-1 break-words text-sm font-extrabold text-foreground ${metric.valueClassName || ""}`}>
                {metric.value}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

type MeetingKpiSubMetric = {
  label: string;
  value: ReactNode;
  valueClassName?: string;
};

type MeetingKpiGridProps = {
  status?: string;
  statusValue: ReactNode;
  secondaryLabel: string;
  secondaryValue: ReactNode;
  secondaryClassName?: string;
  financialLabel: string;
  financialValue: ReactNode;
  financialSubMetrics: MeetingKpiSubMetric[];
  attendanceLabel: string;
  attendanceValue: ReactNode;
  attendanceSubMetrics: MeetingKpiSubMetric[];
};

const statusDotClass = (status?: string) => {
  switch (status) {
    case "APPROVED":
      return "bg-blue-500 shadow-blue-500/30";
    case "PENDING_APPROVAL":
    case "DRAFT":
      return "bg-amber-500 shadow-amber-500/30";
    case "EXECUTED":
    case "EXPENSE_SUBMITTED":
    case "REPORT_SUBMITTED":
      return "bg-purple-500 shadow-purple-500/30";
    case "CLOSED":
      return "bg-emerald-500 shadow-emerald-500/30";
    case "REJECTED":
    case "CANCELLED":
      return "bg-red-500 shadow-red-500/30";
    case "CORRECTION_REQUIRED":
      return "bg-orange-500 shadow-orange-500/30";
    default:
      return "bg-muted-foreground shadow-muted-foreground/20";
  }
};

function KpiSubMetrics({ metrics }: { metrics: MeetingKpiSubMetric[] }) {
  return (
    <div className={`grid border-t bg-muted/20 ${metrics.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
      {metrics.map((metric, index) => (
        <div key={metric.label} className={`px-5 py-3 ${index > 0 ? "border-l" : ""}`}>
          <div className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{metric.label}</div>
          <div className={`mt-1 text-sm font-bold text-foreground ${metric.valueClassName || ""}`}>{metric.value ?? "-"}</div>
        </div>
      ))}
    </div>
  );
}

function MeetingKpiGrid({
  status,
  statusValue,
  secondaryLabel,
  secondaryValue,
  secondaryClassName = "",
  financialLabel,
  financialValue,
  financialSubMetrics,
  attendanceLabel,
  attendanceValue,
  attendanceSubMetrics,
}: MeetingKpiGridProps) {
  return (
    <div className="grid gap-4 xl:grid-cols-3">
      <Card className="gap-0 overflow-hidden rounded-lg border-border/80 py-0 shadow-sm transition-colors hover:border-border hover:bg-muted/10">
        <CardContent className="grid min-h-[132px] grid-cols-2 p-0">
          <div className="flex flex-col justify-center gap-2 px-5 py-5">
            <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Status</span>
            <span className="inline-flex items-center gap-2 text-base font-extrabold text-foreground">
              <span className={`h-2 w-2 rounded-full shadow-[0_0_0_4px] ${statusDotClass(status)}`} />
              {statusValue}
            </span>
          </div>
          <div className="flex flex-col justify-center gap-2 border-l px-5 py-5">
            <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{secondaryLabel}</span>
            <span className={`inline-flex w-fit items-center rounded-md border border-primary/20 bg-primary/10 px-2.5 py-1 text-sm font-bold text-primary ${secondaryClassName}`}>
              {secondaryValue}
            </span>
          </div>
        </CardContent>
      </Card>

      <Card className="gap-0 overflow-hidden rounded-lg border-border/80 py-0 shadow-sm transition-colors hover:border-border hover:bg-muted/10">
        <CardContent className="p-0">
          <div className="flex min-h-[86px] items-center justify-between gap-4 px-5 py-5">
            <div className="min-w-0">
              <div className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{financialLabel}</div>
              <div className="mt-1 break-words text-2xl font-extrabold tracking-tight text-foreground">{financialValue}</div>
            </div>
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-emerald-500/20 bg-emerald-500/10 text-emerald-600">
              <IndianRupee className="h-5 w-5" />
            </span>
          </div>
          <KpiSubMetrics metrics={financialSubMetrics} />
        </CardContent>
      </Card>

      <Card className="gap-0 overflow-hidden rounded-lg border-border/80 py-0 shadow-sm transition-colors hover:border-border hover:bg-muted/10">
        <CardContent className="p-0">
          <div className="flex min-h-[86px] items-center justify-between gap-4 px-5 py-5">
            <div className="min-w-0">
              <div className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{attendanceLabel}</div>
              <div className="mt-1 break-words text-2xl font-extrabold tracking-tight text-foreground">{attendanceValue}</div>
            </div>
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
              <UserCheck className="h-5 w-5" />
            </span>
          </div>
          <KpiSubMetrics metrics={attendanceSubMetrics} />
        </CardContent>
      </Card>
    </div>
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

function ReportSectionCard({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-lg border">
      <div className="border-b bg-muted/20 px-5 py-4">
        <h4 className="text-base font-bold">{title}</h4>
      </div>
      <div className="p-0">{children}</div>
    </section>
  );
}

function ReportEmptyState({ label }: { label: string }) {
  return <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">{label}</div>;
}

function ReportPerformanceTable({
  rows,
  labelHeader,
}: {
  rows: Array<{
    label: string;
    meetings: number;
    expectedBudget: number;
    actualExpenses: number;
    expectedTurnout: number;
    actualAttendance: number;
    giftsIssued: number;
    leads: number;
  }>;
  labelHeader: string;
}) {
  if (!rows.length) return <ReportEmptyState label="No report rows found." />;

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{labelHeader}</TableHead>
          <TableHead>Meetings</TableHead>
          <TableHead>Budget</TableHead>
          <TableHead>Actual Expense</TableHead>
          <TableHead>Attendance</TableHead>
          <TableHead>Gifts</TableHead>
          <TableHead>Leads</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.label}>
            <TableCell className="font-medium">{row.label}</TableCell>
            <TableCell>{row.meetings}</TableCell>
            <TableCell>{formatCurrency(row.expectedBudget)}</TableCell>
            <TableCell>{formatCurrency(row.actualExpenses)}</TableCell>
            <TableCell>
              {row.actualAttendance}/{row.expectedTurnout}
            </TableCell>
            <TableCell>{row.giftsIssued}</TableCell>
            <TableCell>{row.leads}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export default function MeetingDetail({ meetingId }: { meetingId: number }) {
  const router = useRouter();
  const { userRole, currentUser } = useAuth();
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [activeTab, setActiveTab] = useState<WorkflowTab>("request");
  const [adminTab, setAdminTab] = useState<AdminReviewTab>("details");
  const [activeReportView, setActiveReportView] = useState<ReportView>("summary");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [meetingTypes, setMeetingTypes] = useState<string[]>([...MEETING_TYPES]);
  const [giftItemOptions, setGiftItemOptions] = useState<string[]>([]);
  const [expenseHeadOptions, setExpenseHeadOptions] = useState<string[]>([...EXPENSE_HEADS]);

  const [requestForm, setRequestForm] = useState<RequestForm | null>(null);
  const [attendees, setAttendees] = useState<MeetingAttendee[]>([]);
  const [approvalDecision, setApprovalDecision] = useState<ApprovalDecision>("approve");
  const [approvalRemarks, setApprovalRemarks] = useState("");
  const [correctionStage, setCorrectionStage] = useState<CorrectionStage>("REQUEST");
  const [finalCorrectionStage, setFinalCorrectionStage] = useState<CorrectionStage>("FINAL_REPORT");
  const [auditHistory, setAuditHistory] = useState<MeetingAuditHistory[]>([]);
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
    leadCount: undefined,
    leadDetails: "",
    interestedCustomers: "",
    competitorInformation: "",
    actualBusinessOutcome: "",
    finalRemarks: "",
  });
  const [finalReviewDecision, setFinalReviewDecision] = useState<FinalReviewDecision>("approveClose");
  const [finalApprovalRemarks, setFinalApprovalRemarks] = useState("");
  const [closeRemarks, setCloseRemarks] = useState("");
  const [cancelRemarks, setCancelRemarks] = useState("");
  const [isApprovalDecisionOpen, setIsApprovalDecisionOpen] = useState(false);
  const [isFinalReviewDecisionOpen, setIsFinalReviewDecisionOpen] = useState(false);
  const [isCancelMeetingOpen, setIsCancelMeetingOpen] = useState(false);
  const [isExportingReport, setIsExportingReport] = useState(false);
  const [isReportFiltersOpen, setIsReportFiltersOpen] = useState(false);
  const [reportFilters, setReportFilters] = useState<ReportFilterState>(emptyReportFilters);
  const [reportMeetings, setReportMeetings] = useState<Meeting[]>([]);

  const loadConfig = async () => {
    meetingsApi
      .getMeetingTypes()
      .then((items) => setMeetingTypes(normalizeConfigNames(items, MEETING_TYPES)))
      .catch(() => setMeetingTypes([...MEETING_TYPES]));

    meetingsApi
      .getGiftItems()
      .then((items) => setGiftItemOptions(normalizeConfigNames(items, [])))
      .catch(() => setGiftItemOptions([]));

    meetingsApi
      .getExpenseHeads()
      .then((items) => setExpenseHeadOptions(normalizeConfigNames(items, EXPENSE_HEADS)))
      .catch(() => setExpenseHeadOptions([...EXPENSE_HEADS]));
  };

  const loadMeeting = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await meetingsApi.getMeetingById(meetingId);
      setMeeting(data);
      setAdminTab(getAdminMeetingPresentation(data).defaultTab);
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
        leadCount: data.leadCount,
        leadDetails: data.leadDetails || "",
        interestedCustomers: data.interestedCustomers || "",
        competitorInformation: data.competitorInformation || "",
        actualBusinessOutcome: data.actualBusinessOutcome || "",
        finalRemarks: data.finalRemarks || "",
      });
      setFinalApprovalRemarks(data.finalReportApprovalRemarks || "");
      setCloseRemarks(data.finalRemarks || "");
      setAuditHistory(data.auditHistory || []);
      setReportFilters(currentMeetingReportFilters(data));
      try {
        const reportData = await meetingsApi.getReportById(meetingId);
        setReportMeetings([reportData]);
      } catch {
        setReportMeetings([data]);
      }
      if (!data.auditHistory?.length) {
        meetingsApi.getMeetingAudit(meetingId).then(setAuditHistory).catch(() => setAuditHistory([]));
      }

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
    loadConfig();
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
    () => {
      const detailTotal = (meeting?.expenses || []).reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
      return meeting?.expenses?.length ? detailTotal : Number(meeting?.actualExpenseTotal || 0);
    },
    [meeting]
  );

  const companyPaidTotal = useMemo(
    () =>
      (meeting?.expenses || []).reduce((sum, expense) => {
        const fallbackAmount = expense.paidBy === "COMPANY" ? expense.amount : 0;
        return sum + Number(expense.companyAmount ?? fallbackAmount ?? 0);
      }, 0),
    [meeting]
  );

  const dealerPaidTotal = useMemo(
    () =>
      (meeting?.expenses || []).reduce((sum, expense) => {
        const fallbackAmount = expense.paidBy === "DEALER" ? expense.amount : 0;
        return sum + Number(expense.dealerAmount ?? fallbackAmount ?? 0);
      }, 0),
    [meeting]
  );

  const plannedExpenses = useMemo(() => (meeting ? getPlannedExpenses(meeting) : []), [meeting]);
  const plannedGifts = useMemo(() => (meeting ? getPlannedGifts(meeting) : []), [meeting]);
  const expenseComparisonRows = useMemo(() => (meeting ? getExpenseComparisonRows(meeting) : []), [meeting]);
  const giftComparisonRows = useMemo(() => (meeting ? getGiftComparisonRows(meeting) : []), [meeting]);
  const plannedExpenseTotal = useMemo(
    () => {
      const detailTotal = plannedExpenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
      return plannedExpenses.length ? detailTotal : Number(meeting?.plannedExpenseTotal || 0);
    },
    [meeting?.plannedExpenseTotal, plannedExpenses]
  );
  const plannedCompanyContribution = Number(meeting?.plan?.companyContribution || 0);
  const plannedDealerContribution = Number(meeting?.plan?.dealerContribution || 0);
  const plannedGiftQuantity = useMemo(
    () => plannedGifts.reduce((sum, gift) => sum + Number(gift.quantity || 0), 0),
    [plannedGifts]
  );
  const issuedGiftQuantity = useMemo(
    () =>
      meeting?.gifts?.length
        ? getMeetingIssuedGiftQuantity(meeting)
        : Number(meeting?.actualGiftQuantity || 0),
    [meeting]
  );
  const reportExpenseRows = useMemo(() => getReportExpenseRows(reportMeetings), [reportMeetings]);
  const reportGiftRows = useMemo(() => getReportGiftRows(reportMeetings), [reportMeetings]);
  const dealerPerformanceRows = useMemo(
    () => getReportPerformanceRows(reportMeetings, getMeetingDealerLabel),
    [reportMeetings]
  );
  const cityPerformanceRows = useMemo(
    () => getReportPerformanceRows(reportMeetings, (item) => [item.city, item.state].filter(Boolean).join(", ") || "Unassigned"),
    [reportMeetings]
  );
  const fieldOfficerPerformanceRows = useMemo(
    () => getReportPerformanceRows(reportMeetings, (item) => item.creatorName || (item.creatorId ? `Employee #${item.creatorId}` : "Unassigned")),
    [reportMeetings]
  );
  const marketDatabaseRows = useMemo(() => getMarketDatabaseRows(reportMeetings), [reportMeetings]);
  const reportMeetingTypeOptions = useMemo(
    () => withCurrentOption(meetingTypes, reportFilters.meetingType === REPORT_ALL_VALUE ? undefined : reportFilters.meetingType),
    [meetingTypes, reportFilters.meetingType]
  );
  const activeReportMeta = useMemo(
    () => REPORT_VIEW_OPTIONS.find((option) => option.key === activeReportView) || REPORT_VIEW_OPTIONS[0],
    [activeReportView]
  );
  const activeReportCount = useMemo(() => {
    switch (activeReportView) {
      case "summary":
        return reportMeetings.length;
      case "expenses":
        return reportExpenseRows.length;
      case "gifts":
        return reportGiftRows.length;
      case "dealer":
        return dealerPerformanceRows.length;
      case "city":
        return cityPerformanceRows.length;
      case "officer":
        return fieldOfficerPerformanceRows.length;
      case "market":
        return marketDatabaseRows.length;
      default:
        return 0;
    }
  }, [
    activeReportView,
    cityPerformanceRows.length,
    dealerPerformanceRows.length,
    fieldOfficerPerformanceRows.length,
    marketDatabaseRows.length,
    reportExpenseRows.length,
    reportGiftRows.length,
    reportMeetings.length,
  ]);
  const typeOptions = useMemo(() => withCurrentOption(meetingTypes, requestForm?.meetingType), [meetingTypes, requestForm?.meetingType]);
  const currentGiftOptions = useMemo(
    () => gifts.reduce((options, gift) => withCurrentOption(options, gift.giftItem), giftItemOptions),
    [giftItemOptions, gifts]
  );
  const currentExpenseHeadOptions = useMemo(
    () => expenses.reduce((options, expense) => withCurrentOption(options, expense.expenseHead), expenseHeadOptions),
    [expenseHeadOptions, expenses]
  );

  const isAdmin = hasAdminSetupPrivileges(userRole, currentUser);
  const hasBackendActionContract = Array.isArray(meeting?.allowedActions);
  const isActionAllowed = (action: Parameters<typeof hasMeetingAction>[1], legacyFallback: boolean) =>
    Boolean(meeting && (hasMeetingAction(meeting, action) || (!hasBackendActionContract && legacyFallback)));

  const canEditRequest = isActionAllowed("EDIT_REQUEST", Boolean(meeting && ["DRAFT", "CORRECTION_REQUIRED"].includes(meeting.status)));
  const canSubmit = Boolean(!isAdmin && isActionAllowed("SUBMIT", Boolean(meeting && ["DRAFT", "CORRECTION_REQUIRED"].includes(meeting.status))));
  const canApprove = isActionAllowed("APPROVE", meeting?.status === "PENDING_APPROVAL");
  const canReject = isActionAllowed("REJECT", meeting?.status === "PENDING_APPROVAL");
  const canRequestCorrection = isActionAllowed("REQUEST_CORRECTION", meeting?.status === "PENDING_APPROVAL");
  const canExecute = isActionAllowed("EXECUTE", meeting?.status === "APPROVED");
  const canMarkAttendance = isActionAllowed("MARK_ATTENDANCE", Boolean(meeting && ["APPROVED", "EXECUTED"].includes(meeting.status)));
  const canIssueGifts = Boolean(
    meeting &&
      isMeetingTabEnabled(meeting, "gifts") &&
      meeting.attendanceFinalized === true &&
      ["EXECUTED", "EXPENSE_SUBMITTED", "REPORT_SUBMITTED"].includes(meeting.status)
  );
  const canSubmitExpenses = isActionAllowed("SUBMIT_EXPENSES", meeting?.status === "EXECUTED");
  const canSubmitFinalReport = isActionAllowed("SUBMIT_FINAL_REPORT", meeting?.status === "EXPENSE_SUBMITTED");
  const canApproveFinalReport = isActionAllowed("APPROVE_FINAL_REPORT", meeting?.status === "REPORT_SUBMITTED");
  const canClose =
    isActionAllowed("APPROVE_AND_CLOSE", false) || isActionAllowed("CLOSE", meeting?.status === "REPORT_SUBMITTED");
  const canCancel = isActionAllowed("CANCEL", Boolean(meeting && ["DRAFT", "PENDING_APPROVAL", "APPROVED"].includes(meeting.status)));

  const runAction = async (callback: () => Promise<unknown>, successMessage: string) => {
    setIsSaving(true);
    setError(null);
    setMessage(null);
    try {
      await callback();
      setMessage(successMessage);
      await loadMeeting();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed.");
      return false;
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
    const namedAttendeeCount = normaliseAttendees(attendees).length;
    const expectedTurnout = Number(requestForm.expectedAttendees || namedAttendeeCount);
    if (!Number.isFinite(expectedTurnout) || expectedTurnout < namedAttendeeCount) {
      setError("Expected turnout cannot be lower than named attendees.");
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
          expectedAttendees: expectedTurnout,
          objective: requestForm.objective.trim(),
          expectedBusinessImpact: requestForm.expectedBusinessImpact.trim() || undefined,
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
    if (!meeting) return false;
    if (action === "correction" && !correctionStage) {
      setError("Select the section that needs correction.");
      return false;
    }
    const selectedCorrectionLabel =
      CORRECTION_STAGE_OPTIONS.find((option) => option.value === correctionStage)?.label || "selected section";
    const trimmedRemarks = approvalRemarks.trim();
    const payload = {
      approvalRemarks:
        trimmedRemarks ||
        (action === "reject"
          ? "Rejected by approver."
          : action === "correction"
            ? `Correction requested for ${selectedCorrectionLabel}.`
            : ""),
    };
    let ok = false;
    if (action === "approve") {
      ok = await runAction(() => meetingsApi.approveMeeting(meeting.id, payload), "Meeting approved.");
    } else if (action === "reject") {
      ok = await runAction(() => meetingsApi.rejectMeeting(meeting.id, payload), "Meeting rejected.");
    } else {
      ok = await runAction(
        () =>
          meetingsApi.requestCorrection(meeting.id, {
            ...payload,
            correctionStage,
            correctionRemarks: trimmedRemarks || `Correction requested for ${selectedCorrectionLabel}.`,
          }),
        "Meeting sent for correction."
      );
    }
    if (ok) {
      setApprovalRemarks("");
      setApprovalDecision("approve");
    }
    return ok;
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

    await runAction(
      () =>
        meetingsApi.finaliseAttendance(meeting.id, {
          actualMeetingDate: executionForm.actualMeetingDate || meeting.actualMeetingDate || meeting.meetingDate || "",
          actualMeetingTime: timeForApi(executionForm.actualMeetingTime || timeForInput(meeting.actualMeetingTime || meeting.meetingTime)),
          actualLocation: executionForm.actualLocation.trim() || meeting.actualLocation || meeting.location || "",
          executionRemarks: executionForm.executionRemarks.trim() || undefined,
          attendees: payload.map((attendee) => ({
            ...attendee,
            attendanceSource: "FINAL_MANUAL",
          })),
        }),
      "Attendance finalised."
    );
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

    const issuedPairs = new Set<string>();
    for (const gift of cleaned) {
      const key = `${gift.meetingAttendeeId}:${gift.giftItem.toLowerCase()}`;
      if (issuedPairs.has(key)) {
        setError("The same attendee cannot receive the same gift item twice.");
        return;
      }
      issuedPairs.add(key);
    }

    await runAction(() => meetingsApi.saveGifts(meeting.id, cleaned), "Gifts saved.");
  };

  const removeGift = async (index: number) => {
    if (!meeting) return;
    const gift = gifts[index];
    if (gift?.id) {
      await runAction(() => meetingsApi.deleteGift(meeting.id, gift.id as number), "Gift removed.");
      return;
    }
    setGifts((prev) => prev.filter((_, currentIndex) => currentIndex !== index));
  };

  const markNoGifts = async () => {
    if (!meeting) return;
    await runAction(() => meetingsApi.markNoGifts(meeting.id), "Marked as no gifts distributed.");
  };

  const submitExpenses = async () => {
    if (!meeting) return;
    const cleaned = expenses
      .map((expense) => ({
        ...expense,
        amount: Number(expense.amount || 0),
        paidBy: expense.paidBy || "COMPANY",
        companyAmount:
          expense.paidBy === "SHARED"
            ? Number(expense.companyAmount || 0)
            : expense.paidBy === "DEALER"
              ? 0
              : Number(expense.amount || 0),
        dealerAmount:
          expense.paidBy === "SHARED"
            ? Number(expense.dealerAmount || 0)
            : expense.paidBy === "DEALER"
              ? Number(expense.amount || 0)
              : 0,
        expenseDate: expense.expenseDate || executionForm.actualMeetingDate || meeting.meetingDate,
        remarks: expense.remarks?.trim() || undefined,
      }))
      .filter((expense) => expense.expenseHead && expense.amount > 0);

    if (cleaned.length === 0) {
      setError("Add at least one expense row.");
      return;
    }

    const invalidSharedExpense = cleaned.find(
      (expense) =>
        expense.paidBy === "SHARED" &&
        Math.abs(Number(expense.companyAmount || 0) + Number(expense.dealerAmount || 0) - Number(expense.amount || 0)) > 0.01
    );
    if (invalidSharedExpense) {
      setError("For shared expenses, company amount and dealer amount must match the expense total.");
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

  const removeExpense = async (index: number) => {
    if (!meeting) return;
    const expense = expenses[index];
    if (expense?.id) {
      await runAction(() => meetingsApi.deleteExpense(meeting.id, expense.id as number), "Expense removed.");
      return;
    }
    setExpenses((prev) => prev.filter((_, currentIndex) => currentIndex !== index));
  };

  const markNoExpenses = async () => {
    if (!meeting) return;
    await runAction(() => meetingsApi.markNoExpenses(meeting.id), "Marked as no expenses incurred.");
  };

  const submitFinalReport = async () => {
    if (!meeting) return;
    if (!finalReport.meetingSummary.trim()) {
      setError("Meeting summary is required for final report.");
      return;
    }
    if (!finalReport.actualBusinessOutcome?.trim()) {
      setError("Actual business outcome is required for final report.");
      return;
    }
    await runAction(() => meetingsApi.submitFinalReport(meeting.id, finalReport), "Final report submitted.");
  };

  const approveAndCloseMeeting = async () => {
    if (!meeting) return false;
    const remarks = finalApprovalRemarks.trim() || closeRemarks.trim() || "Approved and closed by final reviewer.";
    return runAction(
      () =>
        meetingsApi.approveAndCloseFinalReport(meeting.id, {
          finalReportApprovalRemarks: finalApprovalRemarks.trim() || remarks,
          finalRemarks: closeRemarks.trim() || remarks,
        }),
      "Meeting approved and closed."
    );
  };

  const requestFinalReviewCorrection = async () => {
    if (!meeting) return false;
    if (!finalCorrectionStage) {
      setError("Select the section that needs correction.");
      return false;
    }
    const selectedCorrectionLabel =
      CORRECTION_STAGE_OPTIONS.find((option) => option.value === finalCorrectionStage)?.label || "selected section";
    const remarks = finalApprovalRemarks.trim() || `Correction requested for ${selectedCorrectionLabel}.`;
    const ok = await runAction(
      () =>
        meetingsApi.requestFinalReportCorrection(meeting.id, {
          approvalRemarks: remarks,
          correctionStage: finalCorrectionStage,
          correctionRemarks: remarks,
        }),
      "Meeting sent back for correction."
    );
    if (ok) {
      setFinalApprovalRemarks("");
      setFinalReviewDecision("approveClose");
    }
    return ok;
  };

  const cancelMeeting = async () => {
    if (!meeting) return false;
    if (!cancelRemarks.trim()) {
      setError("Cancellation remarks are required.");
      return false;
    }
    return runAction(() => meetingsApi.cancelMeeting(meeting.id, { remarks: cancelRemarks.trim() }), "Meeting cancelled.");
  };

  const handleApprovalDecision = async (action: "approve" | "reject" | "correction") => {
    const ok = await approvalAction(action);
    if (ok) setIsApprovalDecisionOpen(false);
  };

  const handleApproveAndClose = async () => {
    const ok = await approveAndCloseMeeting();
    if (ok) {
      setFinalReviewDecision("approveClose");
      setIsFinalReviewDecisionOpen(false);
    }
  };

  const handleFinalReviewCorrection = async () => {
    const ok = await requestFinalReviewCorrection();
    if (ok) setIsFinalReviewDecisionOpen(false);
  };

  const handleCancelMeeting = async () => {
    const ok = await cancelMeeting();
    if (ok) setIsCancelMeetingOpen(false);
  };

  const resetReportToMonth = () => {
    if (!meeting) return;
    setReportFilters(reportFiltersFromMeeting(meeting));
  };

  const useCurrentMeetingReportFilters = () => {
    if (!meeting) return;
    setReportFilters(currentMeetingReportFilters(meeting));
  };

  const exportMeetingReport = async (filters = reportFilters) => {
    if (!meeting) return;
    setIsExportingReport(true);
    setError(null);
    setMessage(null);
    try {
      const blob = await meetingsApi.exportReport(reportFiltersForApi(filters));
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = "meeting-report.csv";
      link.click();
      URL.revokeObjectURL(link.href);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to export meeting report.");
    } finally {
      setIsExportingReport(false);
    }
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

  const actualAttendanceCount = getActualAttendanceCount(meeting);
  const namedAttendeeCount = meeting.attendees?.length || 0;
  const expectedTurnout = meeting.expectedAttendees || namedAttendeeCount;
  const adminPresentation = getAdminMeetingPresentation(meeting);
  const showActualSummary = isAdmin ? adminPresentation.isPostMeeting : isPostMeetingStatus(meeting.status);
  const budgetDifference = actualExpenseTotal - Number(meeting.expectedBudget || 0);
  const plannedGiftDisplay = plannedGiftQuantity ? `${plannedGiftQuantity} planned` : meeting.expectedGiftsMaterials ? "Added" : "-";
  const issuedGiftDisplay = issuedGiftQuantity ? String(issuedGiftQuantity) : meeting.noGifts ? "No Gifts" : "-";
  const requestCorrectionOptions = CORRECTION_STAGE_OPTIONS.filter((option) => ["REQUEST", "ATTENDEES"].includes(option.value));
  const finalCorrectionOptions = CORRECTION_STAGE_OPTIONS.filter((option) =>
    ["ATTENDANCE", "GIFTS", "EXPENSES", "LEADS", "FINAL_REPORT"].includes(option.value)
  );
  const approvalDecisionOptions: Array<{ value: ApprovalDecision; label: string }> = [
    ...(canApprove ? [{ value: "approve" as const, label: "Approve" }] : []),
    ...(canRequestCorrection ? [{ value: "correction" as const, label: "Request Correction" }] : []),
    ...(canReject ? [{ value: "reject" as const, label: "Reject" }] : []),
  ];
  const selectedApprovalDecision = approvalDecisionOptions.some((option) => option.value === approvalDecision)
    ? approvalDecision
    : approvalDecisionOptions[0]?.value || "approve";
  const selectedApprovalDecisionLabel =
    approvalDecisionOptions.find((option) => option.value === selectedApprovalDecision)?.label || "Apply Decision";
  const finalReviewDecisionOptions: Array<{ value: FinalReviewDecision; label: string }> = [
    { value: "approveClose", label: "Approve and Close" },
    { value: "correction", label: "Request Correction" },
  ];
  const selectedFinalReviewDecision = finalReviewDecisionOptions.some((option) => option.value === finalReviewDecision)
    ? finalReviewDecision
    : "approveClose";
  const selectedFinalReviewDecisionLabel =
    finalReviewDecisionOptions.find((option) => option.value === selectedFinalReviewDecision)?.label || "Apply Decision";
  const approvalDecisionDialog = (
    <Dialog
      open={isApprovalDecisionOpen}
      onOpenChange={(open) => {
        setIsApprovalDecisionOpen(open);
        if (open) {
          setApprovalDecision(selectedApprovalDecision);
        } else {
          setApprovalRemarks("");
        }
      }}
    >
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Review Decision</DialogTitle>
          <DialogDescription>Approve this request, reject it, or send it back for correction.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Decision</Label>
            <Select value={selectedApprovalDecision} onValueChange={(value) => setApprovalDecision(value as ApprovalDecision)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {approvalDecisionOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedApprovalDecision === "correction" && (
            <div className="space-y-2">
              <Label>Correction section</Label>
              <Select value={correctionStage} onValueChange={(value) => setCorrectionStage(value as CorrectionStage)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {requestCorrectionOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {selectedApprovalDecision !== "approve" && (
            <div className="space-y-2">
              <Label>
                Decision note <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Textarea
                value={approvalRemarks}
                onChange={(event) => setApprovalRemarks(event.target.value)}
                placeholder={
                  selectedApprovalDecision === "correction"
                    ? "Add what the field team should correct."
                    : "Add rejection note if needed."
                }
              />
            </div>
          )}
        </div>
        <DialogFooter className="gap-2 sm:justify-between">
          <Button variant="outline" onClick={() => setIsApprovalDecisionOpen(false)}>
            Close
          </Button>
          <div className="flex flex-wrap gap-2">
            <Button
              variant={selectedApprovalDecision === "reject" ? "destructive" : selectedApprovalDecision === "correction" ? "outline" : "default"}
              onClick={() => handleApprovalDecision(selectedApprovalDecision)}
              disabled={isSaving || approvalDecisionOptions.length === 0}
            >
              {selectedApprovalDecision === "approve" ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : selectedApprovalDecision === "reject" ? (
                <XCircle className="h-4 w-4" />
              ) : null}
              {selectedApprovalDecisionLabel}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
  const finalReviewDecisionDialog = (
    <Dialog
      open={isFinalReviewDecisionOpen}
      onOpenChange={(open) => {
        setIsFinalReviewDecisionOpen(open);
        if (open) {
          setFinalReviewDecision(selectedFinalReviewDecision);
        } else {
          setFinalApprovalRemarks("");
        }
      }}
    >
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Final Review Decision</DialogTitle>
          <DialogDescription>Close the completed meeting or send a specific section back for correction.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Decision</Label>
            <Select value={selectedFinalReviewDecision} onValueChange={(value) => setFinalReviewDecision(value as FinalReviewDecision)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {finalReviewDecisionOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedFinalReviewDecision === "correction" && (
            <div className="space-y-2">
              <Label>Correction section</Label>
              <Select value={finalCorrectionStage} onValueChange={(value) => setFinalCorrectionStage(value as CorrectionStage)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {finalCorrectionOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label>
              Decision note <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Textarea
              value={finalApprovalRemarks}
              onChange={(event) => setFinalApprovalRemarks(event.target.value)}
              placeholder={
                selectedFinalReviewDecision === "correction"
                  ? "Add what the field team should correct."
                  : "Add final approval note if needed."
              }
            />
          </div>
        </div>
        <DialogFooter className="gap-2 sm:justify-between">
          <Button variant="outline" onClick={() => setIsFinalReviewDecisionOpen(false)}>
            Close
          </Button>
          <div className="flex flex-wrap gap-2">
            <Button
              variant={selectedFinalReviewDecision === "correction" ? "outline" : "default"}
              onClick={selectedFinalReviewDecision === "correction" ? handleFinalReviewCorrection : handleApproveAndClose}
              disabled={isSaving}
            >
              {selectedFinalReviewDecision === "approveClose" && <CheckCircle2 className="h-4 w-4" />}
              {selectedFinalReviewDecisionLabel}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
  const cancelMeetingDialog = (
    <Dialog open={isCancelMeetingOpen} onOpenChange={setIsCancelMeetingOpen}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Cancel Meeting</DialogTitle>
          <DialogDescription>Add the cancellation reason before cancelling this meeting.</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label>Cancellation remarks</Label>
          <Textarea value={cancelRemarks} onChange={(event) => setCancelRemarks(event.target.value)} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsCancelMeetingOpen(false)}>
            Close
          </Button>
          <Button variant="destructive" onClick={handleCancelMeeting} disabled={isSaving || !cancelRemarks.trim()}>
            Cancel Meeting
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  if (isAdmin) {
    const adminTabs = adminPresentation.tabs;
    const draftMissingItems = getDraftMissingItems(meeting);
    const reportReadiness = [
      { label: "Attendance", ready: meeting.attendanceFinalized === true, pendingLabel: meeting.status === "CLOSED" ? "Not recorded" : "Pending" },
      { label: "Gifts", ready: meeting.giftsCompleted === true || meeting.noGifts === true, pendingLabel: meeting.status === "CLOSED" ? "Not recorded" : "Pending" },
      { label: "Expenses", ready: meeting.expensesCompleted === true || meeting.noExpenses === true, pendingLabel: meeting.status === "CLOSED" ? "Not recorded" : "Pending" },
      { label: "Final Report", ready: hasFinalReportContent(meeting), pendingLabel: meeting.status === "CLOSED" ? "Not recorded" : "Pending" },
    ];
    const showAttendanceResults = adminPresentation.isPostMeeting;
    const showApprovalDecision = meeting.status === "PENDING_APPROVAL" && (canApprove || canReject || canRequestCorrection);
    const showFinalReviewDecision =
      meeting.status === "REPORT_SUBMITTED" && (canApproveFinalReport || canClose || canRequestCorrection);
    const attendanceDelta = actualAttendanceCount - Number(expectedTurnout || 0);
    const expenseDelta = actualExpenseTotal - Number(meeting.expectedBudget || 0);
    const expensePlanDelta = actualExpenseTotal - plannedExpenseTotal;
    const companyPlanDelta = companyPaidTotal - plannedCompanyContribution;
    const dealerPlanDelta = dealerPaidTotal - plannedDealerContribution;
    const giftDelta = issuedGiftQuantity - plannedGiftQuantity;

    return (
      <div className="space-y-4">
        <MeetingKpiGrid
          status={meeting.status}
          statusValue={getMeetingStageLabel(meeting)}
          secondaryLabel={showActualSummary ? "Gifts Issued" : "Planned Gifts"}
          secondaryValue={
            showActualSummary
              ? adminPresentation.giftComparisonReady
                ? issuedGiftDisplay
                : meeting.status === "CLOSED"
                  ? issuedGiftQuantity
                    ? `${issuedGiftQuantity} recorded`
                    : "Completion not recorded"
                  : "In progress"
              : plannedGiftDisplay
          }
          financialLabel={
            showActualSummary
              ? adminPresentation.expenseComparisonReady
                ? "Actual Expenses"
                : meeting.status === "CLOSED"
                  ? "Expense Record"
                  : "Expense Progress"
              : "Expected Budget"
          }
          financialValue={
            showActualSummary
              ? adminPresentation.expenseComparisonReady
                ? formatCurrency(actualExpenseTotal)
                : meeting.expenses?.length
                  ? `${formatCurrency(actualExpenseTotal)} recorded`
                  : actualExpenseTotal > 0
                    ? `${formatCurrency(actualExpenseTotal)} recorded`
                    : meeting.status === "CLOSED"
                      ? "Completion not recorded"
                      : "Awaiting completion"
              : formatCurrency(meeting.expectedBudget)
          }
          financialSubMetrics={
            showActualSummary
              ? adminPresentation.expenseComparisonReady
                ? [
                    { label: "Expected Budget", value: formatCurrency(meeting.expectedBudget) },
                    {
                      label: "Difference",
                      value: formatCurrency(budgetDifference),
                      valueClassName: budgetDifference <= 0 ? "text-emerald-600" : "text-amber-600",
                    },
                  ]
                : [
                    { label: "Planned", value: formatCurrency(plannedExpenseTotal) },
                    { label: meeting.status === "CLOSED" ? "Recorded" : "Recorded so far", value: formatCurrency(actualExpenseTotal) },
                  ]
              : [
                  { label: "Company Share", value: formatCurrency(meeting.plan?.companyContribution) },
                  { label: "Dealer Share", value: formatCurrency(meeting.plan?.dealerContribution) },
                ]
          }
          attendanceLabel={showActualSummary ? "Actual Attendance" : "Expected Turnout"}
          attendanceValue={showActualSummary ? String(actualAttendanceCount) : String(expectedTurnout || 0)}
          attendanceSubMetrics={
            showActualSummary
              ? [
                  { label: "Expected Turnout", value: String(expectedTurnout || 0) },
                  { label: "Named Attendees", value: String(namedAttendeeCount) },
                ]
              : [{ label: "Named Attendees", value: String(namedAttendeeCount) }]
          }
        />

        <AdminStageNotice notice={adminPresentation.notice} />

        {message && <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{message}</div>}
        {error && <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

        <div className="flex flex-wrap justify-end gap-2">
          {showApprovalDecision && (
            <Button onClick={() => setIsApprovalDecisionOpen(true)}>
              <CheckCircle2 className="h-4 w-4" />
              Review Decision
            </Button>
          )}
        </div>

        <div role="tablist" aria-label="Meeting review sections" className="flex gap-2 overflow-x-auto rounded-lg border bg-muted/30 p-1">
          {adminTabs.map((tab) => (
            <Button
              key={tab.key}
              type="button"
              variant={adminTab === tab.key ? "default" : "ghost"}
              size="sm"
              onClick={() => setAdminTab(tab.key)}
              className="shrink-0"
              role="tab"
              aria-selected={adminTab === tab.key}
              aria-controls={`meeting-admin-panel-${tab.key}`}
            >
              {tab.label}
            </Button>
          ))}
        </div>

        {adminTab === "details" && (
          <div id="meeting-admin-panel-details" role="tabpanel" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <MeetingDetailCard title="Schedule" icon={<CalendarDays className="h-4 w-4" />}>
                <dl>
                  <MeetingDataRow label="Meeting type" value={meeting.meetingType} />
                  <MeetingDataRow label="Date" value={formatDate(meeting.meetingDate)} />
                  <MeetingDataRow label="Time" value={formatMeetingTime(meeting.meetingTime)} />
                  <MeetingDataRow label="City" value={meeting.city} />
                  <MeetingDataRow label="State" value={meeting.state} />
                  <MeetingDataRow label="Location" value={meeting.location} />
                </dl>
              </MeetingDetailCard>

              <MeetingDetailCard title="Request" icon={<FileText className="h-4 w-4" />}>
                <dl>
                  <MeetingDataRow label="Created by" value={meeting.creatorName} />
                  <MeetingDataRow label="Dealer / shop" value={meeting.storeName || meeting.dealerName || meeting.customerReference} />
                  <MeetingDataRow label="Store ID" value={meeting.storeId} />
                  <MeetingDataRow label="Expected budget" value={formatCurrency(meeting.expectedBudget)} />
                  <MeetingDataRow label="Expected turnout" value={expectedTurnout} />
                  <MeetingDataRow label="Named attendees" value={namedAttendeeCount} />
                  <MeetingDataRow label="Company share" value={formatCurrency(meeting.plan?.companyContribution)} />
                  <MeetingDataRow label="Dealer share" value={formatCurrency(meeting.plan?.dealerContribution)} />
                  <MeetingDataRow
                    label="Status"
                    value={
                      <Badge variant="outline" className={statusBadgeClass(meeting.status)}>
                        {getMeetingStatusLabel(meeting)}
                      </Badge>
                    }
                  />
                  {showActualSummary && (
                    <>
                      <MeetingDataRow label="Actual attendance" value={actualAttendanceCount} />
                      <MeetingDataRow label="Expected turnout" value={expectedTurnout} />
                      <MeetingDataRow label="Named attendees" value={namedAttendeeCount} />
                      <MeetingDataRow
                        label="Actual expenses"
                        value={adminPresentation.expenseComparisonReady ? formatCurrency(actualExpenseTotal) : "Awaiting completion"}
                      />
                      {adminPresentation.expenseComparisonReady && (
                        <MeetingDataRow label="Budget difference" value={formatCurrency(actualExpenseTotal - Number(meeting.expectedBudget || 0))} />
                      )}
                    </>
                  )}
                </dl>
              </MeetingDetailCard>
            </div>

            {meeting.status === "DRAFT" && draftMissingItems.length > 0 && (
              <Card className="rounded-lg border-amber-200 bg-amber-50 py-0 text-amber-900 shadow-sm">
                <CardContent className="p-4 text-sm">
                  Draft incomplete: {draftMissingItems.join(", ")}.
                </CardContent>
              </Card>
            )}

            <Card className="rounded-lg border-border/80 py-0 shadow-sm">
              <CardContent className="p-8">
                <dl className="grid gap-8 md:grid-cols-2 xl:grid-cols-3">
                  <MeetingNoteBlock label="Purpose / objective" value={meeting.objective} />
                  <MeetingNoteBlock label="Expected business impact" value={meeting.expectedBusinessImpact} />
                  {showActualSummary && (
                    <MeetingNoteBlock label="Actual business outcome" value={meeting.actualBusinessOutcome} />
                  )}
                  <MeetingNoteBlock
                    label="Expected gifts / materials"
                    value={<ExpectedGiftsDisplay gifts={plannedGifts} fallback={meeting.expectedGiftsMaterials || meeting.plan?.expectedGiftsMaterials} />}
                  />
                  <MeetingNoteBlock label="Planned expense details" value={plannedExpenses.length ? `${plannedExpenses.length} categories planned` : meeting.plan?.plannedExpenseDetails as string} />
                  <MeetingNoteBlock label="Budget remarks" value={meeting.plan?.budgetRemarks} />
                  <MeetingNoteBlock label="Remarks" value={meeting.remarks} />
                  {meeting.approvalRemarks && (
                    <MeetingNoteBlock label="Approval / rejection note" value={meeting.approvalRemarks} />
                  )}
                  {meeting.status === "CORRECTION_REQUIRED" && meeting.correctionRemarks && (
                    <MeetingNoteBlock label={`Correction requested${meeting.correctionStage ? `: ${meeting.correctionStage}` : ""}`} value={meeting.correctionRemarks} />
                  )}
                  {meeting.status === "CANCELLED" && (meeting.cancellationReason || meeting.cancellationRemarks) && (
                    <MeetingNoteBlock label="Cancellation reason" value={meeting.cancellationReason || meeting.cancellationRemarks} />
                  )}
                  {meeting.status === "REJECTED" && meeting.rejectionReason && (
                    <MeetingNoteBlock label="Rejection reason" value={meeting.rejectionReason} />
                  )}
                </dl>
              </CardContent>
            </Card>

            <div className="grid gap-6 xl:grid-cols-2">
              <Card className="rounded-lg border-border/80 py-0 shadow-sm">
                <CardHeader className="border-b px-6 py-5">
                  <CardTitle className="text-base">Planned Gifts</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {plannedGifts.length ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="px-6">Item</TableHead>
                          <TableHead>Quantity</TableHead>
                          <TableHead className="pr-6 text-right">Estimated Amount</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {plannedGifts.map((gift, index) => (
                          <TableRow key={`${gift.giftItem}-${index}`}>
                            <TableCell className="px-6 font-medium">{gift.giftItem || "-"}</TableCell>
                            <TableCell>{Number(gift.quantity || 0)}</TableCell>
                            <TableCell className="pr-6 text-right">{formatCurrency(gift.estimatedAmount)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="p-6 text-sm text-muted-foreground">No planned gifts were added.</div>
                  )}
                </CardContent>
              </Card>

              <Card className="rounded-lg border-border/80 py-0 shadow-sm">
                <CardHeader className="border-b px-6 py-5">
                  <CardTitle className="text-base">Planned Expenses</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {plannedExpenses.length ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="px-6">Expense Head</TableHead>
                          <TableHead className="pr-6 text-right">Planned Amount</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {plannedExpenses.map((expense, index) => (
                          <TableRow key={`${expense.expenseHead}-${index}`}>
                            <TableCell className="px-6 font-medium">{expense.expenseHead || "Other"}</TableCell>
                            <TableCell className="pr-6 text-right font-medium">{formatCurrency(expense.amount)}</TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="bg-muted/30">
                          <TableCell className="px-6 font-bold">Total</TableCell>
                          <TableCell className="pr-6 text-right font-bold">{formatCurrency(plannedExpenseTotal)}</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="p-6 text-sm text-muted-foreground">No planned expenses were added.</div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {adminTab === "attendees" && (
          <Card id="meeting-admin-panel-attendees" role="tabpanel">
            <CardHeader>
              <CardTitle>{showAttendanceResults ? "Attendance" : "Expected Attendees"}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {showAttendanceResults && (
                <div className="flex flex-wrap gap-x-6 gap-y-2 rounded-lg border bg-muted/20 px-4 py-3 text-sm">
                  <span><span className="text-muted-foreground">Actual attended:</span> <strong>{actualAttendanceCount}</strong></span>
                  <span><span className="text-muted-foreground">Expected turnout:</span> <strong>{expectedTurnout || 0}</strong></span>
                  <span><span className="text-muted-foreground">Named attendees:</span> <strong>{namedAttendeeCount}</strong></span>
                </div>
              )}
              {meeting.attendees?.length ? (
                <div className="overflow-x-auto">
                <Table className="min-w-[860px]">
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
                          {showAttendanceResults ? (
                            attendee.present ? (
                              <div className="flex flex-wrap gap-2">
                                <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">Present</Badge>
                                {attendee.expected === false && <Badge variant="outline">Walk-in</Badge>}
                              </div>
                            ) : meeting.attendanceFinalized ? (
                              <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-700">Absent</Badge>
                            ) : (
                              <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">Not recorded</Badge>
                            )
                          ) : attendee.expected === false ? (
                            <Badge variant="outline">Walk-in</Badge>
                          ) : (
                            <Badge variant="outline">Expected</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                </div>
              ) : (
                <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">No attendees found.</div>
              )}
            </CardContent>
          </Card>
        )}

        {adminTab === "gifts" && (
          <div id="meeting-admin-panel-gifts" role="tabpanel" className="space-y-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-2xl font-bold tracking-tight">Gifts</h2>
              <Badge
                variant="outline"
                className={`w-fit rounded-full px-4 py-1.5 text-sm font-semibold ${
                  meeting.giftsCompleted || meeting.noGifts
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border-amber-200 bg-amber-50 text-amber-700"
                }`}
              >
                {meeting.noGifts ? "No Gifts" : meeting.giftsCompleted ? "Completed" : meeting.status === "CLOSED" ? "Not Recorded" : "Pending"}
              </Badge>
            </div>

            <CompletionStateNotice
              state={meeting.noGifts ? "none" : meeting.giftsCompleted ? "complete" : "pending"}
              title={
                meeting.noGifts
                  ? "No gifts were issued"
                  : meeting.giftsCompleted
                    ? "Gift section completed"
                    : meeting.status === "CLOSED"
                      ? "Gift completion not recorded"
                      : "Awaiting gift completion"
              }
              detail={
                meeting.noGifts
                  ? `The field team marked No Gifts. Planned quantity ${plannedGiftQuantity || 0}, issued quantity ${issuedGiftQuantity || 0}.`
                  : meeting.giftsCompleted
                    ? `The gift section is complete. Planned quantity ${plannedGiftQuantity || 0}, issued quantity ${issuedGiftQuantity || 0}.`
                    : meeting.status === "CLOSED"
                      ? "This closed record does not contain a gift completion flag. Saved gift rows are shown, but no final difference is concluded."
                      : "The field team is still recording gifts. Final differences will appear after this section is completed or marked as No Gifts."
              }
            />

            <div className={`grid gap-5 ${adminPresentation.giftComparisonReady ? "md:grid-cols-4" : "md:grid-cols-3"}`}>
              <ExpenseMetricCard label="Planned Quantity" value={String(plannedGiftQuantity || 0)} />
              <ExpenseMetricCard label={adminPresentation.giftComparisonReady ? "Issued Quantity" : "Issued So Far"} value={String(issuedGiftQuantity || 0)} />
              {adminPresentation.giftComparisonReady && (
                <ExpenseMetricCard
                  label="Difference"
                  value={formatSignedNumber(issuedGiftQuantity - plannedGiftQuantity)}
                  valueClassName={issuedGiftQuantity >= plannedGiftQuantity ? "text-emerald-600" : "text-amber-600"}
                />
              )}
              <ExpenseMetricCard label="Gift Rows" value={String(meeting.gifts?.length || 0)} />
            </div>

            <Card className="rounded-lg border-border/80 py-0 shadow-sm">
              <CardHeader>
                <CardTitle>{adminPresentation.giftComparisonReady ? "Planned vs Issued" : "Approved Gift Plan and Progress"}</CardTitle>
              </CardHeader>
              <CardContent>
                {giftComparisonRows.length ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Gift / Item</TableHead>
                        <TableHead>Planned</TableHead>
                        <TableHead>{adminPresentation.giftComparisonReady ? "Issued" : "Issued So Far"}</TableHead>
                        {adminPresentation.giftComparisonReady && <TableHead>Difference</TableHead>}
                        <TableHead>Estimated Amount</TableHead>
                        {adminPresentation.giftComparisonReady && <TableHead>Status</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {giftComparisonRows.map((row) => (
                        <TableRow key={row.item}>
                          <TableCell className="font-medium">{row.item}</TableCell>
                          <TableCell>{row.planned}</TableCell>
                          <TableCell>{row.issued}</TableCell>
                          {adminPresentation.giftComparisonReady && (
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={row.difference >= 0 ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700"}
                              >
                                {formatSignedNumber(row.difference)}
                              </Badge>
                            </TableCell>
                          )}
                          <TableCell>{formatCurrency(row.estimatedAmount)}</TableCell>
                          {adminPresentation.giftComparisonReady && (
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={
                                  meeting.noGifts
                                    ? "border-slate-200 bg-slate-50 text-slate-700"
                                    : row.difference === 0
                                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                      : row.difference > 0
                                        ? "border-blue-200 bg-blue-50 text-blue-700"
                                        : "border-amber-200 bg-amber-50 text-amber-700"
                                }
                              >
                                {meeting.noGifts
                                  ? "No gifts issued"
                                  : row.difference === 0
                                    ? "Matched"
                                    : row.difference > 0
                                      ? "Extra issued"
                                      : `Short by ${Math.abs(row.difference)}`}
                              </Badge>
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                    No planned or issued gift data found.
                  </div>
                )}
              </CardContent>
            </Card>

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
          <div id="meeting-admin-panel-expenses" role="tabpanel" className="space-y-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-2xl font-bold tracking-tight">Expenses</h2>
              <Badge
                variant="outline"
                className={`w-fit rounded-full px-4 py-1.5 text-sm font-semibold ${
                  meeting.expensesCompleted || meeting.noExpenses
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border-amber-200 bg-amber-50 text-amber-700"
                }`}
              >
                {meeting.noExpenses ? "No Expenses" : meeting.expensesCompleted ? "Completed" : meeting.status === "CLOSED" ? "Not Recorded" : "Pending"}
              </Badge>
            </div>

            <CompletionStateNotice
              state={meeting.noExpenses ? "none" : meeting.expensesCompleted ? "complete" : "pending"}
              title={
                meeting.noExpenses
                  ? "No expenses were submitted"
                  : meeting.expensesCompleted
                    ? "Expense section completed"
                    : meeting.status === "CLOSED"
                      ? "Expense completion not recorded"
                      : "Awaiting expense completion"
              }
              detail={
                meeting.noExpenses
                  ? `The field team marked No Expenses. Planned expenses ${formatCurrency(plannedExpenseTotal)}, actual expenses ${formatCurrency(actualExpenseTotal)}.`
                  : meeting.expensesCompleted
                    ? `The expense section is complete. Planned expenses ${formatCurrency(plannedExpenseTotal)}, actual expenses ${formatCurrency(actualExpenseTotal)}.`
                    : meeting.status === "CLOSED"
                      ? "This closed record does not contain an expense completion flag. Saved expense rows are shown, but no final difference or over-budget result is concluded."
                      : "The field team is still recording expenses. Final totals, differences, and over-budget results will appear after this section is completed or marked as No Expenses."
              }
            />

            <div className="grid gap-5 lg:grid-cols-3">
              <ExpenseLedgerCard
                label="Expected Budget"
                value={formatCurrency(meeting.expectedBudget)}
                metrics={
                  adminPresentation.expenseComparisonReady
                    ? [
                        { label: "Planned", value: formatCurrency(plannedExpenseTotal) },
                        { label: "Actual", value: formatCurrency(actualExpenseTotal) },
                        {
                          label: expensePlanDelta > 0 ? "Over Plan" : "Savings",
                          value: formatSignedCurrency(expensePlanDelta),
                          valueClassName: expensePlanDelta > 0 ? "text-amber-600" : "text-emerald-600",
                        },
                      ]
                    : [
                        { label: "Planned", value: formatCurrency(plannedExpenseTotal) },
                        { label: "Recorded So Far", value: formatCurrency(actualExpenseTotal) },
                      ]
                }
              />
              <ExpenseLedgerCard
                label="Company Planned Allocation"
                value={formatCurrency(plannedCompanyContribution)}
                tag={adminPresentation.expenseComparisonReady ? (companyPlanDelta > 0 ? "Over planned" : "Within planned") : undefined}
                tagTone={companyPlanDelta > 0 ? "warning" : "success"}
                metrics={
                  adminPresentation.expenseComparisonReady
                    ? [
                        { label: "Planned", value: formatCurrency(plannedCompanyContribution) },
                        { label: "Actual", value: formatCurrency(companyPaidTotal) },
                        {
                          label: "Difference",
                          value: formatSignedCurrency(companyPlanDelta),
                          valueClassName: companyPlanDelta > 0 ? "text-amber-600" : "text-emerald-600",
                        },
                      ]
                    : [
                        { label: "Planned", value: formatCurrency(plannedCompanyContribution) },
                        { label: "Recorded So Far", value: formatCurrency(companyPaidTotal) },
                      ]
                }
              />
              <ExpenseLedgerCard
                label="Dealer Planned Allocation"
                value={formatCurrency(plannedDealerContribution)}
                tag={adminPresentation.expenseComparisonReady ? (dealerPlanDelta > 0 ? "Over planned" : "Within planned") : undefined}
                tagTone={dealerPlanDelta > 0 ? "warning" : "success"}
                metrics={
                  adminPresentation.expenseComparisonReady
                    ? [
                        { label: "Planned", value: formatCurrency(plannedDealerContribution) },
                        { label: "Actual", value: formatCurrency(dealerPaidTotal) },
                        {
                          label: "Difference",
                          value: formatSignedCurrency(dealerPlanDelta),
                          valueClassName: dealerPlanDelta > 0 ? "text-amber-600" : "text-emerald-600",
                        },
                      ]
                    : [
                        { label: "Planned", value: formatCurrency(plannedDealerContribution) },
                        { label: "Recorded So Far", value: formatCurrency(dealerPaidTotal) },
                      ]
                }
              />
            </div>

            <Card className="rounded-lg border-border/80 py-0 shadow-sm">
              <CardHeader className="border-b px-6 py-5">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <IndianRupee className="h-5 w-5 text-primary" />
                  {adminPresentation.expenseComparisonReady ? "Planned vs Actual Spends by Category" : "Approved Expense Plan and Progress"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5 p-6">
                {expenseComparisonRows.length ? (
                  <div className="overflow-x-auto rounded-lg border">
                    <Table className="min-w-[780px]">
                      <TableHeader>
                        <TableRow className="bg-muted/40">
                          <TableHead className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Expense Head</TableHead>
                          <TableHead className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Planned</TableHead>
                          <TableHead className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{adminPresentation.expenseComparisonReady ? "Actual" : "Recorded So Far"}</TableHead>
                          {adminPresentation.expenseComparisonReady && <TableHead className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Difference</TableHead>}
                          <TableHead className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Company</TableHead>
                          <TableHead className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Dealer</TableHead>
                          {adminPresentation.expenseComparisonReady && <TableHead className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Status</TableHead>}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {expenseComparisonRows.map((row) => {
                          const isUnplannedSpend = row.planned === 0 && row.actual > 0;
                          const isNotSpent = row.planned > 0 && row.actual === 0;
                          const isOverBudget = row.difference > 0;

                          return (
                            <TableRow key={row.head} className={isOverBudget ? "bg-amber-50/40 hover:bg-amber-50/60" : undefined}>
                              <TableCell>
                                <ExpenseHeadChip head={row.head} />
                              </TableCell>
                              <TableCell className="font-bold">{formatCurrency(row.planned)}</TableCell>
                              <TableCell className="font-bold">{formatCurrency(row.actual)}</TableCell>
                              {adminPresentation.expenseComparisonReady && (
                                <TableCell className={`font-bold ${isOverBudget ? "text-amber-600" : "text-emerald-600"}`}>
                                  {formatSignedCurrency(row.difference)}
                                </TableCell>
                              )}
                              <TableCell className="font-bold">{formatCurrency(row.company)}</TableCell>
                              <TableCell className="font-bold">{formatCurrency(row.dealer)}</TableCell>
                              {adminPresentation.expenseComparisonReady && <TableCell>
                                <Badge
                                  variant="outline"
                                  className={
                                    isOverBudget
                                      ? "border-amber-200 bg-amber-50 text-amber-700"
                                      : "border-emerald-200 bg-emerald-50 text-emerald-700"
                                  }
                                >
                                  {isUnplannedSpend ? "Unplanned spend" : isOverBudget ? "Over budget" : isNotSpent ? "Not spent" : "Within plan"}
                                </Badge>
                              </TableCell>}
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                    No planned or actual expense data found.
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="rounded-lg border-border/80 py-0 shadow-sm">
              <CardHeader className="border-b px-6 py-5">
                <CardTitle className="text-base">Actual Expense Logs</CardTitle>
              </CardHeader>
              {meeting.expenses?.length ? (
                <CardContent className="p-6">
                  <div className="overflow-x-auto rounded-lg border">
                    <Table className="min-w-[860px]">
                    <TableHeader>
                      <TableRow className="bg-muted/40">
                        <TableHead className="px-4 py-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                          Head
                        </TableHead>
                        <TableHead className="px-4 py-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                          Amount
                        </TableHead>
                        <TableHead className="px-4 py-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                          Paid By
                        </TableHead>
                        <TableHead className="px-4 py-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                          Company
                        </TableHead>
                        <TableHead className="px-4 py-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                          Dealer
                        </TableHead>
                        <TableHead className="px-4 py-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                          Date
                        </TableHead>
                        <TableHead className="px-4 py-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">
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
                          <TableCell className="px-4 py-4 align-middle">{expense.paidBy || "-"}</TableCell>
                          <TableCell className="px-4 py-4 align-middle">{formatCurrency(expense.companyAmount)}</TableCell>
                          <TableCell className="px-4 py-4 align-middle">{formatCurrency(expense.dealerAmount)}</TableCell>
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
                  </div>
                </CardContent>
              ) : (
                <CardContent className="p-6">
                  <div className="rounded-lg border border-dashed p-6 text-center text-sm font-medium text-muted-foreground">
                    No transactional actual expense logs were generated.
                  </div>
                </CardContent>
              )}
            </Card>
          </div>
        )}

        {adminTab === "finalReport" && (
          <div id="meeting-admin-panel-finalReport" role="tabpanel" className="space-y-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-2xl font-bold tracking-tight">Final Report</h2>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <Badge
                    variant="outline"
                    className={hasFinalReportContent(meeting) ? "w-fit border-emerald-200 bg-emerald-50 text-emerald-700" : "w-fit"}
                  >
                    {hasFinalReportContent(meeting) ? "Report Available" : "Not Submitted"}
                  </Badge>
                  <Badge variant="outline" className={statusBadgeClass(meeting.status)}>
                    {getMeetingStatusLabel(meeting)}
                  </Badge>
                </div>
              </div>
              {showFinalReviewDecision && (
                <Button onClick={() => setIsFinalReviewDecisionOpen(true)}>
                  <CheckCircle2 className="h-4 w-4" />
                  Final Review Decision
                </Button>
              )}
            </div>

            {adminPresentation.showFinalReportContent ? (
              <>
            <Card className="rounded-lg border-border/80 py-0 shadow-sm">
              <CardContent className="space-y-6 p-6">
                <section className="space-y-4 border-b pb-6">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    Review Readiness
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {reportReadiness.map((item) => (
                      <div key={item.label} className="inline-flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm">
                        <span className="font-medium text-muted-foreground">{item.label}:</span>
                        <span className={item.ready ? "text-xs font-bold uppercase tracking-wide text-emerald-600" : "text-xs font-bold uppercase tracking-wide text-amber-600"}>
                          {item.ready ? "Ready" : item.pendingLabel}
                        </span>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="space-y-4">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    <FileText className="h-4 w-4 text-primary" />
                    Plan vs Actual Analysis
                  </div>
                  <div className="overflow-x-auto rounded-lg border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Comparison Parameter</TableHead>
                          <TableHead>Expected Plan</TableHead>
                          <TableHead>Actual Execution</TableHead>
                          <TableHead>Variance / Outcome</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <TableRow>
                          <TableCell className="font-semibold">Turnout / Attendance</TableCell>
                          <TableCell>
                            {expectedTurnout || 0}
                            <span className="text-muted-foreground"> ({namedAttendeeCount} named)</span>
                          </TableCell>
                          <TableCell>
                            {meeting.attendanceFinalized
                              ? `${actualAttendanceCount} attended`
                              : actualAttendanceCount > 0
                                ? `${actualAttendanceCount} recorded (completion not marked)`
                                : "Completion not recorded"}
                          </TableCell>
                          <TableCell className={meeting.attendanceFinalized ? (attendanceDelta >= 0 ? "font-semibold text-emerald-600" : "font-semibold text-red-600") : "text-muted-foreground"}>
                            {meeting.attendanceFinalized ? `${attendanceDelta >= 0 ? `+${attendanceDelta}` : attendanceDelta} attendance variance` : "-"}
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-semibold">Budget / Expenses</TableCell>
                          <TableCell>{formatCurrency(meeting.expectedBudget)}</TableCell>
                          <TableCell>
                            {adminPresentation.expenseComparisonReady
                              ? formatCurrency(actualExpenseTotal)
                              : actualExpenseTotal > 0
                                ? `${formatCurrency(actualExpenseTotal)} recorded (completion not marked)`
                                : "Completion not recorded"}
                          </TableCell>
                          <TableCell className={adminPresentation.expenseComparisonReady ? (expenseDelta <= 0 ? "font-semibold text-emerald-600" : "font-semibold text-amber-600") : "text-muted-foreground"}>
                            {adminPresentation.expenseComparisonReady ? formatSignedCurrency(expenseDelta) : "-"}
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-semibold">Planned Gifts</TableCell>
                          <TableCell>{plannedGiftQuantity || 0} planned</TableCell>
                          <TableCell>
                            {adminPresentation.giftComparisonReady
                              ? `${issuedGiftQuantity || 0} issued`
                              : issuedGiftQuantity > 0
                                ? `${issuedGiftQuantity} recorded (completion not marked)`
                                : "Completion not recorded"}
                          </TableCell>
                          <TableCell className={adminPresentation.giftComparisonReady ? (giftDelta >= 0 ? "font-semibold text-emerald-600" : "font-semibold text-red-600") : "text-muted-foreground"}>
                            {adminPresentation.giftComparisonReady ? `${giftDelta >= 0 ? `+${giftDelta}` : giftDelta} gift variance` : "-"}
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-semibold">Business Impact</TableCell>
                          <TableCell className="max-w-[280px] whitespace-pre-wrap">{meeting.expectedBusinessImpact || "-"}</TableCell>
                          <TableCell className="max-w-[280px] whitespace-pre-wrap">{meeting.actualBusinessOutcome || "-"}</TableCell>
                          <TableCell className="max-w-[280px] whitespace-pre-wrap">{meeting.leadCount ? `${meeting.leadCount} leads` : meeting.leadsGenerated || "-"}</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                </section>

                {hasFinalReportContent(meeting) ? (
                  <section className="border-t pt-6">
                    <dl className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                      <MeetingNoteBlock label="Meeting summary" value={meeting.meetingSummary} />
                      <MeetingNoteBlock label="Key discussion points" value={meeting.keyDiscussionPoints} />
                      <MeetingNoteBlock label="Actual business outcome" value={meeting.actualBusinessOutcome} />
                      <MeetingNoteBlock label="Lead details" value={meeting.leadDetails || meeting.leadsGenerated} />
                      <MeetingNoteBlock label="Interested customers / contractors" value={meeting.interestedCustomers} />
                      <MeetingNoteBlock label="Competitor information" value={meeting.competitorInformation} />
                      <MeetingNoteBlock label="Final remarks" value={meeting.finalRemarks} />
                      {meeting.finalReportApprovalRemarks && (
                        <MeetingNoteBlock label="Final approval remarks" value={meeting.finalReportApprovalRemarks} />
                      )}
                    </dl>
                  </section>
                ) : (
                  <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                    Final report details will appear here once the field team submits the report.
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="rounded-lg border-border/80 py-0 shadow-sm">
              <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <CardTitle>Report Export</CardTitle>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" onClick={() => setIsReportFiltersOpen((open) => !open)}>
                    <Filter className="h-4 w-4" />
                    {isReportFiltersOpen ? "Hide Filters" : "Filters"}
                  </Button>
                  <Button variant="outline" onClick={() => exportMeetingReport(reportFilters)} disabled={isExportingReport}>
                    {isExportingReport ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                    Export CSV
                  </Button>
                </div>
              </CardHeader>
              {isReportFiltersOpen && (
                <CardContent className="space-y-5 border-t pt-5">
                  <div className="grid gap-3 md:grid-cols-6">
                    <div className="space-y-2">
                      <Label>Start Date</Label>
                      <Input
                        type="date"
                        value={reportFilters.start}
                        onChange={(event) => setReportFilters((prev) => ({ ...prev, start: event.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>End Date</Label>
                      <Input
                        type="date"
                        value={reportFilters.end}
                        onChange={(event) => setReportFilters((prev) => ({ ...prev, end: event.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Status</Label>
                      <Select
                        value={reportFilters.status}
                        onValueChange={(value) => setReportFilters((prev) => ({ ...prev, status: value }))}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={REPORT_ALL_VALUE}>All statuses</SelectItem>
                          {REPORT_STATUS_OPTIONS.map((status) => (
                            <SelectItem key={status} value={status}>
                              {formatMeetingStatus(status)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Meeting Type</Label>
                      <Select
                        value={reportFilters.meetingType}
                        onValueChange={(value) => setReportFilters((prev) => ({ ...prev, meetingType: value }))}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={REPORT_ALL_VALUE}>All types</SelectItem>
                          {reportMeetingTypeOptions.map((type) => (
                            <SelectItem key={type} value={type}>
                              {type}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>City</Label>
                      <Input
                        value={reportFilters.city}
                        onChange={(event) => setReportFilters((prev) => ({ ...prev, city: event.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>State</Label>
                      <Input
                        value={reportFilters.state}
                        onChange={(event) => setReportFilters((prev) => ({ ...prev, state: event.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" onClick={useCurrentMeetingReportFilters}>
                      This Meeting
                    </Button>
                    <Button variant="outline" onClick={resetReportToMonth}>
                      Month View
                    </Button>
                  </div>
                </CardContent>
              )}
            </Card>

            <Card className="rounded-lg border-border/80 py-0 shadow-sm">
              <CardContent className="p-6">
                <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
                  <aside className="border-b pb-4 lg:border-b-0 lg:border-r lg:pb-0 lg:pr-5">
                    <div className="mb-3 px-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                      Meeting Summary Views
                    </div>
                    <div className="flex gap-2 overflow-x-auto lg:flex-col lg:overflow-visible">
                      {REPORT_VIEW_OPTIONS.map((option) => (
                        <button
                          key={option.key}
                          type="button"
                          onClick={() => setActiveReportView(option.key)}
                          className={`flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-semibold transition ${
                            activeReportView === option.key
                              ? "bg-primary/10 text-primary"
                              : "text-muted-foreground hover:bg-muted hover:text-foreground"
                          }`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${activeReportView === option.key ? "bg-primary" : "bg-border"}`} />
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </aside>

                  <div className="min-w-0 space-y-4">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                      <h3 className="text-lg font-bold">{activeReportMeta.label}</h3>
                      <span className="text-sm font-medium text-muted-foreground">{activeReportCount} records</span>
                    </div>

            {activeReportView === "summary" && (
            <ReportSectionCard title="Meeting Summary">
              {reportMeetings.length ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Meeting</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Dealer</TableHead>
                      <TableHead>City</TableHead>
                      <TableHead>Owner</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Budget</TableHead>
                      <TableHead>Attendance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reportMeetings.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div className="font-medium">{item.meetingType || "-"}</div>
                          <div className="max-w-[240px] truncate text-xs text-muted-foreground">
                            {item.objective || `Meeting #${item.id}`}
                          </div>
                        </TableCell>
                        <TableCell>{formatDate(item.meetingDate)}</TableCell>
                        <TableCell>{getMeetingDealerLabel(item)}</TableCell>
                        <TableCell>{[item.city, item.state].filter(Boolean).join(", ") || "-"}</TableCell>
                        <TableCell>{item.creatorName || "-"}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={statusBadgeClass(item.status)}>
                            {getMeetingStatusLabel(item)}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatCurrency(item.expectedBudget)}</TableCell>
                        <TableCell>
                          {getActualAttendanceCount(item)}/{item.expectedAttendees || item.attendees?.length || 0}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <ReportEmptyState label="No meetings found for these filters." />
              )}
            </ReportSectionCard>
            )}

            {activeReportView === "expenses" && (
              <ReportSectionCard title="Planned versus Actual Expenses">
                {reportExpenseRows.length ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Expense Head</TableHead>
                        <TableHead>Planned</TableHead>
                        <TableHead>Actual</TableHead>
                        <TableHead>Difference</TableHead>
                        <TableHead>Company</TableHead>
                        <TableHead>Dealer</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reportExpenseRows.map((row) => (
                        <TableRow key={row.head}>
                          <TableCell>
                            <ExpenseHeadChip head={row.head} />
                          </TableCell>
                          <TableCell>{formatCurrency(row.planned)}</TableCell>
                          <TableCell>{formatCurrency(row.actual)}</TableCell>
                          <TableCell>{formatCurrency(row.difference)}</TableCell>
                          <TableCell>{formatCurrency(row.company)}</TableCell>
                          <TableCell>{formatCurrency(row.dealer)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <ReportEmptyState label="No planned or actual expenses found." />
                )}
              </ReportSectionCard>
            )}

            {activeReportView === "gifts" && (
              <ReportSectionCard title="Planned versus Issued Gifts">
                {reportGiftRows.length ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Gift / Item</TableHead>
                        <TableHead>Planned</TableHead>
                        <TableHead>Issued</TableHead>
                        <TableHead>Difference</TableHead>
                        <TableHead>Estimated Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reportGiftRows.map((row) => (
                        <TableRow key={row.item}>
                          <TableCell className="font-medium">{row.item}</TableCell>
                          <TableCell>{row.planned}</TableCell>
                          <TableCell>{row.issued}</TableCell>
                          <TableCell>{row.difference}</TableCell>
                          <TableCell>{formatCurrency(row.estimatedAmount)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <ReportEmptyState label="No planned or issued gifts found." />
                )}
              </ReportSectionCard>
            )}

            {activeReportView === "dealer" && (
              <ReportSectionCard title="Dealer Performance">
                <ReportPerformanceTable rows={dealerPerformanceRows} labelHeader="Dealer / Shop" />
              </ReportSectionCard>
            )}

            {activeReportView === "city" && (
              <ReportSectionCard title="City Performance">
                <ReportPerformanceTable rows={cityPerformanceRows} labelHeader="City / State" />
              </ReportSectionCard>
            )}

            {activeReportView === "officer" && (
            <ReportSectionCard title="Field Officer Performance">
              <ReportPerformanceTable rows={fieldOfficerPerformanceRows} labelHeader="Field Officer" />
            </ReportSectionCard>
            )}

            {activeReportView === "market" && (
            <ReportSectionCard title="Market Database">
              {marketDatabaseRows.length ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Mobile</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>City / Area</TableHead>
                      <TableHead>Company / Project</TableHead>
                      <TableHead>Meeting</TableHead>
                      <TableHead>Dealer</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {marketDatabaseRows.map((row) => (
                      <TableRow key={`${row.mobile}-${row.name}`}>
                        <TableCell className="font-medium">{row.name}</TableCell>
                        <TableCell>{row.mobile}</TableCell>
                        <TableCell>{row.category}</TableCell>
                        <TableCell>{row.cityArea}</TableCell>
                        <TableCell>{row.companyShopProject}</TableCell>
                        <TableCell>{row.meetingType}</TableCell>
                        <TableCell>{row.dealer}</TableCell>
                        <TableCell>{row.status}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <ReportEmptyState label="No attendee contact data found." />
              )}
            </ReportSectionCard>
            )}
                  </div>
                </div>
              </CardContent>
            </Card>
              </>
            ) : (
              <Card className="rounded-lg border-border/80 py-0 shadow-sm">
                <CardContent className="flex flex-col items-center gap-3 px-6 py-12 text-center">
                  <FileText className="h-8 w-8 text-muted-foreground" />
                  <div className="space-y-1">
                    <div className="font-bold text-foreground">Waiting for the final report</div>
                    <div className="max-w-xl text-sm leading-6 text-muted-foreground">
                      The final report has not been submitted yet. The plan-versus-actual review and export will appear after the field team submits it.
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {adminTab === "history" && (
          <Card id="meeting-admin-panel-history" role="tabpanel" className="rounded-lg border-border/80 py-0 shadow-sm">
            <CardHeader>
              <CardTitle>History</CardTitle>
            </CardHeader>
            <CardContent>
              {auditHistory.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Action</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Section</TableHead>
                      <TableHead>Remarks</TableHead>
                      <TableHead>By</TableHead>
                      <TableHead>At</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {auditHistory.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell className="font-medium">{entry.action}</TableCell>
                        <TableCell>
                          {[entry.fromStatus, entry.toStatus].filter(Boolean).join(" → ") || "-"}
                        </TableCell>
                        <TableCell>{entry.correctionStage || "-"}</TableCell>
                        <TableCell className="max-w-[280px] whitespace-pre-wrap">{entry.remarks || "-"}</TableCell>
                        <TableCell>{entry.performedByName || entry.performedById || "-"}</TableCell>
                        <TableCell>{entry.performedAt ? format(new Date(entry.performedAt), "dd MMM yyyy, HH:mm") : "-"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                  No history recorded yet.
                </div>
              )}
            </CardContent>
          </Card>
        )}
        {approvalDecisionDialog}
        {finalReviewDecisionDialog}
        {cancelMeetingDialog}
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
          {canSubmit && (
            <Button onClick={submitForApproval} disabled={isSaving}>
              <Send className="h-4 w-4" />
              Submit
            </Button>
          )}
        </div>
      </div>

      <MeetingKpiGrid
        status={meeting.status}
        statusValue={getMeetingStageLabel(meeting)}
        secondaryLabel={showActualSummary ? "Gifts Issued" : "Planned Gifts"}
        secondaryValue={showActualSummary ? issuedGiftDisplay : plannedGiftDisplay}
        financialLabel="Expected Budget"
        financialValue={formatCurrency(meeting.expectedBudget)}
        financialSubMetrics={[
          { label: "Actual Expenses", value: formatCurrency(actualExpenseTotal) },
          {
            label: "Difference",
            value: formatCurrency(budgetDifference),
            valueClassName: budgetDifference <= 0 ? "text-emerald-600" : "text-amber-600",
          },
        ]}
        attendanceLabel={showActualSummary ? "Actual Attendance" : "Expected Turnout"}
        attendanceValue={showActualSummary ? `${actualAttendanceCount}/${namedAttendeeCount || expectedTurnout || 0}` : String(expectedTurnout || 0)}
        attendanceSubMetrics={[{ label: "Named Attendees", value: String(namedAttendeeCount) }]}
      />

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
                      {typeOptions.map((type) => (
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
                  <Label>Expected turnout</Label>
                  <Input type="number" min="0" value={requestForm.expectedAttendees} onChange={(event) => updateRequestForm("expectedAttendees", event.target.value)} />
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
                  <Label>Expected business impact</Label>
                  <Textarea value={requestForm.expectedBusinessImpact} onChange={(event) => updateRequestForm("expectedBusinessImpact", event.target.value)} />
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
                <ReadOnlyField label="Time" value={formatMeetingTime(meeting.meetingTime)} />
                <ReadOnlyField label="City" value={meeting.city} />
                <ReadOnlyField label="State" value={meeting.state} />
                <ReadOnlyField label="Location" value={meeting.location} />
                <ReadOnlyField label="Reference" value={meeting.customerReference} />
                <ReadOnlyField label="Expected budget" value={formatCurrency(meeting.expectedBudget)} />
                <ReadOnlyField label="Expected turnout" value={meeting.expectedAttendees} />
                <ReadOnlyField label="Named attendees" value={meeting.attendees?.length || 0} />
                <div className="md:col-span-3">
                  <ReadOnlyField label="Objective" value={meeting.objective} />
                </div>
                <div className="md:col-span-3">
                  <ReadOnlyField label="Expected business impact" value={meeting.expectedBusinessImpact} />
                </div>
                <div className="md:col-span-3">
                  <ReadOnlyField
                    label="Expected gifts / materials"
                    value={<ExpectedGiftsDisplay gifts={plannedGifts} fallback={meeting.expectedGiftsMaterials || meeting.plan?.expectedGiftsMaterials} />}
                  />
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
              <ReadOnlyField label="Status" value={getMeetingStatusLabel(meeting)} />
              <ReadOnlyField label="Current approval remarks" value={meeting.approvalRemarks} />
              <ReadOnlyField label="Budget" value={formatCurrency(meeting.expectedBudget)} />
            </div>
            {canApprove || canReject || canRequestCorrection ? (
              <Button className="w-fit" onClick={() => setIsApprovalDecisionOpen(true)}>
                <CheckCircle2 className="h-4 w-4" />
                Review Decision
              </Button>
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
                      Finalise Attendance
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
                    {currentGiftOptions.length ? (
                      <Select
                        value={gift.giftItem || ""}
                        onValueChange={(value) => setGifts((prev) => prev.map((item, currentIndex) => currentIndex === index ? { ...item, giftItem: value } : item))}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Gift / item" />
                        </SelectTrigger>
                        <SelectContent>
                          {currentGiftOptions.map((item) => (
                            <SelectItem key={item} value={item}>
                              {item}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input placeholder="Gift / item" value={gift.giftItem} onChange={(event) => setGifts((prev) => prev.map((item, currentIndex) => currentIndex === index ? { ...item, giftItem: event.target.value } : item))} />
                    )}
                    <Input type="number" min="1" placeholder="Qty" value={gift.quantity} onChange={(event) => setGifts((prev) => prev.map((item, currentIndex) => currentIndex === index ? { ...item, quantity: Number(event.target.value) } : item))} />
                    <div className="flex gap-2">
                      <Input placeholder="Remarks" value={gift.remarks || ""} onChange={(event) => setGifts((prev) => prev.map((item, currentIndex) => currentIndex === index ? { ...item, remarks: event.target.value } : item))} />
                      {gifts.length > 1 && (
                        <Button variant="ghost" size="icon" onClick={() => removeGift(index)} disabled={isSaving}>
                          <XCircle className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
                <div className="flex flex-wrap gap-2">
                  <Button onClick={saveGifts} disabled={isSaving || presentAttendees.length === 0}>
                    <Gift className="h-4 w-4" />
                    Save Gifts
                  </Button>
                  <Button variant="outline" onClick={markNoGifts} disabled={isSaving}>
                    No Gifts Distributed
                  </Button>
                </div>
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
                  <div key={index} className="grid gap-3 rounded-lg border p-3 md:grid-cols-6">
                    <Select value={expense.expenseHead} onValueChange={(value) => setExpenses((prev) => prev.map((item, currentIndex) => currentIndex === index ? { ...item, expenseHead: value } : item))}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {currentExpenseHeadOptions.map((head) => (
                          <SelectItem key={head} value={head}>
                            {head}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input type="number" min="0" value={expense.amount} onChange={(event) => setExpenses((prev) => prev.map((item, currentIndex) => currentIndex === index ? { ...item, amount: Number(event.target.value) } : item))} />
                    <Select value={expense.paidBy || "COMPANY"} onValueChange={(value) => setExpenses((prev) => prev.map((item, currentIndex) => currentIndex === index ? { ...item, paidBy: value } : item))}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="COMPANY">Company</SelectItem>
                        <SelectItem value="DEALER">Dealer</SelectItem>
                        <SelectItem value="SHARED">Shared</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input type="date" value={expense.expenseDate || ""} onChange={(event) => setExpenses((prev) => prev.map((item, currentIndex) => currentIndex === index ? { ...item, expenseDate: event.target.value } : item))} />
                    <Input placeholder="Remarks" value={expense.remarks || ""} onChange={(event) => setExpenses((prev) => prev.map((item, currentIndex) => currentIndex === index ? { ...item, remarks: event.target.value } : item))} />
                    <Button variant="ghost" size="icon" disabled={expenses.length === 1 || isSaving} onClick={() => removeExpense(index)}>
                      <XCircle className="h-4 w-4" />
                    </Button>
                    {expense.paidBy === "SHARED" && (
                      <>
                        <Input
                          type="number"
                          min="0"
                          placeholder="Company amount"
                          value={expense.companyAmount ?? ""}
                          onChange={(event) => setExpenses((prev) => prev.map((item, currentIndex) => currentIndex === index ? { ...item, companyAmount: Number(event.target.value) } : item))}
                        />
                        <Input
                          type="number"
                          min="0"
                          placeholder="Dealer amount"
                          value={expense.dealerAmount ?? ""}
                          onChange={(event) => setExpenses((prev) => prev.map((item, currentIndex) => currentIndex === index ? { ...item, dealerAmount: Number(event.target.value) } : item))}
                        />
                      </>
                    )}
                  </div>
                ))}
                <div className="space-y-2">
                  <Label>Expense remarks {totalExpenses > Number(meeting.expectedBudget || 0) ? "(required because actual is higher)" : ""}</Label>
                  <Textarea value={expenseRemarks} onChange={(event) => setExpenseRemarks(event.target.value)} />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button onClick={submitExpenses} disabled={isSaving}>
                    <Send className="h-4 w-4" />
                    Submit Expenses
                  </Button>
                  <Button variant="outline" onClick={markNoExpenses} disabled={isSaving}>
                    No Expenses Incurred
                  </Button>
                </div>
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
                    <Label>Actual business outcome</Label>
                    <Textarea value={finalReport.actualBusinessOutcome} onChange={(event) => setFinalReport((prev) => ({ ...prev, actualBusinessOutcome: event.target.value }))} disabled={!canSubmitFinalReport} />
                  </div>
                  <div className="space-y-2">
                    <Label>Leads generated</Label>
                    <Textarea value={finalReport.leadsGenerated} onChange={(event) => setFinalReport((prev) => ({ ...prev, leadsGenerated: event.target.value }))} disabled={!canSubmitFinalReport} />
                  </div>
                  <div className="space-y-2">
                    <Label>Lead count</Label>
                    <Input
                      type="number"
                      min="0"
                      value={finalReport.leadCount ?? ""}
                      onChange={(event) => setFinalReport((prev) => ({ ...prev, leadCount: event.target.value === "" ? undefined : Number(event.target.value) }))}
                      disabled={!canSubmitFinalReport}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Lead details</Label>
                    <Textarea value={finalReport.leadDetails} onChange={(event) => setFinalReport((prev) => ({ ...prev, leadDetails: event.target.value }))} disabled={!canSubmitFinalReport} />
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
                  <div className="flex flex-wrap gap-2 border-t pt-4">
                    {(canApproveFinalReport || canClose) && (
                      <Button onClick={() => setIsFinalReviewDecisionOpen(true)}>
                        <CheckCircle2 className="h-4 w-4" />
                        Final Review Decision
                      </Button>
                    )}
                    {canCancel && (
                      <Button variant="destructive" onClick={() => setIsCancelMeetingOpen(true)}>
                        Cancel Meeting
                      </Button>
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
      {approvalDecisionDialog}
      {finalReviewDecisionDialog}
      {cancelMeetingDialog}
    </div>
  );
}
