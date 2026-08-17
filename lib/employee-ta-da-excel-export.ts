export interface EmployeeTaDaExcelExportRequest {
  startDate: string;
  endDate: string;
  includeSundays?: boolean;
  token: string;
}

export interface EmployeeTaDaExcelExportResponse {
  blob: Blob;
  fileName?: string;
}

export async function requestEmployeeTaDaExcelSummary(
  request: EmployeeTaDaExcelExportRequest,
): Promise<EmployeeTaDaExcelExportResponse> {
  const query = new URLSearchParams({
    startDate: request.startDate,
    endDate: request.endDate,
    includeSundays: String(request.includeSundays ?? false),
  });
  const response = await fetch(
    `https://api.gajkesaristeels.in/salary-calculation/manual-summary-range/export?${query.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${request.token}`,
      },
    },
  );

  if (!response.ok) {
    const message = (await response.text()).trim();
    throw new Error(message || `Failed to download Excel summary (${response.status}).`);
  }

  const disposition = response.headers.get("content-disposition") || "";
  const encodedFileName = disposition.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
  const quotedFileName = disposition.match(/filename="([^"]+)"/i)?.[1];
  const plainFileName = disposition.match(/filename=([^;]+)/i)?.[1]?.trim();
  const fileName = encodedFileName
    ? decodeURIComponent(encodedFileName)
    : quotedFileName || plainFileName;

  return {
    blob: await response.blob(),
    fileName,
  };
}

export function downloadEmployeeTaDaExcelFile(
  response: EmployeeTaDaExcelExportResponse,
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
