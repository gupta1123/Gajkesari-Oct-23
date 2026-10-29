export interface OngoingStoreVisit {
  visitId: number;
  storeId: number;
  storeName: string | null;
  employeeName: string | null;
  employeeId: number | null;
  checkinDate: string | null;
  checkinTime: string | null;
  visitDate: string | null;
}

export interface StoreReassignmentSelection {
  sourceEmployeeId: number;
  targetEmployeeId: number;
  sourceEmployeeName: string;
  targetEmployeeName: string;
  storeIds: number[];
  storeNames: Record<number, string>;
}

const REVIEW_ERROR = 'The ongoing visits could not be checked. Please try again before reassigning the stores.';

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function positiveId(value: unknown) {
  if (typeof value !== 'number' && typeof value !== 'string') return null;
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function text(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

/** Accept the app's VisitDto list and store-grouped visit lists. Unknown data must
 * never be interpreted as "no ongoing visits" during a reassignment. */
export function normalizeStoreOngoingVisits(
  response: unknown,
  selectedStoreIds: number[],
): OngoingStoreVisit[] {
  const selected = new Set(selectedStoreIds);
  const visits = new Map<number, OngoingStoreVisit>();

  function parseList(value: unknown, group?: Record<string, unknown>) {
    if (Array.isArray(value)) {
      for (const item of value) parseItem(item, group);
      return;
    }

    const wrapper = record(value);
    if (!wrapper) throw new Error(REVIEW_ERROR);

    // Never confirm from a partial page of a review response.
    if (wrapper.last === false || (typeof wrapper.totalPages === 'number' && wrapper.totalPages > 1)) {
      throw new Error(REVIEW_ERROR);
    }

    for (const key of ['ongoingVisits', 'visits', 'content', 'data', 'stores']) {
      if (key in wrapper) {
        parseList(wrapper[key], wrapper.storeId !== undefined ? wrapper : group);
        return;
      }
    }

    // Some bulk responses group visits under their store ID.
    const entries = Object.entries(wrapper);
    if (entries.length > 0 && entries.every(([key, items]) => positiveId(key) !== null && Array.isArray(items))) {
      entries.forEach(([key, items]) => parseList(items, { storeId: Number(key) }));
      return;
    }

    throw new Error(REVIEW_ERROR);
  }

  function parseItem(value: unknown, group?: Record<string, unknown>) {
    const item = record(value);
    if (!item) throw new Error(REVIEW_ERROR);
    if ('ongoingVisits' in item || 'visits' in item) {
      parseList(item, group);
      return;
    }

    const store = record(item.store);
    const employee = record(item.employee);
    const storeId = positiveId(item.storeId ?? item.storeid ?? store?.id ?? group?.storeId)
      ?? (selectedStoreIds.length === 1 ? selectedStoreIds[0] : null);
    const visitId = positiveId(item.visitId ?? item.id);
    if (!storeId || !visitId || !selected.has(storeId)) throw new Error(REVIEW_ERROR);

    const visit: OngoingStoreVisit = {
      visitId,
      storeId,
      storeName: text(item.storeName ?? store?.storeName ?? group?.storeName),
      employeeName: text(item.employeeName ?? item.fieldOfficerName)
        ?? text([employee?.firstName, employee?.lastName].filter(Boolean).join(' ')),
      employeeId: positiveId(item.employeeId ?? employee?.id),
      checkinDate: text(item.checkinDate ?? item.checkInDate ?? item.checkInDateTime),
      checkinTime: text(item.checkinTime ?? item.checkInTime),
      visitDate: text(item.visit_date ?? item.visitDate),
    };
    const existing = visits.get(visitId);
    if (existing && existing.storeId !== storeId) throw new Error(REVIEW_ERROR);
    visits.set(visitId, visit);
  }

  parseList(response);
  return [...visits.values()].sort((left, right) =>
    (left.storeName || '').localeCompare(right.storeName || '') || left.storeId - right.storeId || left.visitId - right.visitId,
  );
}

export function haveOngoingVisitsChanged(previous: OngoingStoreVisit[], latest: OngoingStoreVisit[]) {
  const identity = (visit: OngoingStoreVisit) => `${visit.storeId}:${visit.visitId}`;
  const previousIds = new Set(previous.map(identity));
  return previousIds.size !== latest.length || latest.some((visit) => !previousIds.has(identity(visit)));
}

/** Recheck immediately before the final mutation. A changed visit list requires
 * another confirmation, and a failed review must never proceed to the PUT. */
export async function reassignStoresAfterReview(
  selection: StoreReassignmentSelection,
  reviewedVisits: OngoingStoreVisit[],
  actions: {
    getOngoingVisits: () => Promise<OngoingStoreVisit[]>;
    reassign: (payload: { sourceEmployeeId: number; targetEmployeeId: number; storeIds: number[] }) => Promise<unknown>;
  },
): Promise<{ status: 'review-changed'; visits: OngoingStoreVisit[] } | { status: 'reassigned' }> {
  const latest = await actions.getOngoingVisits();
  if (haveOngoingVisitsChanged(reviewedVisits, latest)) {
    return { status: 'review-changed', visits: latest };
  }

  await actions.reassign({
    sourceEmployeeId: selection.sourceEmployeeId,
    targetEmployeeId: selection.targetEmployeeId,
    storeIds: [...selection.storeIds],
  });
  return { status: 'reassigned' };
}
