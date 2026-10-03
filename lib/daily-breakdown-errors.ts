export const getApiErrorMessage = (payload: unknown): string => {
  if (typeof payload === "string") return payload.trim();

  if (Array.isArray(payload)) {
    return payload.map(getApiErrorMessage).filter(Boolean).join(" ");
  }

  if (payload && typeof payload === "object") {
    const errorPayload = payload as Record<string, unknown>;
    return getApiErrorMessage(errorPayload.message) || getApiErrorMessage(errorPayload.error);
  }

  return "";
};

export const readApiErrorMessage = async (response: Response): Promise<string> => {
  const responseText = await response.text().catch(() => "");
  if (!responseText.trim()) return "";

  try {
    return getApiErrorMessage(JSON.parse(responseText));
  } catch {
    return responseText.trim();
  }
};

export const isIncompletePayrollSetupError = (status: number, message: string) => (
  status === 400 && /unable to refresh daily travel calculation/i.test(message)
);
