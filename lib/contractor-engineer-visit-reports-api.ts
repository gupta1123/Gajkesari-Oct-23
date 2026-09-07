const API_BASE_URL = "https://api.gajkesaristeels.in";

export interface ContractorEngineerVisitReport {
  id: number;
  visitDate?: string | null;
  officerName?: string | null;
  region?: string | null;
  districtArea?: string | null;
  category?: string | null;
  customerName?: string | null;
  firmName?: string | null;
  mobileNo?: string | null;
  address?: string | null;
  projectName?: string | null;
  projectType?: string | null;
  projectStage?: string | null;
  approxRequirementMt?: number | null;
  monthlyConsumptionMt?: number | null;
  currentBrandUsed?: string | null;
  currentDealer?: string | null;
  nextPurchaseExpected?: string | null;
  purposeOfVisit?: string | null;
  materialBrochure?: boolean;
  materialVisitingCard?: boolean;
  materialRateList?: boolean;
  materialSample?: boolean;
  materialTestCertificate?: boolean;
  customerFeedbackDiscussion?: string | null;
  competitorBrand1?: string | null;
  competitorApproxRate1?: number | null;
  competitorRemarks1?: string | null;
  potential?: string | null;
  expectedQtyMt?: number | null;
  nextFollowUpDate?: string | null;
  followUpMode?: string | null;
  remarks?: string | null;
  customerSignature?: string | null;
  officerSignature?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface VisitReportExportResponse {
  blob: Blob;
  fileName?: string;
}

export interface ContractorEngineerVisitReportPage {
  content: ContractorEngineerVisitReport[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
}

export interface ContractorEngineerVisitReportFilters {
  start?: string;
  end?: string;
  category?: string;
  area?: string;
  page?: number;
  size?: number;
}

export type ContractorEngineerVisitReportPayload = {
  visitDate?: string | null;
  officerName?: string | null;
  region?: string | null;
  districtArea?: string | null;
  category?: string | null;
  customerName?: string | null;
  firmName?: string | null;
  mobileNo?: string | null;
  address?: string | null;
  projectName?: string | null;
  projectType?: string | null;
  projectStage?: string | null;
  approxRequirementMt?: number | null;
  monthlyConsumptionMt?: number | null;
  currentBrandUsed?: string | null;
  currentDealer?: string | null;
  nextPurchaseExpected?: string | null;
  purposeOfVisit?: string | null;
  materialBrochure?: boolean;
  materialVisitingCard?: boolean;
  materialRateList?: boolean;
  materialSample?: boolean;
  materialTestCertificate?: boolean;
  customerFeedbackDiscussion?: string | null;
  competitorBrand1?: string | null;
  competitorApproxRate1?: number | null;
  competitorRemarks1?: string | null;
  potential?: string | null;
  expectedQtyMt?: number | null;
  nextFollowUpDate?: string | null;
  followUpMode?: string | null;
  remarks?: string | null;
  customerSignature?: string | null;
  officerSignature?: string | null;
};

function getToken() {
  return typeof window === "undefined" ? null : localStorage.getItem("authToken");
}

function getHeaders() {
  const token = getToken();
  if (!token) throw new Error("Authentication token not found. Please log in again.");
  return { Authorization: `Bearer ${token}` };
}

async function getErrorMessage(response: Response, fallback: string) {
  const raw = (await response.text()).trim();
  if (!raw) return fallback;

  try {
    const parsed = JSON.parse(raw) as { error?: string; message?: string };
    return parsed.error || parsed.message || fallback;
  } catch {
    return raw;
  }
}

async function requestJson<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, { headers: getHeaders() });
  if (!response.ok) {
    throw new Error(await getErrorMessage(response, `Failed to load visit reports (${response.status}).`));
  }
  return response.json() as Promise<T>;
}

async function sendJson<T>(path: string, method: "POST" | "PUT", payload: unknown): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      ...getHeaders(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await getErrorMessage(response, `Failed to save visit report (${response.status}).`));
  }

  const raw = await response.text();
  if (!raw) return payload as T;

  try {
    return JSON.parse(raw) as T;
  } catch {
    return payload as T;
  }
}

async function requestReportPage(filters: ContractorEngineerVisitReportFilters = {}): Promise<ContractorEngineerVisitReportPage> {
  const query = new URLSearchParams();
  Object.entries({
    start: filters.start,
    end: filters.end,
    category: filters.category && filters.category !== 'all' ? filters.category : undefined,
    area: filters.area?.trim(),
    page: filters.page ?? 0,
    size: Math.min(filters.size ?? 20, 200),
  }).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') query.set(key, String(value));
  });
  return requestJson<ContractorEngineerVisitReportPage>(
    `/v2/contractor-engineer-visit-reports?${query.toString()}`,
  );
}

async function collectReportPages(filters: ContractorEngineerVisitReportFilters = {}) {
  const first = await requestReportPage({ ...filters, page: 0, size: 200 });
  const reports = [...(first.content || [])];
  for (let page = 1; page < first.totalPages; page += 1) {
    const next = await requestReportPage({ ...filters, page, size: 200 });
    reports.push(...(next.content || []));
    if (next.last) break;
  }
  return reports;
}

async function requestExport(path: string): Promise<VisitReportExportResponse> {
  const response = await fetch(`${API_BASE_URL}${path}`, { headers: getHeaders() });
  if (!response.ok) {
    throw new Error(await getErrorMessage(response, `Failed to download visit reports (${response.status}).`));
  }

  const disposition = response.headers.get("content-disposition") || "";
  const encodedFileName = disposition.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
  const quotedFileName = disposition.match(/filename="([^"]+)"/i)?.[1];
  const plainFileName = disposition.match(/filename=([^;]+)/i)?.[1]?.trim();

  return {
    blob: await response.blob(),
    fileName: encodedFileName
      ? decodeURIComponent(encodedFileName)
      : quotedFileName || plainFileName,
  };
}

export const contractorEngineerVisitReportsApi = {
  create: (payload: ContractorEngineerVisitReportPayload) =>
    sendJson<ContractorEngineerVisitReport>(
      "/contractor-engineer-visit-report/create",
      "POST",
      payload,
    ),

  getAll: () => collectReportPages(),

  getPage: requestReportPage,

  getById: (id: number) =>
    requestJson<ContractorEngineerVisitReport>(
      `/contractor-engineer-visit-report/getById?id=${encodeURIComponent(String(id))}`,
    ),

  getByDateRange: (start: string, end: string) => {
    return collectReportPages({ start, end });
  },

  exportByDateRange: (start: string, end: string) => {
    const query = new URLSearchParams({ start, end });
    return requestExport(`/contractor-engineer-visit-report/export?${query.toString()}`);
  },
};

export function downloadVisitReportExport(
  response: VisitReportExportResponse,
  fallbackFileName: string,
) {
  const url = URL.createObjectURL(response.blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = response.fileName || fallbackFileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
