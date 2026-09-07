// API service for WebSalesV3 - All endpoints from api.md
// Use direct API calls to https://api.gajkesaristeels.in
const API_BASE_URL = 'https://api.gajkesaristeels.in';
const SECONDARY_API_BASE_URL = 'https://api.gajkesaristeels.in';
const DISTANCE_RECALCULATION_API_URL = `${API_BASE_URL}/attendance-log/updateDistanceTravelledForEmployeesWithOlaMaps`;

// Types based on API responses from api.md
export interface EmployeeDto {
  id: number;
  firstName: string;
  lastName: string;
  employeeId: string;
  primaryContact: number;
  secondaryContact: number;
  departmentName: string;
  email: string;
  role: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  country: string;
  pincode: number;
  dateOfJoining: string;
  createdAt: string;
  houseLatitude?: number;
  houseLongitude?: number;
  status?: string;
  teamId?: number;
  officeManager?: boolean;
}

export interface CompactPage<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
}

export interface EmployeeDirectoryParams {
  status?: 'active' | 'inactive' | 'all';
  role?: string;
  city?: string;
  officeManager?: boolean;
  page?: number;
  size?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Alias for backward compatibility
export type Employee = EmployeeDto;

export interface VisitAttachmentResponse {
  fileName: string;
  fileDownloadUri?: string;
  fileType: string;
  tag?: string;
  size?: number;
}

export interface AttachmentMetadata {
  id?: number;
  fileName: string;
  fileType: string;
  tag?: string;
  size?: number;
  fileDownloadUri?: string;
}

export interface VisitDto {
  id: number;
  storeId: number;
  storeName: string;
  storeLatitude?: number;
  storeLongitude?: number;
  intent?: number;
  storePrimaryContact?: number;
  employeeId: number;
  employeeName: string;
  visit_date: string;
  scheduledStartTime?: string;
  scheduledEndTime?: string;
  visitLatitude?: number;
  visitLongitude?: number;
  checkinLatitude?: number;
  checkinLongitude?: number;
  checkoutLatitude?: number;
  checkoutLongitude?: number;
  checkinDate?: string;
  checkoutDate?: string;
  checkinTime?: string;
  checkoutTime?: string;
  vehicleType?: string;
  purpose?: string;
  priority?: string;
  outcome?: string;
  feedback?: string;
  attachment?: Array<Record<string, unknown>>;
  attachmentResponse?: VisitAttachmentResponse[];
  visitIntentId?: number;
  visitIntentValue?: number;
  city?: string;
  district?: string;
  subDistrict?: string;
  state?: string;
  country?: string;
  travelAllowance?: number;
  dearnessAllowance?: number;
  salary?: number;
  isSelfGenerated?: boolean;
  brandsInUse?: Array<Record<string, unknown>>;
  brandProCons?: Array<Record<string, unknown>>;
  assignedById?: number;
  assignedByName?: string;
  statsDto?: Record<string, unknown>;
  createdAt?: string;
  createdTime?: string;
  updatedAt?: string;
  updatedTime?: string;
  intentAuditLogDto?: Record<string, unknown>;
  monthlySale?: number;
  visitDate?: string;
  teamId?: number;
  attachmentCount?: number;
}

export interface VisitCheckoutPayload {
  checkoutLatitude: number;
  checkoutLongitude: number;
  feedback: string;
  outcome: string;
}

export interface VisitResponse {
  content: VisitDto[];
  page?: number;
  pageable?: {
    pageNumber: number;
    pageSize: number;
    sort: {
      empty: boolean;
      sorted: boolean;
      unsorted: boolean;
    };
    offset: number;
    paged: boolean;
    unpaged: boolean;
  };
  totalPages: number;
  totalElements: number;
  last: boolean;
  size: number;
  number?: number;
  sort?: {
    empty: boolean;
    sorted: boolean;
    unsorted: boolean;
  };
  numberOfElements?: number;
  first: boolean;
  empty?: boolean;
}

export interface BrandProCon {
  id: number;
  brandName: string;
  pros: string[];
  cons: string[];
}

export interface IntentAuditLog {
  id: number;
  storeId: number;
  storeName: string;
  oldIntentLevel: number;
  newIntentLevel: number;
  employeeId: number;
  employeeName: string;
  changeDate: string;
  changeTime: string;
  visitId: number;
}

export interface MonthlySaleChange {
  id: number;
  storeId: number;
  storeName: string;
  oldMonthlySale: number;
  newMonthlySale: number;
  visitId: number;
  visitDate: string;
  employeeId: number;
  employeeName: string;
  changeDate: string;
  changeTime: string;
}

export interface Task {
  id: number;
  title: string;
  description: string;
  type: string;
  status: string;
  priority: string;
  assignedTo: string;
  dueDate: string;
  visitId: number;
  assignedToId?: number;
  assignedBy?: string;
  storeName?: string;
  storeCity?: string;
  createdAt?: string;
  updatedAt?: string;
  imageCount?: number;
  taskTitle?: string;
  taskDesciption?: string;
  taskType?: string;
  assignedToName?: string;
  assignedById?: number;
  assignedByName?: string;
  storeId?: number;
  visitDate?: string;
  createdTime?: string;
  updatedTime?: string;
}

// Alias for backward compatibility
export type TaskDto = Task;

export interface Note {
  id: number;
  content: string;
  employeeId: number;
  employeeName: string;
  storeId: number;
  storeName: string;
  visitId: number | null;
  attachment?: Array<{ fileName: string; fileData: string }>;
  attachmentResponse?: Array<{
    fileName: string;
    fileDownloadUri: string;
    fileType: string;
    tag: string;
    size: number;
  }>;
  createdDate: string;
  updatedDate: string;
  createdTime: string | null;
  updatedTime: string | null;
  attachmentCount?: number;
}

// Alias for backward compatibility
export type Visit = VisitDto;

export interface LiveLocationDto {
  id: number;
  empId: number;
  empName: string;
  latitude: number;
  longitude: number;
  updatedAt: string;
  updatedTime: string;
}

// Alias for backward compatibility
export type EmployeeLocation = LiveLocationDto;

export interface AttendanceLogItem {
  id: number;
  employeeId: number;
  employeeName: string;
  attendanceStatus: string;
  visitCount: number;
  uniqueStoreCount?: number;
  travelAllowance?: number;
  dearnessAllowance?: number;
  checkinDate: string;
  checkoutDate: string;
  checkinTime: string;
  checkoutTime: string;
  fullMonthSalary?: number;
}

// Alias for backward compatibility
export type AttendanceLog = AttendanceLogItem;

export interface AttendanceStats {
  weeklyCount?: number;
  monthlyCount?: number;
  yearlyCount?: number;
  uniqueStoreCount: number;
  fullDays: number;
  halfDays: number;
  absences: number;
  travelAllowance: number;
  dearnessAllowance: number;
  salary?: number;
  expenseTotal?: number;
  statsDto: {
    visitCount: number;
    presentDays?: number;
    fullDays: number;
    halfDays: number;
    absences: number;
  };
  employeeId: number;
  employeeName: string;
}

export interface ReportCountsItem {
  weeklyCount?: number;
  monthlyCount?: number;
  yearlyCount?: number;
  uniqueStoreCount: number;
  fullDays: number;
  halfDays: number;
  absences: number;
  travelAllowance: number;
  dearnessAllowance: number;
  salary: number;
  expenseTotal: number;
  statsDto: {
    visitCount: number;
    presentDays: number;
    fullDays: number;
    halfDays: number;
    absences: number;
    expenseTotal: number;
    approvedExpense: number;
  };
  employeeId: number;
  employeeFirstName: string;
  employeeLastName: string;
}

export interface ExpenseDto {
  id: number;
  type: string;
  subType: string;
  amount: number;
  approvalPersonId: number;
  approvalPersonName: string;
  approvalStatus: string;
  description: string;
  approvalDate: string;
  submissionDate: string | null;
  rejectionReason: string | null;
  reimbursedDate: string | null;
  reimbursementAmount: number | null;
  employeeId: number;
  employeeName: string;
  expenseDate: string;
  paymentMethod: string | null;
  attachment?: Array<{ fileName: string; fileData: string }>;
  attachmentResponse?: Array<{ fileName: string; fileDownloadUri: string; fileType: string; tag?: string; size?: number }>;
  attachmentCount?: number;
}

export interface StoreDto {
  storeId: number;
  storeName: string;
  clientFirstName: string;
  clientLastName: string;
  primaryContact: number;
  monthlySale: number | null;
  intent: number | null;
  employeeName: string;
  clientType: string | null;
  totalVisitCount: number;
  lastVisitDate: string | null;
  email: string | null;
  city: string;
  state: string;
  country: string | null;
  // Additional fields from API response
  landmark?: string | null;
  district?: string;
  subDistrict?: string;
  managers?: Array<{ id: number; name: string }>;
  latitude?: number | null;
  longitude?: number | null;
  brandsInUse?: Array<string>;
  employeeId?: number;
  brandProCons?: Array<{ id: number; brandName: string; pros: string[]; cons: string[] }>;
  visitThisMonth?: number;
  outcomeLastVisit?: string;
  createdAt?: string;
  updatedAt?: string;
  createdTime?: string;
  updatedTime?: string;
  secondaryContact?: number | null;
  industry?: string | null;
  companySize?: string | null;
  gstNumber?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  pincode?: number | null;
  likes?: { likeCount: number; userLiked: boolean };
  dateOfBirth?: string | null;
  dob?: string | null;
}

export interface StoreResponse {
  content: StoreDto[];
  page?: number;
  pageable?: {
    pageNumber: number;
    pageSize: number;
    sort: {
      empty: boolean;
      sorted: boolean;
      unsorted: boolean;
    };
    offset: number;
    paged: boolean;
    unpaged: boolean;
  };
  totalPages: number;
  totalElements: number;
  last: boolean;
  size: number;
  number?: number;
  sort?: {
    empty: boolean;
    sorted: boolean;
    unsorted: boolean;
  };
  numberOfElements?: number;
  first: boolean;
  empty?: boolean;
}

export interface StoreSearchParams {
  employeeId?: number;
  teamId?: number;
  storeName?: string;
  primaryContact?: string;
  ownerName?: string;
  city?: string;
  state?: string;
  monthlySale?: number;
  clientType?: string;
  employeeName?: string;
  page?: number;
  size?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface StoreNameDto {
  id: number;
  storeName: string;
}

export interface TaskSearchParams {
  assignedToId?: number;
  assignedById?: number;
  teamId?: number;
  storeId?: number;
  visitId?: number;
  start?: string;
  end?: string;
  taskType?: string;
  status?: string;
  priority?: string;
  page?: number;
  size?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface NoteSearchParams {
  employeeId?: number;
  storeId?: number;
  visitId?: number;
  start?: string;
  end?: string;
  query?: string;
  page?: number;
  size?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ExpenseSearchParams {
  employeeId?: number;
  start?: string;
  end?: string;
  approvalStatus?: string;
  type?: string;
  subType?: string;
  page?: number;
  size?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface EmployeeUserDto {
  id: number;
  firstName: string;
  lastName: string;
  employeeId?: string | number;
  email: string;
  role: string;
  departmentName: string;
  userName: string;
  password: string;
  primaryContact: string;
  secondaryContact?: string;
  dateOfJoining: string;
  city: string;
  state: string;
  assignedCity?: string[];
  country?: string;
  addressLine1?: string;
  addressLine2?: string;
  pincode?: string | number;
  houseLatitude?: number;
  houseLongitude?: number;
  userDto: {
    username: string;
    password: string | null;
    roles: string | null;
    employeeId: number | null;
    firstName: string | null;
    lastName: string | null;
  };
}

export interface EmployeeStatsWithVisits {
  statsDto: {
    visitCount: number;
    fullDays: number;
    halfDays: number;
    absences: number;
    presentDays?: number;
    completedVisitCount?: number;
    totalVisitCount?: number;
    expenseTotal?: number;
    approvedExpense?: number;
  };
  visitDto: VisitDto[];
  visitsByPurpose?: Record<string, number>;
  page?: number;
  size?: number;
  totalElements?: number;
  totalPages?: number;
}

export interface VisitPurposeCount {
  purpose: string;
  count: number;
}

export interface EmployeeVisitSummary {
  completedVisits: number;
  visitsByPurpose: VisitPurposeCount[];
}

export interface EmployeeStatsOptimizedResponse {
  statsDto: EmployeeStatsWithVisits['statsDto'];
  summary: EmployeeVisitSummary;
  visitPage: VisitResponse;
}

export interface EmployeeDashboardSummary {
  employeeId: number;
  employeeName: string;
  startDate: string;
  endDate: string;
  statsDto: EmployeeStatsWithVisits['statsDto'] & {
    presentDays?: number;
    completedVisitCount?: number;
    totalVisitCount?: number;
  };
  visitSummary: EmployeeVisitSummary;
  expenseSummary: {
    expenseCount: number;
    totalAmount: number;
    approvedCount: number;
    approvedAmount: number;
    pendingCount: number;
    pendingAmount: number;
    rejectedCount: number;
    rejectedAmount: number;
  };
  brandSummary: {
    pricingEntryCount: number;
    distinctBrandCount: number;
  };
}

export interface TeamManagerDto {
  id: number;
  firstName?: string | null;
  lastName?: string | null;
  role?: string | null;
  assignedCity?: string[] | null;
  city?: string | null;
  email?: string | null;
  deleted?: boolean;
}

export interface TeamDataDto {
  id: number;
  // Legacy aliases can still appear on older or compatibility payloads.
  office?: TeamManagerDto | null;
  officeManager?: TeamManagerDto | null;
  // Full multi-manager list from the new backend contract.
  officeManagers?: TeamManagerDto[] | null;
  fieldOfficers: EmployeeUserDto[];
}

export interface CurrentUserDto {
  password: string;
  username: string;
  authorities: Array<{
    authority: string;
  }>;
  accountNonExpired: boolean;
  accountNonLocked: boolean;
  credentialsNonExpired: boolean;
  enabled: boolean;
}

export interface DailyBreakdownDto {
  date: string;
  employeeName: string;
  employeeId: number;
  dailyDearnessAllowance: number;
  travelAllowance: number;
  totalDailySalary: number;
  dayType: string;
  completedVisits: number;
  dayOfWeek: string;
  hasAttendance: boolean;
  isSunday: boolean;
  bikeDistanceKm: number;
  carDistanceKm: number;
  dailyBaseSalary: number;
  baseEarned: number;
}

export interface DashboardSummary {
  startDate: string;
  endDate: string;
  totalVisits: number;
  activeEmployees: number;
  countsByEmployee: Array<{
    employeeId: number;
    employeeName: string;
    visitCount: number;
  }>;
}

export interface EmployeeJourneyPoint {
  id: number;
  employeeId: number;
  employeeName: string;
  storeName: string;
  lat: number;
  lng: number;
  coordinateSource: string;
  visitDate: string;
  checkinDate?: string | null;
  checkinTime?: string | null;
  checkoutDate?: string | null;
  checkoutTime?: string | null;
  purpose?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
}

export interface VisitDetailResponse {
  visit: VisitDto;
  store: StoreDto | null;
  attachments: VisitAttachmentResponse[];
  brandProCons: BrandProCon[];
  intentAuditLogs: IntentAuditLog[];
  monthlySaleLogs: MonthlySaleChange[];
  tasks: Task[];
  notes: Note[];
  sitesCount: number;
  latestIntentLevel?: number | null;
}

export interface StoreMonthlyTrend {
  month: string;
  avgMonthlySale: number;
  avgIntent: number;
  totalVisitCount: number;
}

export interface NewCustomerTrendRow {
  month: string;
  employeeId: number;
  employeeName: string;
  newStoreCount: number;
}

export interface NewCustomerTrendPerformer {
  employeeId: number;
  employeeName: string;
  newStoreCount: number;
  totalNewCustomers?: number;
}

export interface NewCustomerTrendsResponse {
  startDate: string;
  endDate: string;
  monthlyTotals: NewCustomerTrendRow[];
  topPerformers: NewCustomerTrendPerformer[];
  bottomPerformers: NewCustomerTrendPerformer[];
}

export type SalaryJobStatus =
  | 'QUEUED'
  | 'RUNNING'
  | 'COMPLETED'
  | 'COMPLETED_WITH_ERRORS'
  | 'FAILED'
  | 'CANCELLED';

export interface SalaryCalculationJob {
  id: string;
  type: 'DAILY_ALL_EMPLOYEES' | 'MONTHLY_ALL_EMPLOYEES' | 'REFRESH_DATE_RANGE';
  status: SalaryJobStatus;
  year?: number | null;
  month?: number | null;
  startDate?: string | null;
  endDate?: string | null;
  includeSundays: boolean;
  totalItems: number;
  processedItems: number;
  successItems: number;
  errorItems: number;
  cancellationRequested: boolean;
  attempt: number;
  createdBy?: string | null;
  message?: string | null;
  createdAt?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
}

type ApiErrorBody = { error?: string; activeJob?: SalaryCalculationJob } | string | null;

export class APIRequestError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly details: ApiErrorBody,
  ) {
    super(message);
    this.name = 'APIRequestError';
  }
}

const appendQueryValue = (query: URLSearchParams, key: string, value: unknown) => {
  if (value === undefined || value === null || value === '' || value === 'all') return;
  query.set(key, String(value));
};

const buildQuery = (params: Record<string, unknown>): string => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => appendQueryValue(query, key, value));
  return query.toString();
};

const normalizePage = <T>(page: CompactPage<T>): CompactPage<T> => ({
  content: Array.isArray(page.content) ? page.content : [],
  page: Number(page.page ?? 0),
  size: Number(page.size ?? 0),
  totalElements: Number(page.totalElements ?? 0),
  totalPages: Number(page.totalPages ?? 0),
  first: Boolean(page.first),
  last: Boolean(page.last),
});

// API Service Class
export class API {
  private baseUrl: string;
  private token: string | null = null;

  constructor() {
    this.baseUrl = API_BASE_URL;
    this.loadToken();
  }

  // Simple connectivity check method
  async checkConnectivity(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      return response.ok;
    } catch (error) {
      console.error('🌐 Connectivity check failed:', error);
      return false;
    }
  }

  // Static methods for backward compatibility
  static async getEmployees(): Promise<EmployeeUserDto[]> {
    return apiService.getAllEmployees();
  }

  static async getReportCounts(startDate: string, endDate: string): Promise<ReportCountsItem[]> {
    return apiService.getReportCounts(startDate, endDate);
  }

  static async getDashboardSummary(startDate: string, endDate: string): Promise<DashboardSummary> {
    return apiService.getDashboardSummary(startDate, endDate);
  }

  static async getEmployeeJourney(employeeId: number, startDate: string, endDate: string): Promise<EmployeeJourneyPoint[]> {
    return apiService.getEmployeeJourney(employeeId, startDate, endDate);
  }

  static async getAttendanceByDate(date: string): Promise<AttendanceLogItem[]> {
    return apiService.getAttendanceForRange(date, date);
  }

  static async recalculateDistanceForEmployeesWithOlaMaps(employeeIds: number[], startDate: string, endDate: string): Promise<string> {
    return apiService.recalculateDistanceForEmployeesWithOlaMaps(employeeIds, startDate, endDate);
  }

  static async getDailyBreakdown(employeeId: number, startDate: string, endDate: string): Promise<DailyBreakdownDto[]> {
    return apiService.getDailyBreakdown(employeeId, startDate, endDate);
  }



  static async getVisitsByDateSorted(startDate: string, endDate: string, page: number = 0, size: number = 10, sort: string = 'visitDate,desc', storeName?: string, employeeName?: string): Promise<VisitResponse> {
    return apiService.getVisitsByDateSorted(startDate, endDate, page, size, sort, storeName, employeeName);
  }

  static async getVisitsByDateSortedOld(startDate: string, endDate: string, page: number = 0, size: number = 10, sort: string = 'id,desc', employeeName?: string): Promise<VisitResponse> {
    return apiService.getVisitsByDateSortedOld(startDate, endDate, page, size, sort, employeeName);
  }

  static async getVisitsForTeam(teamId: number, startDate: string, endDate: string, page: number = 0, size: number = 10, sort: string = 'visitDate,desc', purpose?: string, priority?: string, storeName?: string, employeeName?: string): Promise<VisitResponse> {
    return apiService.getVisitsForTeam(teamId, startDate, endDate, page, size, sort, purpose, priority, storeName, employeeName);
  }

  static async getVisitsForTeams(teamIds: number[], startDate: string, endDate: string, page: number = 0, size: number = 10, sort: string = 'visitDate,desc', purpose?: string, priority?: string, outcome?: string, storeName?: string, employeeName?: string): Promise<VisitResponse> {
    return apiService.getVisitsForTeams(teamIds, startDate, endDate, page, size, sort, purpose, priority, outcome, storeName, employeeName);
  }

  static async checkoutVisit(id: number, payload: VisitCheckoutPayload): Promise<string> {
    return apiService.checkoutVisit(id, payload);
  }

  static async createNote(noteData: {
    content: string;
    employeeId: number;
    storeId: number;
    visitId: number;
  }): Promise<number> {
    return apiService.createNote(noteData);
  }

  static async getAllNotes(): Promise<Note[]> {
    return apiService.getAllNotes();
  }

  static async searchTasks(params: TaskSearchParams): Promise<CompactPage<Task>> {
    return apiService.searchTasks(params);
  }

  static async getTasks(params: TaskSearchParams): Promise<Task[]> {
    return apiService.getTasks(params);
  }

  static async searchNotes(params: NoteSearchParams): Promise<CompactPage<Note>> {
    return apiService.searchNotes(params);
  }

  static async searchExpenses(params: ExpenseSearchParams): Promise<CompactPage<ExpenseDto>> {
    return apiService.searchExpenses(params);
  }

  static async getExpenseAttachments(expenseId: number): Promise<AttachmentMetadata[]> {
    return apiService.getExpenseAttachments(expenseId);
  }

  static async getStoreNames(employeeId?: number, searchTerm?: string): Promise<StoreNameDto[]> {
    return apiService.getStoreNames(employeeId, searchTerm);
  }

  static async getStoresFiltered(params: {
    storeName?: string;
    ownerName?: string;
    city?: string;
    state?: string;
    clientType?: string;
    page?: number;
    size?: number;
    sortBy?: string;
    sortOrder?: string;
  }): Promise<StoreDto[]> {
    return apiService.getStoresFiltered(params);
  }

  static async getStoresFilteredPaginated(params: {
    storeName?: string;
    ownerName?: string;
    city?: string;
    state?: string;
    clientType?: string;
    employeeName?: string;
    primaryContact?: string;
    page?: number;
    size?: number;
    sortBy?: string;
    sortOrder?: string;
    sort?: string;
  }): Promise<StoreResponse> {
    return apiService.getStoresFilteredPaginated(params);
  }

  static async searchStores(params: StoreSearchParams): Promise<StoreResponse> {
    return apiService.searchStores(params);
  }

  static async getStoresByEmployee(employeeId: number, params: {
    sortBy?: string;
    sortOrder?: string;
  }): Promise<StoreResponse> {
    return apiService.getStoresByEmployee(employeeId, params);
  }

  static async deleteStore(storeId: number): Promise<void> {
    return apiService.deleteStore(storeId);
  }

  static async exportStores(): Promise<string> {
    return apiService.exportStores();
  }

  // Employee-related static methods
  static async getAllEmployees(): Promise<EmployeeUserDto[]> {
    return apiService.getAllEmployees();
  }

  static async getEmployeeDirectory(params: EmployeeDirectoryParams = {}): Promise<EmployeeUserDto[]> {
    return apiService.getEmployeeDirectory(params);
  }

  static async getFieldOfficers(city?: string): Promise<EmployeeUserDto[]> {
    return apiService.getEmployeeDirectory({ status: 'active', role: 'Field Officer', city });
  }

  static async getEmployeeById(id: number): Promise<EmployeeUserDto> {
    return apiService.getEmployeeById(id);
  }

  static async getTeamByEmployee(employeeId: number): Promise<TeamDataDto[]> {
    return apiService.getTeamByEmployee(employeeId);
  }

  static async getTeamById(teamId: number): Promise<TeamDataDto> {
    return apiService.getTeamById(teamId);
  }

  static async getCities(): Promise<string[]> {
    return apiService.getCities();
  }

  static async getAllInactiveEmployees(): Promise<EmployeeUserDto[]> {
    return apiService.getAllInactiveEmployees();
  }

  static async createEmployee(employeeData: Record<string, unknown>): Promise<unknown> {
    return apiService.createEmployee(employeeData);
  }

  static async updateEmployee(empId: number, employeeData: Record<string, unknown>): Promise<unknown> {
    return apiService.updateEmployee(empId, employeeData);
  }

  static async deleteEmployee(id: number): Promise<unknown> {
    return apiService.deleteEmployee(id);
  }

  static async resetPassword(username: string, password: string): Promise<unknown> {
    return apiService.resetPassword(username, password);
  }

  static async editUsername(id: number, username: string): Promise<unknown> {
    return apiService.editUsername(id, username);
  }

  static async assignEmployeeCity(employeeId: number, city: string): Promise<unknown> {
    return apiService.assignEmployeeCity(employeeId, city);
  }

  static async removeEmployeeCity(employeeId: number, city: string): Promise<unknown> {
    return apiService.removeEmployeeCity(employeeId, city);
  }

  static async getArchivedEmployees(): Promise<EmployeeUserDto[]> {
    return apiService.getAllInactiveEmployees();
  }

  static async setEmployeeActive(id: number): Promise<unknown> {
    return apiService.setEmployeeActive(id);
  }

  static async getEmployeeStatsByDateRange(employeeId: number, startDate: string, endDate: string): Promise<EmployeeStatsWithVisits> {
    return apiService.getEmployeeStatsByDateRange(employeeId, startDate, endDate);
  }

  static async getEmployeeStatsWithVisits(employeeId: number, startDate: string, endDate: string): Promise<EmployeeStatsWithVisits> {
    return apiService.getEmployeeStatsWithVisits(employeeId, startDate, endDate);
  }

  static async getEmployeeStatsOptimized(employeeId: number, startDate: string, endDate: string, page: number = 0, size: number = 20, sort: string = 'id,desc'): Promise<EmployeeStatsOptimizedResponse> {
    return apiService.getEmployeeStatsOptimized(employeeId, startDate, endDate, page, size, sort);
  }

  static async getVisitDetail(id: number): Promise<VisitDetailResponse> {
    return apiService.getVisitDetail(id);
  }

  static async getNewCustomerTrends(startDate: string, endDate: string, employeeIds?: number[], limit = 5): Promise<NewCustomerTrendsResponse> {
    return apiService.getNewCustomerTrends(startDate, endDate, employeeIds, limit);
  }

  static async getStoreMonthlyTrends(storeId: number, startDate: string, endDate: string): Promise<StoreMonthlyTrend[]> {
    return apiService.getStoreMonthlyTrends(storeId, startDate, endDate);
  }

  static async createSalaryRefreshJob(startDate: string, endDate: string): Promise<SalaryCalculationJob> {
    return apiService.createSalaryRefreshJob(startDate, endDate);
  }

  static async getActiveSalaryJob(): Promise<SalaryCalculationJob | null> {
    return apiService.getActiveSalaryJob();
  }

  static async getSalaryJob(id: string): Promise<SalaryCalculationJob> {
    return apiService.getSalaryJob(id);
  }

  static async cancelSalaryJob(id: string): Promise<SalaryCalculationJob> {
    return apiService.cancelSalaryJob(id);
  }

  static async retrySalaryJob(id: string): Promise<SalaryCalculationJob> {
    return apiService.retrySalaryJob(id);
  }

  static async getEmployeeDashboardSummary(employeeId: number, startDate: string, endDate: string): Promise<EmployeeDashboardSummary> {
    return apiService.getEmployeeDashboardSummary(employeeId, startDate, endDate);
  }

  static async getEmployeeLiveLocation(employeeId: number): Promise<LiveLocationDto> {
    return apiService.getEmployeeLiveLocation(employeeId);
  }

  static async getAllEmployeeLocations(): Promise<LiveLocationDto[]> {
    return apiService.getAllEmployeeLocations();
  }

  static async createAttendanceLog(employeeId: number): Promise<unknown> {
    return apiService.createAttendanceLog(employeeId);
  }

  static async getCurrentUser(): Promise<CurrentUserDto> {
    return apiService.getCurrentUser();
  }

  static async getStoresForTeam(teamId: number, page: number = 0, size: number = 10): Promise<StoreResponse> {
    return apiService.getStoresForTeam(teamId, page, size);
  }

  static async getStoresByDobDateRange(startDate: string, endDate: string): Promise<StoreDto[]> {
    return apiService.getStoresByDobDateRange(startDate, endDate);
  }

  private async loadToken(): Promise<void> {
    if (typeof window !== 'undefined') {
      // Client-side: get from localStorage
      this.token = localStorage.getItem('authToken');
    } else {
      // Server-side: get from cookies - use dynamic import
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { cookies } = require('next/headers');
        const cookieStore = await cookies();
        this.token = cookieStore.get('authToken')?.value || null;
      } catch (error) {
        // If cookies() fails, token will remain null
        this.token = null;
      }
    }
  }

  private async getHeaders(): Promise<HeadersInit> {
    // Always refresh token before building headers to avoid stale auth
    await this.loadToken();
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    return headers;
  }

  private async makeRequest<T>(endpoint: string, options: RequestInit = {}, retryCount = 0): Promise<T> {
    const isAbsoluteEndpoint = /^https?:\/\//i.test(endpoint);
    const url = isAbsoluteEndpoint ? endpoint : `${this.baseUrl}${endpoint}`;
    const headers = await this.getHeaders();
    const config: RequestInit = {
      ...options,
      headers: {
        ...headers,
        ...options.headers,
      },
    };

    console.log('🌐 Making API request:', {
      url,
      method: config.method || 'GET',
      hasToken: !!this.token
    });

    try {
      const response = await fetch(url, config);
      const contentType = response.headers.get('content-type') || '';

      if (!response.ok) {
        // Try to extract error details from body (JSON or text)
        let bodySnippet = '';
        let errorDetails: ApiErrorBody = null;
        try {
          if (contentType.includes('application/json')) {
            const errJson = await response.json() as ApiErrorBody;
            errorDetails = errJson;
            bodySnippet = typeof errJson === 'string' ? errJson : JSON.stringify(errJson);
          } else {
            bodySnippet = await response.text();
            errorDetails = bodySnippet;
          }
        } catch {
          // ignore body parsing errors
        }
        const preview = bodySnippet ? ` Body: ${bodySnippet.slice(0, 200)}` : '';
        throw new APIRequestError(
          `API request failed: ${response.status} ${response.statusText}.${preview}`,
          response.status,
          errorDetails,
        );
      }

      // No content
      if (response.status === 204) {
        return undefined as unknown as T;
      }

      // Ensure we only parse JSON when it is JSON
      if (!contentType || !contentType.toLowerCase().includes('application/json')) {
        const text = await response.text();
        
        // For certain endpoints that might return HTML or other formats when no data exists,
        // return empty array instead of throwing error
        const visitEndpoints = [
          '/monthly-sale/getByVisit',
          '/intent-audit/getByVisit', 
          '/task/getByVisit',
          '/notes/getByVisit'
        ];
        
        // For endpoints that return success message as text
        const successTextEndpoints = [
          '/employee-user/create',
          '/attendance-log/createAttendanceLog',
          '/employee/edit'
        ];
        
        if (visitEndpoints.some(visitEndpoint => endpoint.includes(visitEndpoint)) && response.ok) {
          console.warn(`Non-JSON response from ${endpoint}, returning empty array. Response: ${text.slice(0, 200)}`);
          return [] as unknown as T;
        }
        
        if (successTextEndpoints.some(successEndpoint => endpoint.includes(successEndpoint)) && response.ok) {
          console.log(`Success response from ${endpoint}: ${text}`);
          return { success: true, message: text } as unknown as T;
        }
        
        const preview = text.slice(0, 200);
        throw new Error(
          `Expected JSON but received '${contentType || 'unknown'}' from ${url}. Body starts with: ${preview}`
        );
      }

      return await response.json();
    } catch (error) {
      console.error(`🚨 API request failed for ${endpoint}:`, error);
      console.error('🌐 Request details:', {
        url,
        method: config.method || 'GET',
        hasToken: !!this.token,
      });
      
      // If it's a network error, provide more helpful error message
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        console.error('🌐 Network Error Details:', {
          url,
          baseUrl: this.baseUrl,
          error: error.message,
          retryCount,
          possibleCauses: [
            'CORS policy blocking the request',
            'API server is down or unreachable',
            'Network connectivity issues',
            'Invalid URL or endpoint',
            'Authentication token expired or invalid'
          ]
        });

        // Retry logic for network errors (max 2 retries)
        if (retryCount < 2) {
          console.log(`🔄 Retrying request (attempt ${retryCount + 1}/2)...`);
          await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1))); // Exponential backoff
          return this.makeRequest<T>(endpoint, options, retryCount + 1);
        }

        throw new Error(`Network error: Unable to connect to API server at ${this.baseUrl}. This could be due to:
- API server is down or unreachable
- Network connectivity issues
- CORS policy blocking the request
- Authentication token expired

Please check your internet connection and try again.`);
      }
      
      throw error;
    }
  }

  private async getCompactPage<T>(endpoint: string): Promise<CompactPage<T>> {
    return normalizePage(await this.makeRequest<CompactPage<T>>(endpoint));
  }

  private async collectCompactPages<T>(
    endpoint: string,
    params: Record<string, unknown>,
    maxPageSize: number,
  ): Promise<T[]> {
    const size = Math.min(Number(params.size) || maxPageSize, maxPageSize);
    const first = await this.getCompactPage<T>(
      `${endpoint}?${buildQuery({ ...params, page: 0, size })}`,
    );
    const rows = [...first.content];

    for (let page = 1; page < first.totalPages; page += 1) {
      const response = await this.getCompactPage<T>(
        `${endpoint}?${buildQuery({ ...params, page, size })}`,
      );
      rows.push(...response.content);
      if (response.last) break;
    }

    return rows;
  }

  private async makeTextRequest(endpoint: string, options: RequestInit = {}, retryCount = 0): Promise<string> {
    const isAbsoluteEndpoint = /^https?:\/\//i.test(endpoint);
    const url = isAbsoluteEndpoint ? endpoint : `${this.baseUrl}${endpoint}`;
    const headers = await this.getHeaders();
    const config: RequestInit = {
      ...options,
      headers: {
        ...headers,
        ...options.headers,
      },
    };

    console.log('🌐 Making text API request:', {
      url,
      method: config.method || 'GET',
      hasToken: !!this.token,
    });

    try {
      const response = await fetch(url, config);
      const text = await response.text();

      if (!response.ok) {
        const preview = text ? ` Body: ${text.slice(0, 200)}` : '';
        throw new Error(`API request failed: ${response.status} ${response.statusText}.${preview}`);
      }

      return text;
    } catch (error) {
      console.error(`🚨 Text API request failed for ${endpoint}:`, error);
      console.error('🌐 Request details:', {
        url,
        method: config.method || 'GET',
        hasToken: !!this.token,
      });

      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        if (retryCount < 2) {
          console.log(`🔄 Retrying text request (attempt ${retryCount + 1}/2)...`);
          await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
          return this.makeTextRequest(endpoint, options, retryCount + 1);
        }

        throw new Error(`Network error: Unable to connect to API server at ${this.baseUrl}. This could be due to:
- API server is down or unreachable
- Network connectivity issues
- CORS policy blocking the request
- Authentication token expired

Please check your internet connection and try again.`);
      }

      throw error;
    }
  }

  // Employee APIs



  async updateEmployeeLiveLocation(id: number, latitude: number, longitude: number): Promise<string> {
    return this.makeRequest<string>(`/employee/updateLiveLocation?id=${id}&latitude=${latitude}&longitude=${longitude}`, {
      method: 'PUT',
    });
  }

  // Visit APIs
  async getAllVisits(): Promise<VisitDto[]> {
    return this.collectCompactPages<VisitDto>('/v2/visits', { sortBy: 'id', sortOrder: 'desc' }, 100);
  }

  async getVisitsByEmployee(employeeId: number): Promise<VisitDto[]> {
    return this.collectCompactPages<VisitDto>('/v2/visits', { employeeId, sortBy: 'id', sortOrder: 'desc' }, 100);
  }

  async getVisitsByDateRange(startDate: string, endDate: string): Promise<VisitDto[]> {
    return this.collectCompactPages<VisitDto>(
      '/v2/visits',
      { startDate, endDate, dateType: 'scheduled', sortBy: 'id', sortOrder: 'desc' },
      100,
    );
  }

  async getVisitsByEmployeeAndDateRange(employeeId: number, startDate: string, endDate: string): Promise<VisitDto[]> {
    return this.collectCompactPages<VisitDto>(
      '/v2/visits',
      { employeeId, startDate, endDate, dateType: 'scheduled', sortBy: 'id', sortOrder: 'desc' },
      100,
    );
  }

  async getEmployeeStatsByDateRange(employeeId: number, startDate: string, endDate: string): Promise<EmployeeStatsWithVisits> {
    return this.makeRequest<EmployeeStatsWithVisits>(
      `/v2/visits/employee-stats?${buildQuery({ employeeId, startDate, endDate, page: 0, size: 100 })}`,
    );
  }

  async getEmployeeStatsWithVisits(employeeId: number, startDate: string, endDate: string): Promise<EmployeeStatsWithVisits> {
    return this.getEmployeeStatsByDateRange(employeeId, startDate, endDate);
  }

  async getEmployeeStatsOptimized(employeeId: number, startDate: string, endDate: string, page: number = 0, size: number = 20, sort: string = 'id,desc'): Promise<EmployeeStatsOptimizedResponse> {
    const result = await this.makeRequest<EmployeeStatsWithVisits>(
      `/v2/visits/employee-stats?${buildQuery({ employeeId, startDate, endDate, page, size })}`,
    );
    const content = result.visitDto || [];
    const completedVisits = content.filter((visit) => visit.checkinTime && visit.checkoutTime);
    const purposeEntries = Object.entries(result.visitsByPurpose || {});
    const purposeCounts = purposeEntries.length > 0
      ? purposeEntries.map(([purpose, count]) => ({ purpose, count }))
      : Array.from(
          completedVisits.reduce((counts, visit) => {
            const purpose = (visit.purpose || 'Unknown').trim() || 'Unknown';
            counts.set(purpose, (counts.get(purpose) || 0) + 1);
            return counts;
          }, new Map<string, number>()),
          ([purpose, count]) => ({ purpose, count }),
        );
    const totalElements = Number(result.totalElements ?? content.length);
    const totalPages = Number(result.totalPages ?? Math.ceil(totalElements / Math.max(size, 1)));
    return {
        statsDto: result.statsDto,
        summary: {
          completedVisits: Number(result.statsDto.completedVisitCount ?? completedVisits.length),
          visitsByPurpose: purposeCounts,
        },
        visitPage: {
          content,
          pageable: {
            pageNumber: page,
            pageSize: size,
            sort: { empty: false, sorted: true, unsorted: false },
            offset: Math.max(page, 0) * size,
            paged: true,
            unpaged: false,
          },
          totalPages,
          totalElements,
          last: totalPages === 0 || page >= totalPages - 1,
          size,
          number: page,
          sort: { empty: false, sorted: true, unsorted: false },
          numberOfElements: content.length,
          first: page === 0,
          empty: content.length === 0,
        },
    };
  }

  async getVisitsByDateSorted(startDate: string, endDate: string, page: number = 0, size: number = 10, sort: string = 'visitDate,desc', storeName?: string, employeeName?: string): Promise<VisitResponse> {
    const [sortBy = 'visitDate', sortOrder = 'desc'] = sort.split(',');
    return this.getCompactPage<VisitDto>(`/v2/visits?${buildQuery({
      startDate,
      endDate,
      dateType: 'scheduled',
      page,
      size: Math.min(size, 100),
      sortBy,
      sortOrder,
      storeName: storeName?.trim(),
      employeeName: employeeName?.trim(),
    })}`);
  }

  async getVisitsByDateSortedOld(startDate: string, endDate: string, page: number = 0, size: number = 10, sort: string = 'id,desc', employeeName?: string): Promise<VisitResponse> {
    return this.getVisitsByDateSorted(startDate, endDate, page, size, sort, undefined, employeeName);
  }

  async getVisitsForTeam(teamId: number, startDate: string, endDate: string, page: number = 0, size: number = 10, sort: string = 'visitDate,desc', purpose?: string, priority?: string, storeName?: string, employeeName?: string): Promise<VisitResponse> {
    const [sortBy = 'visitDate', sortOrder = 'desc'] = sort.split(',');
    return this.getCompactPage<VisitDto>(`/v2/visits?${buildQuery({
      teamId,
      startDate,
      endDate,
      dateType: 'scheduled',
      page,
      size: Math.min(size, 100),
      sortBy,
      sortOrder,
      purpose: purpose?.trim(),
      priority: priority?.trim(),
      storeName: storeName?.trim(),
      employeeName: employeeName?.trim(),
    })}`);
  }

  async getVisitsForTeams(teamIds: number[], startDate: string, endDate: string, page: number = 0, size: number = 10, sort: string = 'visitDate,desc', purpose?: string, priority?: string, outcome?: string, storeName?: string, employeeName?: string): Promise<VisitResponse> {
    if (teamIds.length === 0) {
      return normalizePage({ content: [], page, size, totalElements: 0, totalPages: 0, first: page === 0, last: true });
    }
    if (teamIds.length === 1) {
      return this.getVisitsForTeam(teamIds[0], startDate, endDate, page, size, sort, purpose, priority, storeName, employeeName);
    }

    const [sortBy = 'visitDate', sortOrder = 'desc'] = sort.split(',');
    const requestedWindow = (page + 1) * size;
    const responses = await Promise.all(teamIds.map(async (teamId) => {
      const requestPage = (teamPage: number) => this.getCompactPage<VisitDto>(`/v2/visits?${buildQuery({
          teamId,
          startDate,
          endDate,
          dateType: 'scheduled',
          page: teamPage,
          size: 100,
          sortBy,
          sortOrder,
          purpose: purpose?.trim(),
          priority: priority?.trim(),
          outcome: outcome?.trim(),
          storeName: storeName?.trim(),
          employeeName: employeeName?.trim(),
        })}`);
      const first = await requestPage(0);
      const pagesNeeded = Math.min(first.totalPages, Math.ceil(requestedWindow / 100));
      const content = [...first.content];
      for (let teamPage = 1; teamPage < pagesNeeded; teamPage += 1) {
        content.push(...(await requestPage(teamPage)).content);
      }
      return { ...first, content };
    }));
    const unique = Array.from(new Map(responses.flatMap((response) => response.content).map((visit) => [visit.id, visit])).values());
    const direction = sortOrder.toLowerCase() === 'asc' ? 1 : -1;
    unique.sort((left, right) => {
      const leftValue = String(left[sortBy as keyof VisitDto] ?? left.id);
      const rightValue = String(right[sortBy as keyof VisitDto] ?? right.id);
      return leftValue.localeCompare(rightValue, undefined, { numeric: true }) * direction;
    });
    const totalElements = responses.reduce((total, response) => total + response.totalElements, 0);
    const totalPages = Math.ceil(totalElements / Math.max(size, 1));
    return normalizePage({
      content: unique.slice(page * size, (page + 1) * size),
      page,
      size,
      totalElements,
      totalPages,
      first: page === 0,
      last: totalPages === 0 || page >= totalPages - 1,
    });
  }

  // Visit detail APIs
  async getVisitById(id: number): Promise<VisitDto> {
    return this.makeRequest<VisitDto>(`/visit/getById?id=${id}`);
  }

  async getVisitDetail(id: number): Promise<VisitDetailResponse> {
    return this.makeRequest<VisitDetailResponse>(`/v2/visits/${id}/detail`);
  }

  async checkoutVisit(id: number, payload: VisitCheckoutPayload): Promise<string> {
    return this.makeTextRequest(`/visit/checkout?id=${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  async getVisitProCons(visitId: number): Promise<BrandProCon[]> {
    return this.makeRequest<BrandProCon[]>(`/visit/getProCons?visitId=${visitId}`);
  }

  async addBrandProCons(visitId: number, brandData: {
    brandName: string;
    pros: string[];
    cons: string[];
  }[]): Promise<void> {
    return this.makeRequest<void>(`/visit/addProCons?visitId=${visitId}`, {
      method: 'PUT',
      body: JSON.stringify(brandData),
    });
  }

  async deleteBrandProCons(visitId: number, brandData: {
    brandName: string;
  }[]): Promise<void> {
    return this.makeRequest<void>(`/visit/deleteProCons?visitId=${visitId}`, {
      method: 'POST',
      body: JSON.stringify(brandData),
    });
  }

  async getIntentAuditByVisit(id: number): Promise<IntentAuditLog[]> {
    return this.makeRequest<IntentAuditLog[]>(`/intent-audit/getByVisit?id=${id}`);
  }

  async getMonthlySaleByVisit(visitId: number): Promise<MonthlySaleChange[]> {
    return this.makeRequest<MonthlySaleChange[]>(`/monthly-sale/getByVisit?visitId=${visitId}`);
  }

  async getTasksByVisit(type: string, visitId: number): Promise<Task[]> {
    return this.collectCompactPages<Task>('/v2/tasks', {
      visitId,
      taskType: type,
      sortBy: 'updatedAt',
      sortOrder: 'desc',
    }, 100);
  }

  async getVisitsByStore(id: number): Promise<VisitDto[]> {
    return (await this.getCompactPage<VisitDto>(`/v2/visits?${buildQuery({
      storeId: id,
      page: 0,
      size: 100,
      sortBy: 'visitDate',
      sortOrder: 'desc',
    })}`)).content;
  }

  // Notes by store
  async getNotesByStore(storeId: number): Promise<Note[]> {
    return this.collectCompactPages<Note>('/v2/notes', { storeId, sortBy: 'updatedDate', sortOrder: 'desc' }, 100);
  }

  async getNotesByVisit(id: number): Promise<Note[]> {
    return this.collectCompactPages<Note>('/v2/notes', { visitId: id, sortBy: 'updatedDate', sortOrder: 'desc' }, 100);
  }

  async createNote(noteData: {
    content: string;
    employeeId: number;
    storeId: number;
    visitId: number;
  }): Promise<number> {
    return this.makeRequest<number>('/notes/create', {
      method: 'POST',
      body: JSON.stringify(noteData),
    });
  }

  async getAllNotes(): Promise<Note[]> {
    return this.collectCompactPages<Note>('/v2/notes', { sortBy: 'updatedDate', sortOrder: 'desc' }, 100);
  }

  async searchTasks(params: TaskSearchParams): Promise<CompactPage<Task>> {
    return this.getCompactPage<Task>(`/v2/tasks?${buildQuery({
      ...params,
      page: params.page ?? 0,
      size: Math.min(params.size ?? 20, 100),
      sortBy: params.sortBy ?? 'updatedAt',
      sortOrder: params.sortOrder ?? 'desc',
    })}`);
  }

  async getTasks(params: TaskSearchParams): Promise<Task[]> {
    return this.collectCompactPages<Task>('/v2/tasks', {
      ...params,
      sortBy: params.sortBy ?? 'updatedAt',
      sortOrder: params.sortOrder ?? 'desc',
    }, 100);
  }

  async searchNotes(params: NoteSearchParams): Promise<CompactPage<Note>> {
    return this.getCompactPage<Note>(`/v2/notes?${buildQuery({
      ...params,
      page: params.page ?? 0,
      size: Math.min(params.size ?? 20, 100),
      sortBy: params.sortBy ?? 'updatedDate',
      sortOrder: params.sortOrder ?? 'desc',
    })}`);
  }

  async updateNote(id: number, noteData: {
    content: string;
    employeeId: number;
    storeId: number;
  }): Promise<void> {
    return this.makeRequest<void>(`/notes/edit?id=${id}`, {
      method: 'PUT',
      body: JSON.stringify(noteData),
    });
  }

  async deleteNote(id: number): Promise<void> {
    return this.makeRequest<void>(`/notes/delete?id=${id}`, {
      method: 'DELETE',
    });
  }

  // Attendance APIs
  async getAttendanceForRange(startDate: string, endDate: string): Promise<AttendanceLogItem[]> {
    return this.makeRequest<AttendanceLogItem[]>(`/attendance-log/getForRange1?start=${startDate}&end=${endDate}`);
  }

  async getAttendanceStatsForRange(startDate: string, endDate: string): Promise<AttendanceStats[]> {
    return this.makeRequest<AttendanceStats[]>(`/attendance-log/getForRange?start=${startDate}&end=${endDate}`);
  }

  async getAttendanceForEmployeeAndRange(employeeId: number, startDate: string, endDate: string): Promise<AttendanceStats[]> {
    return this.makeRequest<AttendanceStats[]>(`/attendance-log/getForEmployeeAndRange?employeeId=${employeeId}&start=${startDate}&end=${endDate}`);
  }

  async recalculateDistanceForEmployeesWithOlaMaps(employeeIds: number[], startDate: string, endDate: string): Promise<string> {
    const employeeIdsParam = employeeIds.join(',');
    return this.makeTextRequest(
      `${DISTANCE_RECALCULATION_API_URL}?employeeIds=${employeeIdsParam}&startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`,
      {
        method: 'PUT',
      }
    );
  }

  async getDailyBreakdown(employeeId: number, startDate: string, endDate: string): Promise<DailyBreakdownDto[]> {
    return this.makeRequest<DailyBreakdownDto[]>(
      `/salary-calculation/daily-breakdown?employeeId=${employeeId}&startDate=${startDate}&endDate=${endDate}`
    );
  }

  // Report APIs
  async getReportCounts(startDate: string, endDate: string): Promise<ReportCountsItem[]> {
    return this.makeRequest<ReportCountsItem[]>(`/report/getCounts?startDate=${startDate}&endDate=${endDate}`);
  }

  async getNewCustomerTrends(startDate: string, endDate: string, employeeIds?: number[], limit = 5): Promise<NewCustomerTrendsResponse> {
    return this.makeRequest<NewCustomerTrendsResponse>(`/v2/reports/new-customers/trends?${buildQuery({
      startDate,
      endDate,
      employeeIds: employeeIds?.length ? employeeIds.join(',') : undefined,
      limit,
    })}`);
  }

  async getStoreMonthlyTrends(storeId: number, startDate: string, endDate: string): Promise<StoreMonthlyTrend[]> {
    return this.makeRequest<StoreMonthlyTrend[]>(`/v2/reports/store-monthly-trends?${buildQuery({
      storeId,
      startDate,
      endDate,
    })}`);
  }

  async createSalaryRefreshJob(startDate: string, endDate: string): Promise<SalaryCalculationJob> {
    return this.makeRequest<SalaryCalculationJob>('/v2/salary-calculation/jobs', {
      method: 'POST',
      body: JSON.stringify({
        type: 'REFRESH_DATE_RANGE',
        startDate,
        endDate,
        includeSundays: false,
      }),
    });
  }

  async getActiveSalaryJob(): Promise<SalaryCalculationJob | null> {
    return (await this.makeRequest<SalaryCalculationJob | undefined>('/v2/salary-calculation/jobs/active')) ?? null;
  }

  async getSalaryJob(id: string): Promise<SalaryCalculationJob> {
    return this.makeRequest<SalaryCalculationJob>(`/v2/salary-calculation/jobs/${encodeURIComponent(id)}`);
  }

  async cancelSalaryJob(id: string): Promise<SalaryCalculationJob> {
    return this.makeRequest<SalaryCalculationJob>(`/v2/salary-calculation/jobs/${encodeURIComponent(id)}/cancel`, {
      method: 'POST',
    });
  }

  async retrySalaryJob(id: string): Promise<SalaryCalculationJob> {
    return this.makeRequest<SalaryCalculationJob>(`/v2/salary-calculation/jobs/${encodeURIComponent(id)}/retry`, {
      method: 'POST',
    });
  }

  // Expense APIs
  async getExpensesByDateRange(startDate: string, endDate: string): Promise<ExpenseDto[]> {
    return this.collectCompactPages<ExpenseDto>('/v2/expenses', {
      start: startDate,
      end: endDate,
      sortBy: 'expenseDate',
      sortOrder: 'desc',
    }, 100);
  }

  async searchExpenses(params: ExpenseSearchParams): Promise<CompactPage<ExpenseDto>> {
    return this.getCompactPage<ExpenseDto>(`/v2/expenses?${buildQuery({
      ...params,
      page: params.page ?? 0,
      size: Math.min(params.size ?? 20, 100),
      sortBy: params.sortBy ?? 'expenseDate',
      sortOrder: params.sortOrder ?? 'desc',
    })}`);
  }

  async getExpenseAttachments(expenseId: number): Promise<AttachmentMetadata[]> {
    return this.makeRequest<AttachmentMetadata[]>(`/v2/expenses/${expenseId}/attachments`);
  }

  // Store APIs
  async searchStores(params: StoreSearchParams): Promise<StoreResponse> {
    const primaryContact = params.primaryContact?.replace(/\D/g, '');
    return this.getCompactPage<StoreDto>(`/v2/store/search?${buildQuery({
      ...params,
      primaryContact,
      page: params.page ?? 0,
      size: Math.min(params.size ?? 20, 100),
      sortBy: params.sortBy ?? 'storeName',
      sortOrder: params.sortOrder ?? 'asc',
    })}`);
  }

  async getStoresFiltered(params: {
    storeName?: string;
    ownerName?: string;
    city?: string;
    state?: string;
    clientType?: string;
    page?: number;
    size?: number;
    sortBy?: string;
    sortOrder?: string;
  }): Promise<StoreDto[]> {
    const queryParams = new URLSearchParams();
    
    if (params.storeName) queryParams.append('storeName', params.storeName);
    if (params.ownerName) queryParams.append('ownerName', params.ownerName);
    if (params.city && params.city !== 'all') queryParams.append('city', params.city);
    if (params.state && params.state !== 'all') queryParams.append('state', params.state);
    if (params.clientType && params.clientType !== 'all') queryParams.append('clientType', params.clientType);
    if (params.page !== undefined) queryParams.append('page', params.page.toString());
    if (params.size !== undefined) queryParams.append('size', params.size.toString());
    
    // Always sort alphabetically by store name by default
    const sortBy = params.sortBy || 'storeName';
    const sortOrder = params.sortOrder || 'asc';
    queryParams.append('sortBy', sortBy);
    queryParams.append('sortOrder', sortOrder);

    const response = await this.getCompactPage<StoreDto>(`/v2/store/search?${queryParams.toString()}`);
    return response.content;
  }

  async getStoresFilteredPaginated(params: {
    storeName?: string;
    ownerName?: string;
    city?: string;
    state?: string;
    clientType?: string;
    employeeName?: string;
    primaryContact?: string;
    page?: number;
    size?: number;
    sortBy?: string;
    sortOrder?: string;
    sort?: string;
  }): Promise<StoreResponse> {
    return this.searchStores({
      ...params,
      sortOrder: params.sortOrder === 'desc' ? 'desc' : 'asc',
    });
  }

  // Get a single store by ID
  async getStoreById(id: number): Promise<StoreDto> {
    return this.makeRequest<StoreDto>(`/v2/store/${id}/detail`);
  }

  // Update store by ID
  async updateStore(id: number, payload: Partial<StoreDto>): Promise<StoreDto> {
    return this.makeRequest<StoreDto>(`/store/edit?id=${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  async getStoresByEmployee(employeeId: number, params: {
    sortBy?: string;
    sortOrder?: string;
  }): Promise<StoreResponse> {
    const queryParams = new URLSearchParams();
    queryParams.append('employeeId', employeeId.toString());
    
    // Always sort alphabetically by store name by default
    const sortBy = params.sortBy || 'storeName';
    const sortOrder = params.sortOrder || 'asc';
    queryParams.append('sortBy', sortBy);
    queryParams.append('sortOrder', sortOrder);

    return this.getCompactPage<StoreDto>(`/v2/store/search?${queryParams.toString()}`);
  }

  async deleteStore(storeId: number): Promise<void> {
    return this.makeRequest<void>(`/store/deleteById?id=${storeId}`, {
      method: 'DELETE',
    });
  }

  async exportStores(): Promise<string> {
    const headers = await this.getHeaders();
    const response = await fetch(`${this.baseUrl}/v2/store/export`, {
      headers,
    });
    
    if (!response.ok) {
      throw new Error(`Export failed: ${response.status} ${response.statusText}`);
    }
    
    return response.text();
  }

  // Dashboard specific APIs
  async getDashboardData(startDate: string, endDate: string) {
    const [employees, visits, reportCounts] = await Promise.all([
      this.getAllEmployees(),
      this.getVisitsByDateRange(startDate, endDate),
      this.getReportCounts(startDate, endDate)
    ]);

    return {
      employees,
      visits,
      reportCounts
    };
  }

  async getEmployeeDashboardData(employeeId: number, startDate: string, endDate: string) {
    const [employee, visits, attendanceStats] = await Promise.all([
      this.getEmployeeById(employeeId),
      this.getVisitsByEmployeeAndDateRange(employeeId, startDate, endDate),
      this.getAttendanceForEmployeeAndRange(employeeId, startDate, endDate)
    ]);

    return {
      employee,
      visits,
      attendanceStats
    };
  }

  async getAllEmployeeLocations(): Promise<LiveLocationDto[]> {
    // Use the bulk API endpoint instead of individual calls
    return this.makeRequest<LiveLocationDto[]>('/employee/getAllLiveLocations');
  }

  async getEmployeeLiveLocation(employeeId: number): Promise<LiveLocationDto> {
    return this.makeRequest<LiveLocationDto>(`/employee/getLiveLocation?id=${employeeId}`);
  }

  // Tasks by store and date range (complaints/requirements)
  async getTasksByStoreAndDate(params: { storeId: number; start: string; end: string }): Promise<TaskDto[]> {
    const { storeId, start, end } = params;
    return this.collectCompactPages<TaskDto>('/v2/tasks', {
      storeId,
      start,
      end,
      sortBy: 'updatedAt',
      sortOrder: 'desc',
    }, 100);
  }

  // Sites by store
  async getSitesByStore(storeId: number): Promise<Array<{ id: number; siteName: string; storeId: number }>> {
    return this.makeRequest<Array<{ id: number; siteName: string; storeId: number }>>(`/site/getByStore?id=${storeId}`);
  }

  // Utility methods
  formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  formatDateRange(startDate: Date, endDate: Date): { start: string; end: string } {
    return {
      start: this.formatDate(startDate),
      end: this.formatDate(endDate)
    };
  }

  // Employee-related methods
  async getAllEmployees(): Promise<EmployeeUserDto[]> {
    return this.getEmployeeDirectory({ status: 'active' });
  }

  async getEmployeeDirectory(params: EmployeeDirectoryParams = {}): Promise<EmployeeUserDto[]> {
    return this.collectCompactPages<EmployeeUserDto>('/v2/employees', {
      ...params,
      status: params.status ?? 'active',
      sortBy: params.sortBy ?? 'firstName',
      sortOrder: params.sortOrder ?? 'asc',
    }, 500);
  }

  async getEmployeeById(id: number): Promise<EmployeeUserDto> {
    return this.makeRequest<EmployeeUserDto>(`/employee/getById?id=${id}`);
  }

  async getTeamByEmployee(employeeId: number): Promise<TeamDataDto[]> {
    return this.makeRequest<TeamDataDto[]>(`/employee/team/getbyEmployee?id=${employeeId}`);
  }

  async getTeamById(teamId: number): Promise<TeamDataDto> {
    return this.makeRequest<TeamDataDto>(`/employee/team/getById?id=${teamId}`);
  }

  async getCities(): Promise<string[]> {
    return this.makeRequest<string[]>('/v2/employees/cities');
  }

  async assignEmployeeCity(employeeId: number, city: string): Promise<unknown> {
    return this.makeRequest<unknown>(
      `/employee/assignCity?id=${employeeId}&city=${encodeURIComponent(city)}`,
      { method: 'PUT' }
    );
  }

  async removeEmployeeCity(employeeId: number, city: string): Promise<unknown> {
    return this.makeRequest<unknown>(
      `/employee/removeAssignedCity?employeeId=${employeeId}&city=${encodeURIComponent(city)}`,
      { method: 'DELETE' }
    );
  }

  async getAllInactiveEmployees(): Promise<EmployeeUserDto[]> {
    return this.getEmployeeDirectory({ status: 'inactive' });
  }

  async createEmployee(employeeData: Record<string, unknown>): Promise<unknown> {
    return this.makeRequest<unknown>('/employee-user/create', {
      method: 'POST',
      body: JSON.stringify(employeeData),
    });
  }

  async updateEmployee(empId: number, employeeData: Record<string, unknown>): Promise<unknown> {
    return this.makeRequest<unknown>(`/employee/edit?empId=${empId}`, {
      method: 'PUT',
      body: JSON.stringify(employeeData),
    });
  }

  async deleteEmployee(id: number): Promise<unknown> {
    return this.makeRequest<unknown>(`/employee/delete?id=${id}`, {
      method: 'PUT',
    });
  }

  async resetPassword(username: string, password: string): Promise<unknown> {
    return this.makeRequest<unknown>('/user/manage/update', {
      method: 'PUT',
      body: JSON.stringify({ username, password }),
    });
  }

  async editUsername(id: number, username: string): Promise<unknown> {
    return this.makeRequest<unknown>(`/employee/editUsername?id=${id}&username=${username}`, {
      method: 'PUT',
    });
  }

  async setEmployeeActive(id: number): Promise<unknown> {
    return this.makeRequest<unknown>(`/employee/setActive?id=${id}`, {
      method: 'PUT',
    });
  }

  async createAttendanceLog(employeeId: number): Promise<unknown> {
    return this.makeRequest<unknown>(`/attendance-log/createAttendanceLog?employeeId=${employeeId}`, {
      method: 'POST',
    });
  }

  async getCurrentUser(): Promise<CurrentUserDto> {
    return this.makeRequest<CurrentUserDto>(`${SECONDARY_API_BASE_URL}/user/manage/current-user`);
  }

  async getDashboardSummary(startDate: string, endDate: string): Promise<DashboardSummary> {
    const query = new URLSearchParams({ startDate, endDate });
    return this.makeRequest<DashboardSummary>(`/dashboard/summary?${query}`);
  }

  async getEmployeeJourney(employeeId: number, startDate: string, endDate: string): Promise<EmployeeJourneyPoint[]> {
    const query = new URLSearchParams({ employeeId: String(employeeId), startDate, endDate });
    try {
      return await this.makeRequest<EmployeeJourneyPoint[]>(`/visit/employee-journey?${query}`);
    } catch (optimizedEndpointError) {
      console.warn('Optimized employee journey endpoint unavailable; using the existing visit endpoint.', optimizedEndpointError);
      const result = await this.getEmployeeStatsByDateRange(employeeId, startDate, endDate);
      return (result.visitDto || []).map((visit) => ({
        id: visit.id,
        employeeId: visit.employeeId,
        employeeName: visit.employeeName,
        storeName: visit.storeName,
        lat: visit.checkinLatitude ?? visit.visitLatitude ?? visit.storeLatitude ?? 0,
        lng: visit.checkinLongitude ?? visit.visitLongitude ?? visit.storeLongitude ?? 0,
        coordinateSource: visit.checkinLatitude != null && visit.checkinLongitude != null
          ? 'check-in'
          : visit.visitLatitude != null && visit.visitLongitude != null
            ? 'visit'
            : 'store',
        visitDate: visit.visit_date,
        checkinDate: visit.checkinDate,
        checkinTime: visit.checkinTime,
        checkoutDate: visit.checkoutDate,
        checkoutTime: visit.checkoutTime,
        purpose: visit.purpose,
        city: visit.city,
        state: visit.state,
        country: visit.country,
      }));
    }
  }

  async getEmployeeDashboardSummary(employeeId: number, startDate: string, endDate: string): Promise<EmployeeDashboardSummary> {
    const result = await this.makeRequest<EmployeeStatsWithVisits>(
      `/v2/visits/employee-stats?${buildQuery({ employeeId, startDate, endDate, page: 0, size: 1 })}`,
    );
    const purposeCounts = Object.entries(result.visitsByPurpose || {}).map(([purpose, count]) => ({ purpose, count }));
    const completedVisitCount = Number(result.statsDto.completedVisitCount ?? result.statsDto.visitCount ?? 0);
    const totalVisitCount = Number(result.statsDto.totalVisitCount ?? result.totalElements ?? result.visitDto?.length ?? 0);
    return {
        employeeId,
        employeeName: result.visitDto?.[0]?.employeeName || '',
        startDate,
        endDate,
        statsDto: {
          ...result.statsDto,
          completedVisitCount,
          totalVisitCount,
        },
        visitSummary: {
          completedVisits: completedVisitCount,
          visitsByPurpose: purposeCounts,
        },
        expenseSummary: {
          expenseCount: 0,
          totalAmount: 0,
          approvedCount: 0,
          approvedAmount: 0,
          pendingCount: 0,
          pendingAmount: 0,
          rejectedCount: 0,
          rejectedAmount: 0,
        },
        brandSummary: {
          pricingEntryCount: 0,
          distinctBrandCount: 0,
        },
    };
  }

  async getStoresForTeam(teamId: number, page: number = 0, size: number = 10): Promise<StoreResponse> {
    return this.getCompactPage<StoreDto>(`/v2/store/search?${buildQuery({
      teamId,
      page,
      size: Math.min(size, 100),
      sortBy: 'storeName',
      sortOrder: 'asc',
    })}`);
  }

  async getStoresByDobDateRange(startDate: string, endDate: string): Promise<StoreDto[]> {
    return this.collectCompactPages<StoreDto>('/v2/store/dob-search', {
      startDate,
      endDate,
      sortBy: 'storeName',
      sortOrder: 'asc',
    }, 100);
  }

  async getStoreNames(employeeId?: number, searchTerm?: string): Promise<StoreNameDto[]> {
    return this.collectCompactPages<StoreNameDto>('/v2/store/names', {
      employeeId,
      searchTerm: searchTerm?.trim(),
      sortBy: 'storeName',
      sortOrder: 'asc',
    }, 100);
  }
}

// Export singleton instance
export const apiService = new API();
