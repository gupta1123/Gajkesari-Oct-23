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
  | "CLOSE"
  | "CANCEL"
  | "EDIT_REQUEST"
  | "SUBMIT"
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
  remarks?: string | null;
}

export interface MeetingExpense {
  id?: number;
  meetingId?: number;
  expenseHead: string;
  amount: number;
  expenseDate?: string;
  remarks?: string | null;
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
  customerReference?: string;
  expectedAttendees?: number;
  objective?: string;
  expectedBudget?: number;
  expectedGiftsMaterials?: string;
  allowWalkInAttendees?: boolean;
  remarks?: string;
  approvalRemarks?: string;
  actualMeetingDate?: string;
  actualMeetingTime?: string;
  actualLocation?: string;
  executionRemarks?: string;
  meetingSummary?: string;
  keyDiscussionPoints?: string;
  leadsGenerated?: string;
  interestedCustomers?: string;
  competitorInformation?: string;
  finalRemarks?: string;
  finalReportApprovalRemarks?: string;
  actualAttendeeCount?: number;
  status: MeetingStatus;
  attendees?: MeetingAttendee[];
  gifts?: MeetingGift[];
  expenses?: MeetingExpense[];
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
}

export interface CreateMeetingPayload {
  meetingType: string;
  creatorId: number;
  meetingDate: string;
  meetingTime: string;
  city: string;
  state: string;
  location: string;
  customerReference?: string;
  expectedAttendees: number;
  objective: string;
  expectedBudget: number;
  expectedGiftsMaterials?: string;
  allowWalkInAttendees: boolean;
  remarks?: string;
}

export type EditMeetingRequestPayload = Partial<Omit<CreateMeetingPayload, "creatorId">>;

export interface ApprovalPayload {
  approvalRemarks: string;
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

export interface SubmitExpensesPayload {
  remarks?: string;
  expenses: MeetingExpense[];
}

export interface FinalReportPayload {
  meetingSummary: string;
  keyDiscussionPoints?: string;
  leadsGenerated?: string;
  interestedCustomers?: string;
  competitorInformation?: string;
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

export const meetingsApi = {
  getMeetingTypes: () => meetingRequest<MeetingTypeConfig[]>("/meeting/config/types"),

  createMeetingType: (payload: { name: string; active: boolean }) =>
    meetingRequest<number>("/meeting/config/type", {
      method: "POST",
      body: JSON.stringify(payload),
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
    meetingRequest<string>(`/meeting/attendees${buildQuery({ id: meetingId })}`, {
      method: "PUT",
      body: JSON.stringify(attendees),
    }),

  submitForApproval: (meetingId: number) =>
    meetingRequest<string>(`/meeting/submit${buildQuery({ id: meetingId })}`, {
      method: "PUT",
    }),

  getApprovalQueue: () => meetingRequest<Meeting[]>("/meeting/approvalQueue"),

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

  requestCorrection: (meetingId: number, payload: ApprovalPayload) =>
    meetingRequest<string>(`/meeting/requestCorrection${buildQuery({ id: meetingId })}`, {
      method: "PUT",
      body: JSON.stringify(payload),
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

  submitExpenses: (meetingId: number, payload: SubmitExpensesPayload) =>
    meetingRequest<string>(`/meeting/expenses${buildQuery({ id: meetingId })}`, {
      method: "PUT",
      body: JSON.stringify(payload),
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

  getMeetings: (filters: MeetingFilters = {}) =>
    meetingRequest<Meeting[]>(`/meeting/getAll${buildQuery(filters)}`),

  getReports: (filters: Pick<MeetingFilters, "start" | "end"> = {}) =>
    meetingRequest<Meeting[]>(`/meeting/report${buildQuery(filters)}`),

  getReportById: (meetingId: number) =>
    meetingRequest<Meeting>(`/meeting/report/getById${buildQuery({ id: meetingId })}`),

  getAttendeeMaster: () => meetingRequest<MeetingAttendee[]>("/meeting/attendees/getAll"),
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

export const formatMeetingStatus = (status?: string) =>
  (status || "UNKNOWN")
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
