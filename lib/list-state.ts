// List pages persist their filters in sessionStorage so they survive a trip to a
// detail page and back. They must not survive navigating to a different top-level
// page, so landing on one list/root page clears the saved state of every other.

const EMPLOYEE_DETAIL_KEYS = ['dashboard.employeeDetail.state.v1', 'employee.visit.last'];

// Top-level pages that own persisted state, keyed by pathname.
const ROOT_STATE_KEYS: Record<string, string[]> = {
  '/dashboard': ['dashboard.dateFilter.v1', 'dashboard.view.state.v1', ...EMPLOYEE_DETAIL_KEYS],
  '/dashboard/customers': ['customers.list.state.v1'],
  '/dashboard/complaints': ['complaints.filters.v1'],
  '/dashboard/requirements': ['requirements.filters.v1'],
  '/dashboard/employees': ['employees.list.state.v1', 'employees.last.view', ...EMPLOYEE_DETAIL_KEYS],
  '/dashboard/attendance': ['attendance.page.state.v1'],
  '/dashboard/visits': ['visits.table.state.v2'],
};

// Top-level pages with no persisted state of their own; they still count as leaving.
const STATELESS_ROOTS = [
  '/dashboard/enquiries',
  '/dashboard/meetings',
  '/dashboard/expenses',
  '/dashboard/approvals',
  '/dashboard/pricing',
  '/dashboard/reports',
  '/dashboard/live-locations',
];

// Written by a list page right before opening a customer, read by the detail page's Back button.
const GLOBAL_KEYS = ['nav.return.to'];

const normalize = (pathname: string) =>
  pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;

const findRoot = (pathname: string): string | null => {
  const path = normalize(pathname);
  if (path in ROOT_STATE_KEYS || STATELESS_ROOTS.includes(path)) return path;
  if (path === '/dashboard/settings' || path.startsWith('/dashboard/settings/')) return '/dashboard/settings';
  return null;
};

/**
 * Call on every pathname change. Detail pages (customer, visit, employee, ...) are
 * not roots, so opening one keeps all saved state for the Back trip. Landing on a
 * root page drops the saved state of every other root.
 */
export function resetListStateOnNavigation(pathname: string): void {
  if (typeof window === 'undefined') return;
  const root = findRoot(pathname);
  if (!root) return;

  const keep = new Set(ROOT_STATE_KEYS[root] ?? []);
  const stale = new Set<string>(GLOBAL_KEYS);
  for (const keys of Object.values(ROOT_STATE_KEYS)) {
    keys.forEach((key) => {
      if (!keep.has(key)) stale.add(key);
    });
  }

  try {
    stale.forEach((key) => sessionStorage.removeItem(key));
  } catch {
    // sessionStorage can be unavailable (private mode); nothing to clear then.
  }
}
