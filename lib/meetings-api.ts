const MEETINGS_API_BASE_URL = "https://api.gajkesaristeels.in";

export const MEETING_TYPES = [
  "Counter",
  "Dealer",
  "Mason",
  "Contractor",
  "Engineer",
  "Architect",
] as const;

export const ATTENDEE_CATEGORIES = [
  "mason",
  "contractor",
  "engineer",
  "architect",
  "dealer",
  "counter",
  "customer",
  "other",
] as const;

export const EXPENSE_HEADS = [
  "venue",
  "food/snacks",
  "travel",
  "printing/material",
  "gifts",
  "other",
] as const;

export type MeetingStatus =
  | "DRAFT"
  | "PENDING_APPROVAL"
  | "APPROVED"
  | "EXECUTED"
  | "EXPENSE_SUBMITTED"
  | "REPORT_SUBMITTED"
  | "CLOSED"
  | "REJECTED"
  | "CORRECTION_REQUIRED"
  | "CANCELLED"
  | string;

export type MeetingAction =
  | "APPROVE"
  | "REJECT"
  | "REQUEST_CORRECTION"
  | "EXECUTE"
  | "MARK_ATTENDANCE"
  | "ISSUE_GIFTS"
  | "SUBMIT_EXPENSES"
  | "SUBMIT_FINAL_REPORT"
  | "APPROVE_FINAL_REPORT"
  | "APPROVE_AND_CLOSE"
  | "CLOSE"
  | "CANCEL"
  | "EDIT_REQUEST"
  | "SUBMIT"
  | string;

export type CorrectionStage =
  | "REQUEST"
  | "ATTENDEES"
  | "ATTENDANCE"
  | "GIFTS"
  | "EXPENSES"
  | "LEADS"
  | "FINAL_REPORT"
  | string;

export interface MeetingTabs {
  request?: boolean;
  attendees?: boolean;
  approval?: boolean;
  execution?: boolean;
  gifts?: boolean;
  expenses?: boolean;
  finalReport?: boolean;
}

export interface MeetingTypeConfig {
  id: number;
  name: string;
  active: boolean;
}

export interface MeetingConfigItem {
  id: number;
  name: string;
  active?: boolean;
}

export interface MeetingAttendee {
  id?: number;
  meetingId?: number;
  attendeeId?: number;
  name: string;
  mobileNumber: string;
  email?: string | null;
  category: string;
  cityArea?: string | null;
  companyShopProject?: string | null;
  expected?: boolean;
  present?: boolean;
  attendanceSource?: string | null;
  categoryDetails?: string | null;
  remarks?: string | null;
}

export interface MeetingGift {
  id?: number;
  meetingId?: number;
  meetingAttendeeId?: number;
  attendeeName?: string;
  giftItem: string;
  quantity: number;
  estimatedAmount?: number;
  remarks?: string | null;
}

export interface MeetingExpense {
  id?: number;
  meetingId?: number;
  expenseHead: string;
  amount: number;
  paidBy?: "COMPANY" | "DEALER" | "SHARED" | string;
  companyAmount?: number;
  dealerAmount?: number;
  expenseDate?: string;
  remarks?: string | null;
}

export interface MeetingPlan {
  id?: number;
  meetingId?: number;
  expectedBudget?: number;
  plannedExpenseDetails?: string | MeetingExpense[];
  expectedGiftsMaterials?: string | MeetingGift[];
  plannedGiftDetails?: string | MeetingGift[];
  companyContribution?: number;
  dealerContribution?: number;
  budgetRemarks?: string | null;
}

export interface CreateMeetingPlanPayload {
  expectedBudget?: number;
  plannedExpenseDetails?: string;
  expectedGiftsMaterials?: string;
  plannedGiftDetails?: string;
  companyContribution?: number;
  dealerContribution?: number;
  budgetRemarks?: string | null;
}

export interface MeetingAuditHistory {
  id: number;
  meetingId: number;
  action: string;
  fromStatus?: string | null;
  toStatus?: string | null;
  correctionStage?: CorrectionStage | null;
  remarks?: string | null;
  performedById?: number | null;
  performedByName?: string | null;
  performedAt?: string | null;
}

export interface Meeting {
  id: number;
  meetingType: string;
  creatorId?: number;
  creatorName?: string;
  meetingDate?: string;
  meetingTime?: string;
  city?: string;
  state?: string;
  location?: string;
  storeId?: number;
  storeName?: string;
  dealerName?: string;
  customerReference?: string;
  expectedAttendees?: number;
  objective?: string;
  expectedBusinessImpact?: string;
  expectedBudget?: number;
  expectedGiftsMaterials?: string;
  allowWalkInAttendees?: boolean;
  remarks?: string;
  approvalRemarks?: string;
  approvalPersonId?: number | null;
  approvalPersonName?: string | null;
  correctionStage?: CorrectionStage | null;
  correctionRemarks?: string | null;
  correctionRequestedAt?: string | null;
  correctionRequestedById?: number | null;
  correctionRequestedByName?: string | null;
  correctionReturnStatus?: MeetingStatus | null;
  expenseVarianceRemarks?: string | null;
  cancellationRemarks?: string | null;
  cancellationReason?: string | null;
  cancelledAt?: string | null;
  cancelledById?: number | null;
  cancelledByName?: string | null;
  rejectionReason?: string | null;
  rejectedAt?: string | null;
  rejectedById?: number | null;
  rejectedByName?: string | null;
  actualMeetingDate?: string;
  actualMeetingTime?: string;
  actualLocation?: string;
  executionRemarks?: string;
  attendanceFinalized?: boolean;
  giftsCompleted?: boolean;
  noGifts?: boolean;
  expensesCompleted?: boolean;
  noExpenses?: boolean;
  meetingSummary?: string;
  keyDiscussionPoints?: string;
  leadsGenerated?: string;
  leadCount?: number;
  leadDetails?: string;
  interestedCustomers?: string;
  competitorInformation?: string;
  actualBusinessOutcome?: string;
  finalRemarks?: string;
  finalReportApprovalRemarks?: string;
  finalReportApproved?: boolean;
  finalReportApprovedById?: number | null;
  finalReportApprovedByName?: string | null;
  actualAttendeeCount?: number;
  plannedExpenseTotal?: number;
  actualExpenseTotal?: number;
  expenseVariance?: number;
  actualGiftQuantity?: number;
  status: MeetingStatus;
  statusLabel?: string;
  stageLabel?: string;
  plan?: MeetingPlan | null;
  attendees?: MeetingAttendee[];
  gifts?: MeetingGift[];
  expenses?: MeetingExpense[];
  auditHistory?: MeetingAuditHistory[];
  tabs?: MeetingTabs;
  allowedActions?: MeetingAction[];
}

export interface MeetingFilters {
  start?: string;
  end?: string;
  status?: string;
  meetingType?: string;
  city?: string;
  state?: string;
  page?: number;
  size?: number;
  sortBy?: string;
  sortDir?: "asc" | "desc" | string;
  query?: string;
}

export interface MeetingPageResponse<T> {
  content?: T[];
  data?: T[];
  items?: T[];
  totalElements?: number;
  totalPages?: number;
  page?: number;
  number?: number;
  size?: number;
  first?: boolean;
  last?: boolean;
  numberOfElements?: number;
  empty?: boolean;
}

export interface MeetingPage<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
  first: boolean;
  last: boolean;
}

export interface MeetingDashboardSummary {
  totalMeetings?: number;
  byStatus?: Record<string, number>;
  byStatusLabel?: Record<string, number>;
  pendingApproval?: number;
  pendingFinalReview?: number;
  closed?: number;
  totalActualExpense?: number;
}

export interface CreateMeetingPayload {
  meetingType: string;
  meetingDate?: string;
  meetingTime?: string;
  city?: string;
  state?: string;
  location?: string;
  storeId?: number;
  customerReference?: string;
  expectedAttendees?: number;
  objective?: string;
  expectedBusinessImpact?: string;
  expectedBudget?: number;
  expectedGiftsMaterials?: string;
  allowWalkInAttendees?: boolean;
  remarks?: string;
  plan?: CreateMeetingPlanPayload;
  attendees?: MeetingAttendee[];
}

export type EditMeetingRequestPayload = Partial<Omit<CreateMeetingPayload, "plan">> & {
  plan?: MeetingPlan;
};

export interface ApprovalPayload {
  approvalRemarks: string;
}

export interface CorrectionPayload extends ApprovalPayload {
  correctionStage: CorrectionStage;
  correctionRemarks: string;
}

export interface ExecuteMeetingPayload {
  actualMeetingDate: string;
  actualMeetingTime: string;
  actualLocation: string;
  executionRemarks?: string;
}

export interface AttendancePayload {
  id: number;
  present: boolean;
  attendanceSource: "MANUAL" | "FORM" | string;
  remarks?: string;
}

export interface FinaliseAttendancePayload extends ExecuteMeetingPayload {
  attendees: AttendancePayload[];
}

export interface SubmitExpensesPayload {
  remarks?: string;
  expenses: MeetingExpense[];
}

export interface FinalReportPayload {
  meetingSummary: string;
  keyDiscussionPoints?: string;
  leadsGenerated?: string;
  leadCount?: number;
  leadDetails?: string;
  interestedCustomers?: string;
  competitorInformation?: string;
  actualBusinessOutcome?: string;
  finalRemarks?: string;
}

export interface FinalReviewPayload {
  finalReportApprovalRemarks?: string;
  finalRemarks?: string;
}

const getAuthToken = () => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("authToken");
};

const buildQuery = (params: object) => {
  const search = new URLSearchParams();
  Object.entries(params as Record<string, string | number | boolean | undefined | null>).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    search.set(key, String(value));
  });
  const query = search.toString();
  return query ? `?${query}` : "";
};

const parseResponse = async <T>(response: Response): Promise<T> => {
  const text = await response.text();
  if (!response.ok) {
    throw new Error(text || `Request failed with status ${response.status}`);
  }

  if (!text) return undefined as T;

  try {
    return JSON.parse(text) as T;
  } catch {
    return text as T;
  }
};

const unwrapPage = <T>(response: MeetingPageResponse<T> | T[]): T[] => {
  if (Array.isArray(response)) return response;
  return response.content ?? response.data ?? response.items ?? [];
};

const normalizePage = <T>(response: MeetingPageResponse<T> | T[], fallbackSize = 200): MeetingPage<T> => {
  const content = unwrapPage(response);
  if (Array.isArray(response)) {
    return {
      content,
      totalElements: content.length,
      totalPages: 1,
      number: 0,
      size: fallbackSize,
      first: true,
      last: true,
    };
  }

  const size = response.size ?? fallbackSize;
  const totalElements = response.totalElements ?? content.length;
  const totalPages = response.totalPages ?? Math.max(1, Math.ceil(totalElements / Math.max(size, 1)));
  const number = response.page ?? response.number ?? 0;

  return {
    content,
    totalElements,
    totalPages,
    number,
    size,
    first: response.first ?? number <= 0,
    last: response.last ?? number >= totalPages - 1,
  };
};

const buildV2MeetingFilters = (filters: MeetingFilters = {}, overrides: Partial<MeetingFilters> = {}) => {
  const merged = { ...filters, ...overrides };
  return {
    startDate: merged.start,
    endDate: merged.end,
    status: merged.status,
    meetingType: merged.meetingType,
    city: merged.city,
    state: merged.state,
    query: merged.query,
    page: merged.page ?? 0,
    size: Math.min(Number(merged.size || 20), 100),
    sortBy: merged.sortBy ?? 'meetingDate',
    sortOrder: merged.sortDir ?? 'desc',
  };
};

const getAllMeetingAttendees = async (): Promise<MeetingAttendee[]> => {
  const size = 500;
  const first = await meetingRequest<MeetingPageResponse<MeetingAttendee>>(
    `/v2/meetings/attendees${buildQuery({ page: 0, size })}`,
  );
  const firstPage = normalizePage(first, size);
  const attendees = [...firstPage.content];
  for (let page = 1; page < firstPage.totalPages; page += 1) {
    const response = await meetingRequest<MeetingPageResponse<MeetingAttendee>>(
      `/v2/meetings/attendees${buildQuery({ page, size })}`,
    );
    const nextPage = normalizePage(response, size);
    attendees.push(...nextPage.content);
    if (nextPage.last) break;
  }
  return attendees;
};

const meetingRequest = async <T>(endpoint: string, options: RequestInit = {}): Promise<T> => {
  const token = getAuthToken();
  if (!token) {
    throw new Error("Authentication token not found. Please log in.");
  }

  const response = await fetch(`${MEETINGS_API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });

  return parseResponse<T>(response);
};

const meetingBlobRequest = async (endpoint: string, options: RequestInit = {}): Promise<Blob> => {
  const token = getAuthToken();
  if (!token) {
    throw new Error("Authentication token not found. Please log in.");
  }

  const response = await fetch(`${MEETINGS_API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed with status ${response.status}`);
  }

  return response.blob();
};

export const meetingsApi = {
  getMeetingTypes: () => meetingRequest<MeetingTypeConfig[]>("/meeting/config/types"),

  getGiftItems: () => meetingRequest<MeetingConfigItem[] | string[]>("/meeting/config/giftItems"),

  getExpenseHeads: () => meetingRequest<MeetingConfigItem[] | string[]>("/meeting/config/expenseHeads"),

  createMeetingType: (payload: { name: string; active: boolean }) =>
    meetingRequest<number>("/meeting/config/type", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  createGiftItem: (payload: { name: string; active?: boolean }) =>
    meetingRequest<number>("/meeting/config/giftItem", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  createExpenseHead: (payload: { name: string; active?: boolean }) =>
    meetingRequest<number>("/meeting/config/expenseHead", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  deleteMeetingType: (id: number) =>
    meetingRequest<string>(`/meeting/config/type${buildQuery({ id })}`, {
      method: "DELETE",
    }),

  deleteGiftItem: (id: number) =>
    meetingRequest<string>(`/meeting/config/giftItem${buildQuery({ id })}`, {
      method: "DELETE",
    }),

  deleteExpenseHead: (id: number) =>
    meetingRequest<string>(`/meeting/config/expenseHead${buildQuery({ id })}`, {
      method: "DELETE",
    }),

  createMeeting: (payload: CreateMeetingPayload) =>
    meetingRequest<number>("/meeting/create", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  editMeetingRequest: (meetingId: number, payload: EditMeetingRequestPayload) =>
    meetingRequest<string>(`/meeting/editRequest${buildQuery({ id: meetingId })}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),

  saveExpectedAttendees: (meetingId: number, attendees: MeetingAttendee[]) =>
    meetingRequest<string>(`/meeting/attendees/replace${buildQuery({ id: meetingId })}`, {
      method: "PUT",
      body: JSON.stringify(attendees),
    }),

  deleteExpectedAttendee: (meetingId: number, meetingAttendeeId: number) =>
    meetingRequest<string>(`/meeting/attendees/delete${buildQuery({ id: meetingId, meetingAttendeeId })}`, {
      method: "DELETE",
    }),

  submitForApproval: (meetingId: number) =>
    meetingRequest<string>(`/meeting/submit${buildQuery({ id: meetingId })}`, {
      method: "PUT",
    }),

  getApprovalQueue: (filters: MeetingFilters = {}) =>
    meetingRequest<MeetingPageResponse<Meeting> | Meeting[]>(
      `/v2/meetings${buildQuery(buildV2MeetingFilters(filters, { status: filters.status || 'PENDING_APPROVAL' }))}`
    ).then((response) => normalizePage(response, Number(filters.size || 20))),

  approveMeeting: (meetingId: number, payload: ApprovalPayload) =>
    meetingRequest<string>(`/meeting/approve${buildQuery({ id: meetingId })}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),

  rejectMeeting: (meetingId: number, payload: ApprovalPayload) =>
    meetingRequest<string>(`/meeting/reject${buildQuery({ id: meetingId })}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),

  requestCorrection: (meetingId: number, payload: CorrectionPayload) =>
    meetingRequest<string>(`/meeting/requestCorrection${buildQuery({ id: meetingId })}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),

  resubmitCorrection: (meetingId: number) =>
    meetingRequest<string>(`/meeting/resubmitCorrection${buildQuery({ id: meetingId })}`, {
      method: "PUT",
    }),

  executeMeeting: (meetingId: number, payload: ExecuteMeetingPayload) =>
    meetingRequest<string>(`/meeting/execute${buildQuery({ id: meetingId })}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),

  markAttendance: (meetingId: number, payload: AttendancePayload[]) =>
    meetingRequest<string>(`/meeting/attendance${buildQuery({ id: meetingId })}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),

  finaliseAttendance: (meetingId: number, payload: FinaliseAttendancePayload) =>
    meetingRequest<string>(`/meeting/attendance/finalise${buildQuery({ id: meetingId })}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),

  addWalkInAttendee: (meetingId: number, payload: MeetingAttendee) =>
    meetingRequest<MeetingAttendee>(`/meeting/attendance/scan${buildQuery({ id: meetingId })}`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  saveGifts: (meetingId: number, gifts: MeetingGift[]) =>
    meetingRequest<string>(`/meeting/gifts${buildQuery({ id: meetingId })}`, {
      method: "PUT",
      body: JSON.stringify({ gifts }),
    }),

  markNoGifts: (meetingId: number) =>
    meetingRequest<string>(`/meeting/gifts/noGifts${buildQuery({ id: meetingId })}`, {
      method: "PUT",
    }),

  deleteGift: (meetingId: number, giftId: number) =>
    meetingRequest<string>(`/meeting/gifts/delete${buildQuery({ id: meetingId, giftId })}`, {
      method: "DELETE",
    }),

  submitExpenses: (meetingId: number, payload: SubmitExpensesPayload) =>
    meetingRequest<string>(`/meeting/expenses${buildQuery({ id: meetingId })}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),

  markNoExpenses: (meetingId: number) =>
    meetingRequest<string>(`/meeting/expenses/noExpenses${buildQuery({ id: meetingId })}`, {
      method: "PUT",
    }),

  deleteExpense: (meetingId: number, expenseId: number) =>
    meetingRequest<string>(`/meeting/expenses/delete${buildQuery({ id: meetingId, expenseId })}`, {
      method: "DELETE",
    }),

  submitFinalReport: (meetingId: number, payload: FinalReportPayload) =>
    meetingRequest<string>(`/meeting/finalReport${buildQuery({ id: meetingId })}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),

  approveFinalReport: (meetingId: number, payload: { finalReportApprovalRemarks: string }) =>
    meetingRequest<string>(`/meeting/finalReport/approve${buildQuery({ id: meetingId })}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),

  approveAndCloseFinalReport: (meetingId: number, payload: FinalReviewPayload) =>
    meetingRequest<string>(`/meeting/finalReport/approveAndClose${buildQuery({ id: meetingId })}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),

  requestFinalReportCorrection: (meetingId: number, payload: CorrectionPayload) =>
    meetingRequest<string>(`/meeting/finalReport/requestCorrection${buildQuery({ id: meetingId })}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),

  sendBackForCorrection: (meetingId: number, payload: CorrectionPayload) =>
    meetingRequest<string>(`/meeting/sendBackForCorrection${buildQuery({ id: meetingId })}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),

  closeMeeting: (meetingId: number, payload: { finalRemarks: string }) =>
    meetingRequest<string>(`/meeting/close${buildQuery({ id: meetingId })}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),

  cancelMeeting: (meetingId: number, payload: { remarks: string }) =>
    meetingRequest<string>(`/meeting/cancel${buildQuery({ id: meetingId })}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),

  getMeetingById: (meetingId: number) =>
    meetingRequest<Meeting>(`/meeting/getById${buildQuery({ id: meetingId })}`),

  getMeetingsPage: (filters: MeetingFilters = {}) =>
    meetingRequest<MeetingPageResponse<Meeting> | Meeting[]>(
      `/v2/meetings${buildQuery(buildV2MeetingFilters(filters))}`
    ).then((response) => normalizePage(response, Number(filters.size || 20))),

  getMeetings: (filters: MeetingFilters = {}) =>
    meetingRequest<MeetingPageResponse<Meeting> | Meeting[]>(
      `/v2/meetings${buildQuery(buildV2MeetingFilters(filters))}`
    ).then((response) => normalizePage(response, Number(filters.size || 20)).content),

  getDashboardSummary: (filters: Omit<MeetingFilters, "status"> = {}) =>
    meetingRequest<MeetingDashboardSummary>(`/v2/meetings/dashboard/summary${buildQuery({ startDate: filters.start, endDate: filters.end })}`),

  getMeetingAudit: (meetingId: number) =>
    meetingRequest<MeetingAuditHistory[]>(`/meeting/audit${buildQuery({ id: meetingId })}`),

  getStatuses: () => meetingRequest<Array<{ status: string; label?: string; stageLabel?: string }> | string[]>("/meeting/statuses"),

  getReportsPage: (filters: MeetingFilters = {}) =>
    meetingRequest<MeetingPageResponse<Meeting> | Meeting[]>(
      `/v2/meetings${buildQuery(buildV2MeetingFilters(filters))}`
    ).then((response) => normalizePage(response, Number(filters.size || 20))),

  getReports: (filters: MeetingFilters = {}) =>
    meetingRequest<MeetingPageResponse<Meeting> | Meeting[]>(
      `/v2/meetings${buildQuery(buildV2MeetingFilters(filters))}`
    ).then((response) => normalizePage(response, 20).content),

  exportReport: (filters: MeetingFilters = {}) =>
    meetingBlobRequest(`/v2/meetings/report/export${buildQuery({
      startDate: filters.start,
      endDate: filters.end,
      status: filters.status,
      meetingType: filters.meetingType,
      city: filters.city,
      state: filters.state,
      query: filters.query,
    })}`),

  getReportById: (meetingId: number) =>
    meetingRequest<Meeting>(`/meeting/report/getById${buildQuery({ id: meetingId })}`),

  getAttendeeMaster: getAllMeetingAttendees,
};

export const hasMeetingAction = (meeting: Pick<Meeting, "allowedActions"> | null | undefined, action: MeetingAction) =>
  Boolean(meeting?.allowedActions?.includes(action));

export const isMeetingTabEnabled = (
  meeting: Pick<Meeting, "tabs" | "status"> | null | undefined,
  tab: keyof MeetingTabs
) => {
  if (!meeting) return false;
  if (meeting.tabs && Object.prototype.hasOwnProperty.call(meeting.tabs, tab)) {
    return Boolean(meeting.tabs[tab]);
  }
  return tab === "request" || tab === "attendees";
};

const MEETING_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  PENDING_APPROVAL: "Submitted for Approval",
  APPROVED: "Scheduled",
  EXECUTED: "Meeting Conducted",
  EXPENSE_SUBMITTED: "Expenses Submitted",
  REPORT_SUBMITTED: "Submitted for Final Review",
  CLOSED: "Closed",
  REJECTED: "Rejected",
  CORRECTION_REQUIRED: "Correction Required",
  CANCELLED: "Cancelled",
};

export const formatMeetingStatus = (status?: string) =>
  (MEETING_STATUS_LABELS[status || ""] ||
    (status || "UNKNOWN")
      .toLowerCase()
      .split("_")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" "));

export const getMeetingStatusLabel = (meeting?: Pick<Meeting, "status" | "statusLabel"> | null) =>
  meeting?.statusLabel || formatMeetingStatus(meeting?.status);

export const getMeetingStageLabel = (meeting?: Pick<Meeting, "stageLabel" | "status" | "statusLabel"> | null) =>
  meeting?.stageLabel || getMeetingStatusLabel(meeting);
