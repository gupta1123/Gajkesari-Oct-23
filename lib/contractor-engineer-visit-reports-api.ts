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

async function requestReportList(path: string) {
  const result = await requestJson<
    | ContractorEngineerVisitReport[]
    | { content?: ContractorEngineerVisitReport[]; data?: ContractorEngineerVisitReport[] }
  >(path);

  if (Array.isArray(result)) return result;
  return result.content || result.data || [];
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
  getAll: () =>
    requestReportList("/contractor-engineer-visit-report/getAll"),

  getById: (id: number) =>
    requestJson<ContractorEngineerVisitReport>(
      `/contractor-engineer-visit-report/getById?id=${encodeURIComponent(String(id))}`,
    ),

  getByDateRange: (start: string, end: string) => {
    const query = new URLSearchParams({ start, end });
    return requestReportList(
      `/contractor-engineer-visit-report/getByDateRange?${query.toString()}`,
    );
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
