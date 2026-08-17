export interface DailyTaDaEditRequest {
  employeeId: number;
  date: string;
  kilometres: number;
  currentKilometres: number;
  dearnessAllowance: number;
  currentDearnessAllowance: number;
  token: string;
}

export async function requestDailyTaDaEdit(
  request: DailyTaDaEditRequest,
): Promise<void> {
  const date = request.date.slice(0, 10);
  const headers = {
    Authorization: `Bearer ${request.token}`,
    "Content-Type": "application/json",
  };
  const kilometreDelta = request.kilometres - request.currentKilometres;
  const kilometresChanged = Math.abs(kilometreDelta) > 0.0001;
  const daChanged = Math.abs(request.dearnessAllowance - request.currentDearnessAllowance) > 0.0001;

  const parseError = async (response: Response, fallback: string) => {
    const raw = (await response.text()).trim();
    if (!raw) return fallback;

    try {
      const parsed = JSON.parse(raw) as { error?: string; message?: string };
      return parsed.error || parsed.message || fallback;
    } catch {
      return raw;
    }
  };

  if (kilometresChanged) {
    const response = await fetch(
      "https://api.gajkesaristeels.in/travel-allowance/apply-km-adjustment",
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          employeeIds: [request.employeeId],
          adjustments: [
            {
              date,
              adjustmentKm: kilometreDelta,
            },
          ],
        }),
      },
    );

    if (!response.ok) {
      throw new Error(await parseError(response, `Failed to update kilometres (${response.status}).`));
    }
  }

  if (daChanged) {
    const response = await fetch(
      "https://api.gajkesaristeels.in/travel-allowance/apply-ta-da-adjustment",
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          employeeIds: [request.employeeId],
          adjustments: [
            {
              date,
              dearnessAllowance: request.dearnessAllowance,
            },
          ],
        }),
      },
    );

    if (!response.ok) {
      throw new Error(await parseError(response, `Failed to update DA (${response.status}).`));
    }
  }
}
