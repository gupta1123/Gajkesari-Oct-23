import test from 'node:test';
import assert from 'node:assert/strict';
import { API } from '../lib/api.ts';

const params = { employeeId: 327, startDate: '2026-09-15', endDate: '2026-09-15', dateType: 'completed' };
const report = (id) => ({ employeeId: 327, teamId: 133, employeeName: 'Test Emp 1', employeeResolutionStatus: 'RESOLVED', report: { id, officerName: 'Test Emp 1' } });
const page = (content, totalPages, index = 0) => ({ content, page: index, size: 100, totalElements: content.length, totalPages, first: index === 0, last: index >= totalPages - 1 });

function mockFetch(t, responder) {
  const original = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, options) => {
    const parsed = new URL(url);
    calls.push({ url: parsed, options });
    return new Response(JSON.stringify(responder(parsed)), { status: 200, headers: { 'content-type': 'application/json' } });
  };
  t.after(() => { globalThis.fetch = original; });
  return calls;
}

test('reports-only attendance days follow report pagination even when visit totals are zero', async (t) => {
  const calls = mockFetch(t, (url) => {
    const index = Number(url.searchParams.get('page'));
    return { ...page([], 0, index), contractorEngineerReports: page([report(index + 1)], 3, index), totalRecords: 3 };
  });
  const result = await API.getVisitActivity(params);
  assert.deepEqual(result.visits, []);
  assert.deepEqual(result.reports.map((entry) => entry.report.id), [1, 2, 3]);
  assert.equal(calls.length, 3);
  for (const { url } of calls) {
    assert.equal(url.pathname, '/v2/visits');
    assert.equal(url.searchParams.get('employeeId'), '327');
    assert.equal(url.searchParams.get('dateType'), 'completed');
    assert.equal(url.searchParams.get('size'), '100');
  }
});

test('regular visits and reports are collected independently and keep colliding IDs separate', async (t) => {
  mockFetch(t, (url) => {
    const index = Number(url.searchParams.get('page'));
    return { ...page([{ id: index + 1 }], 3, index), contractorEngineerReports: page(index === 0 ? [report(1)] : [], 1, index) };
  });
  const result = await API.getVisitActivity(params);
  assert.deepEqual(result.visits.map((visit) => visit.id), [1, 2, 3]);
  assert.deepEqual(result.reports.map((entry) => entry.report.id), [1]);
});

test('report collection stops at report totals and preserves team and purpose filters', async (t) => {
  const calls = mockFetch(t, (url) => ({ ...page([], 8), contractorEngineerReports: page([report(49)], 1) }));
  const result = await API.getVisitReports({ ...params, teamId: 133, purpose: 'Follow-up' });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url.searchParams.get('teamId'), '133');
  assert.equal(calls[0].url.searchParams.get('purpose'), 'Follow-up');
  assert.equal(result[0].employeeResolutionStatus, 'RESOLVED');
});

test('legacy visits responses without a report section remain supported', async (t) => {
  mockFetch(t, () => page([{ id: 108939 }], 1));
  const result = await API.getVisitActivity(params);
  assert.deepEqual(result, { visits: [{ id: 108939 }], reports: [] });
});

test('visit page normalization retains both independent report metadata and combined totals', async (t) => {
  mockFetch(t, () => ({ ...page([], 0), contractorEngineerReports: page([report(49)], 1), totalRecords: 1 }));
  const result = await new API().getVisitsByDateSorted(params.startDate, params.endDate);
  assert.equal(result.totalElements, 0);
  assert.equal(result.totalRecords, 1);
  assert.equal(result.contractorEngineerReports.content[0].report.id, 49);
});

test('report officer picker loads the complete employee list using the requested endpoint', async (t) => {
  const employees = [{ id: 1, firstName: 'Test', lastName: 'Officer', role: 'Field Officer' }, { id: 2, firstName: 'Regional', lastName: 'Manager', role: 'Manager' }];
  const calls = mockFetch(t, () => employees);
  assert.deepEqual(await API.getReportOfficerEmployees(), employees);
  assert.equal(calls[0].url.pathname, '/employee/getAll');
});
