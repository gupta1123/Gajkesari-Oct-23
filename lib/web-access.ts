export const normalizeRoleValue = (value: string | null | undefined): string | null => {
  if (!value) return null;
  return value.trim().replace(/\s+/g, ' ').toUpperCase();
};

export const FIELD_OFFICER_WEB_ACCESS_ERROR =
  'Field Officer accounts cannot sign in to the web dashboard. Please use the mobile app.';

export const isFieldOfficerRoleValue = (value: string | null | undefined): boolean => {
  const normalized = normalizeRoleValue(value)
    ?.replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ');

  return normalized === 'FIELD OFFICER' || normalized === 'ROLE FIELD OFFICER';
};

interface WebAccessCurrentUser {
  authorities?: Array<{ authority: string }> | null;
}

export const isFieldOfficerWebUser = ({
  loginRole,
  userRole,
  currentUser,
  correctedRoleFlags,
}: {
  loginRole?: string | null;
  userRole?: string | null;
  currentUser?: WebAccessCurrentUser | null;
  correctedRoleFlags?: { isManager: boolean; isFieldOfficer: boolean } | null;
}): boolean => {
  if (correctedRoleFlags?.isFieldOfficer) return true;
  if (isFieldOfficerRoleValue(loginRole) || isFieldOfficerRoleValue(userRole)) return true;

  return (currentUser?.authorities ?? []).some((authority) =>
    isFieldOfficerRoleValue(authority.authority)
  );
};

const getJwtPayload = (token: string): Record<string, unknown> | null => {
  const parts = token.split('.');
  if (parts.length < 2 || typeof atob !== 'function') return null;

  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
    const payload = JSON.parse(atob(padded));
    return payload && typeof payload === 'object' ? payload : null;
  } catch {
    return null;
  }
};

const collectRoleValues = (value: unknown): string[] => {
  if (typeof value === 'string') {
    return value.split(/[,;]/).map((role) => role.trim()).filter(Boolean);
  }

  if (Array.isArray(value)) {
    return value.flatMap(collectRoleValues);
  }

  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return [record.authority, record.role, record.name].flatMap(collectRoleValues);
  }

  return [];
};

export const tokenHasFieldOfficerRole = (token: string | null | undefined): boolean => {
  if (!token) return false;
  const payload = getJwtPayload(token);
  if (!payload) return false;

  const roleValues = [
    payload.role,
    payload.roles,
    payload.authority,
    payload.authorities,
  ].flatMap(collectRoleValues);

  return roleValues.some(isFieldOfficerRoleValue);
};
