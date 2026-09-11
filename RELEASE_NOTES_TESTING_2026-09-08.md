# Gajkesari Web - Tester Release Notes

**Release date:** 8 September 2026

**Frontend branch:** `main`

**Release commit:** `22e009c` (`Migrate frontend to optimized v2 APIs`)

**Repositories:** `gupta1123/Gajkesari-Oct-23` and `nyx-solutions-team/gajkesari-web`
**Scope:** Consolidated Gajkesari web UI/UX improvements, workflow changes, attendance corrections, and optimized frontend API integrations currently available on `main`.

## 1. Release summary

This release aligns the Gajkesari dashboard and shared application shell with the German Steel reference, improves responsive behavior across operational pages, corrects Sunday attendance calculations, expands meeting and contractor-report workflows, and migrates supported read-heavy screens to the backend's optimized V2 endpoints.

The optimization work mainly changes how data is requested. Existing create, edit, delete, approval, upload, and download operations remain on their legacy endpoints wherever the backend handoff did not provide a V2 replacement.

## 2. UI and UX changes by page

### Shared sidebar and top navigation

- Standardized the top navigation across Dashboard, Settings, Customers, Enquiries, Complaints, Visits, Meetings, Requirements, Pricing, Employees, Attendance, Expenses, Approvals, and Reports.
- Matched the German Steel header height, title/subtitle hierarchy, spacing, border alignment, role badge, and theme control.
- Fixed the large inherited paragraph margin that previously pushed subtitles out of alignment.
- Improved desktop, tablet, mobile, expanded-sidebar, and collapsed-sidebar behavior.
- Replaced the sidebar text treatment with the full Gajkesari logo asset while preserving its aspect ratio.
- Retained Gajkesari-specific navigation items, labels, roles, and business data.

### Dashboard

- Matched KPI card sizing, spacing, typography, borders, and alignment with German Steel.
- Moved the `Sales and employee activity overview` subtitle slightly upward to match the reference header.
- Restyled State-wise Employee Distribution cards to match the reference layout and made the complete card keyboard/click accessible.
- Improved state drill-down and employee detail layouts.
- Employee detail now uses a compact four-KPI row with a recent-visits table and visits-by-purpose chart.
- Rebuilt the Employee Locations section as a two-column map and independently scrollable employee panel.
- Added compact employee rows with initials, role, assigned city, last-location age, GPS status, and visit count.
- Search, assigned-city, and location-status filters now affect both the map and employee list.
- Added grouped markers for overlapping coordinates and retained individual access to grouped employees.
- Added selected-employee home and numbered visit markers.
- Added `View all`, `Reset view`, manual refresh, map/list mobile switching, and responsive action wrapping.
- Default map view opens at street-level detail around the newest visible employee location; `View all` fits all filtered India locations.
- Applied the same dark OpenStreetMap treatment used in German Steel while keeping road, city, state, and place labels readable.
- Invalid or outlier coordinates no longer force the default map to a world-level view.

### Customers

- Improved server-driven filtering, sorting, pagination, and manager/team result handling.
- Added protection against stale responses when filters change quickly.
- Corrected regional-manager and administrator customer filtering behavior.
- Customer detail continues to support visits, notes, complaints, requirements, and store information.
- Removed the failing `source.boringavatars.com` dependency. Customer mobile cards now use local initials, eliminating certificate errors and unnecessary external requests.

### Employees and Teams

- Refined employee list cards/table behavior, filters, paging, role handling, and state persistence.
- Improved employee detail layouts and visit pagination.
- Added regional-manager access handling and reusable role/team scope helpers.
- Added support for multiple team managers.
- Editing a team now preserves existing managers correctly.
- Improved city selection and field-officer assignment in Add Team and Teams screens.
- Team member and manager pickers exclude unavailable assignments while preserving current team members during editing.

### Attendance

- Corrected the absence calculation so Sundays/weekly paid offs are not counted as absences.
- The correction applies when Sunday is returned as `Absent` and when the Sunday row is missing.
- Genuine weekday absences remain counted.
- Full-day or half-day work explicitly recorded on Sunday remains credited.
- Future dates are not converted into attendance or absence records.
- Sunday cells retain the paid-leave visual treatment.
- The legend now displays `Paid Leave` only.

### Settings

- Aligned Settings header/navigation with the shared German Steel layout.
- Improved Salary Summary, Allowances, Working Days, Teams, Daily Breakdown, and Distance tab spacing and responsive behavior.
- Fixed Salary Summary filters and export actions overflowing beyond the page width.
- Improved date-range validation and error messages.
- Employee Summary CSV currency values are exported as numeric values rather than formatted currency strings.
- Added TA adjustment controls and employee TA/DA Excel export.
- Added Daily Breakdown editing and distance-recalculation workflow support.

### Visits

- Refined list layout, filters, table/card responsiveness, state restoration, paging, and detail navigation.
- Consolidated the visit-detail data load while preserving existing visit actions.
- Added/retained visit checkout, notes, tasks, brand pros/cons, intent history, monthly sales, attachments, and store history.
- Added dedicated visit-task presentation and contractor/engineer report access where applicable.

### Meetings

- Added the Meetings section to desktop and mobile navigation.
- Added meeting list, search/filtering, pagination, status presentation, dashboard totals, and report export.
- Added status-aware meeting detail actions covering request, approval, execution, attendees, gifts, expenses, corrections, final report, and closure flows.
- Improved action visibility so users see controls appropriate to the current meeting status.
- Improved meeting list budget, attendee, and completion summaries.

### Expenses and TA/DA

- Improved employee expense cards and expense detail presentation.
- Expense photos and attachment metadata now load only when the details dialog is opened.
- Prevented an attachment from the previously opened expense from briefly appearing on the next expense.
- Added employee TA/DA Excel export and daily TA/DA editing support.

### Complaints and Requirements

- Refined filters, responsive table/card layouts, employee/store selectors, paging, status actions, and detail navigation.
- Preserved create, edit, delete, status-update, attachment, and download workflows.
- Regional-manager data is restricted to accessible teams.

### Reports

- Improved employee/officer selectors, dropdown positioning, filter persistence, validation, and responsive layouts.
- New Customers Report now uses backend-ranked top/bottom performers.
- Sales Performance Report now loads the selected store's complete monthly trend in one request.
- Added/moved Contractor & Engineer Visit Reports under Reports.
- Added contractor/engineer report form, submitted-report list, filters, server pagination, detail route, and export/PDF support.
- Fixed report-detail navigation so Back returns to the correct Reports tab and filter state.
- Monthly Target remains hidden from the visible report tabs.

### Enquiries, Pricing, and Approvals

- Applied the shared navigation, spacing, responsive card/table, and filter conventions.
- Enquiries now use compact server pagination.
- Regional-manager access restrictions remain applied to relevant data.
- Existing upload, pricing mutation, and approval actions remain functionally unchanged unless stated elsewhere.

## 3. API-call changes by page

| Page or feature | Optimized/read API now used | Important behavior |
|---|---|---|
| Dashboard employee data | `GET /v2/employees` | Active employee directory is paged and collected from the compact response. |
| Dashboard/employee visit statistics | `GET /v2/visits/employee-stats` | Uses exact backend totals and database-derived `visitsByPurpose`; chart totals no longer depend on the visible visit page. |
| Customers list | `GET /v2/store/search` | Sends store, owner, phone, city, state, client type, employee, team, sorting, page, and size filters to the backend. |
| Customer birthday view | `GET /v2/store/dob-search` | Reads compact paginated results and supports bounded date ranges. |
| Customer detail | `GET /v2/store/{storeId}/detail` | Loads the full authorized store object only after opening a customer. |
| Store selectors | `GET /v2/store/names` | Uses lightweight `{id, storeName}` records and follows all returned pages. |
| Customer export | `GET /v2/store/export` | Uses the streaming CSV endpoint. |
| Customer visits, tasks, and notes | `GET /v2/visits`, `GET /v2/tasks`, `GET /v2/notes` | Uses compact records and bounded/paginated history calls. |
| Employee list and selectors | `GET /v2/employees` | Supports active/inactive status, exact role, city, and office-manager filters. |
| Employee city selectors | `GET /v2/employees/cities` | Replaces the legacy employee-city master read. |
| Employee detail visits | `GET /v2/visits/employee-stats` | Returns stats plus only the selected visit page and exact server pagination metadata. |
| Employee detail expenses | `GET /v2/expenses` | Uses employee/date filters and compact expense rows. |
| Attendance employee/day visit lookup | `GET /v2/employees`, `GET /v2/visits` | Employee master and visit list reads use the optimized versions. Existing attendance-log calculations remain on their compatible routes. |
| Visit list/history | `GET /v2/visits` | Supports employee, team, store, date, purpose, priority, outcome, name, sorting, and pagination filters. |
| Visit detail | `GET /v2/visits/{visitId}/detail` | One response supplies visit, store, attachment metadata, brand data, intent history, monthly sales, tasks, notes, site count, and latest intent. |
| Complaints and Requirements | `GET /v2/tasks` | Task type and access scope are sent to the backend; attachments are not downloaded in list views. |
| Notes history | `GET /v2/notes` | Compact paginated history; files remain lazy/on-demand. |
| Expense history | `GET /v2/expenses` | Compact paginated history with server employee/date/status filters. |
| Expense attachments | `GET /v2/expenses/{expenseId}/attachments` | Metadata is fetched only when an expense is opened; file bytes still use the authenticated download route. |
| Enquiries | `GET /v2/enquiries` | Uses store/taluka/city/state/month filters and compact server pagination. |
| New Customers Report and `/Report2` | `GET /v2/reports/new-customers/trends` | Replaces one request per month with one range request and uses server-calculated rankings. |
| Sales Performance Report | `GET /v2/reports/store-monthly-trends` | Replaces one request per month with one range request. |
| Field Officer Report | `GET /v2/visits/field-officer-stats` | Uses aggregate completed/total visits, attendance, customer-type counts, and purpose counts. |
| Customer-type drill-down report | `GET /v2/visits/customer-visit-details` | Returns the selected officer/date/customer-type detail rows directly. |
| Meeting lists/reports | `GET /v2/meetings` | Compact server-filtered and paginated meeting rows. |
| Meeting dashboard | `GET /v2/meetings/dashboard/summary` | Aggregate totals are calculated by the backend. |
| Meeting CSV | `GET /v2/meetings/report/export` | Uses the streaming report export. |
| Meeting attendee selectors | `GET /v2/meetings/attendees` | Requests up to 500 rows per page and combines additional pages for existing selectors. |
| Salary Summary refresh | `POST /v2/salary-calculation/jobs`, `GET /active`, `GET /{id}`, `POST /{id}/cancel`, `POST /{id}/retry` | Long-running salary refresh is now a persistent background job with progress, restore, cancellation, conflict handling, and retry. The existing manual-summary endpoint is called after completion to load the unchanged table. |
| Contractor/Engineer reports | `GET /v2/contractor-engineer-visit-reports` | Sends date, category, area, page, and size to the backend and uses server totals. |

## 4. Calls intentionally kept unchanged

The following operations remain on existing endpoints because the backend handoff either states they are already optimized internally or does not provide a V2 replacement:

- Store, employee, team, task, note, expense, visit, and meeting create/edit/delete mutations.
- Visit check-in/checkout and brand pros/cons mutations.
- File upload and authenticated file download endpoints.
- Meeting detail, audit, configuration, and workflow-action endpoints.
- Team master and live-location routes, which are optimized internally without a contract change.
- Attendance-log reads/updates and `GET /report/getCounts`, whose backend implementations were optimized without changing their URLs.
- Contractor/engineer create, detail, edit, delete, and export operations.

## 5. Priority tester checklist

### Roles and access

- Test at least one Administrator, Regional Manager/Manager, and Field Officer account.
- Confirm each role sees only its permitted employees, teams, customers, visits, tasks, expenses, and reports.
- Confirm empty-team and no-assigned-city states do not expose unrestricted data.

### Dashboard and map

- Verify KPI cards and State-wise Employee Distribution alignment in light and dark themes.
- Open a state, open an employee, open a visit, and use Back at each level.
- Test map search, assigned-city filter, GPS-status filter, employee selection, marker clusters, home marker, numbered visits, `View all`, `Reset view`, zoom controls, and manual refresh.
- Verify the right employee panel scrolls without scrolling the whole page.
- Verify desktop and mobile Map/Employees switching.

### Customers

- Test each filter independently and in combination.
- Change filters quickly and confirm old results do not overwrite the latest result.
- Verify pagination and sorting totals.
- Test Administrator and Regional Manager team scope.
- Open a customer and validate visits, notes, requirements, complaints, and store details.
- Confirm customer initials display without requests to `source.boringavatars.com`.
- Export customer CSV.

### Employees, Teams, and Settings

- Test active/inactive employee lists, employee detail, edit navigation, paging, and role filters.
- Add/edit a team with one and multiple managers.
- Confirm existing managers remain selected while editing.
- Add/remove cities and field officers and verify already-assigned officers are handled correctly.
- Test Salary Summary for a full calendar month, background-job progress, page refresh during a job, cancellation, retry, CSV, Excel, and TA adjustment.
- Test Allowances, Working Days, Daily Breakdown edits, and Distance recalculation.
- At narrower desktop widths, confirm Salary Summary Apply/Export buttons remain inside the page.

### Attendance

- Re-test August 2026 data where five Sundays were previously counted as absences.
- Confirm Sundays do not increase the absence total.
- Confirm a worked Sunday still counts as Full Day or Half Day.
- Confirm real weekday absences remain counted.
- Confirm the legend shows `Paid Leave`.

### Visits, tasks, notes, and expenses

- Verify visit list filters, page totals, employee/team scope, sorting, and detail navigation.
- On visit detail, verify store information, attachments, notes, requirements, complaints, brand information, intent, sales, and store history.
- Create/edit/delete representative notes and tasks and verify lists refresh correctly.
- Open multiple expenses consecutively and confirm attachment previews never carry over from the previously opened expense.
- Test expense approval/rejection and authenticated image download.

### Meetings

- Test meeting list search, date/status/type/location filters, paging, totals, and CSV export.
- Exercise the complete status path applicable to the test role: create/request, approve/reject/correction, execute, attendees, gifts, expenses, final report, final approval, and close/cancel.
- Verify list totals use compact `actualExpenseTotal` and `actualAttendeeCount` values.

### Reports

- Test Field Officer Report generation and every customer-type drill-down.
- Verify New Customers monthly values and top/bottom rankings for different employee selections and exclusions.
- Verify Sales Performance monthly results for multiple stores and date ranges.
- Verify report filters and selected tab survive detail navigation and Back.
- Test Contractor/Engineer form submission, date/category/area filters, pagination, detail navigation, and export/PDF behavior.

### Responsive and theme coverage

- Desktop: 1512px and 1280px widths.
- Tablet: approximately 900px width.
- Mobile: approximately 390px width.
- Test both light and dark themes and both expanded and collapsed sidebar states.
- Confirm there is no page-level horizontal overflow.

## 6. Known issue / tester observation

### Dashboard employee journey `403`

Selecting an employee on the dashboard currently attempts `GET /visit/employee-journey`. In the current backend environment this can return `403 Forbidden` for the logged-in role. The frontend catches it and falls back to `GET /v2/visits/employee-stats`, so employee visit markers can still render, but Next.js development mode reports the rejected first request in the console/error overlay.

This is a known issue and should be recorded separately from map rendering correctness. The planned frontend correction is to load the journey directly from the authorized V2 visit endpoint and remove the rejected legacy request.

### OpenStreetMap network entries

Chrome may show some tile requests in red with only provisional headers while Leaflet changes zoom or fits markers. These requests are normally cancelled because the old tiles are no longer needed. Treat this as a defect only if visible map areas remain blank or the map displays its tile-error message.

## 7. Verification completed before handoff

- Production build: passed.
- TypeScript check: passed.
- Git diff/whitespace validation: passed.
- Employee map tests: 10 passed.
- Attendance/Sunday regression tests: 7 passed.
- Total focused automated tests: 17 passed, 0 failed.
- Optimized endpoint audit: replaced legacy bulk-read routes are no longer present in the active migrated page code, except for the known dashboard journey request described above.
