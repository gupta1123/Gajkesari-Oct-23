import test from 'node:test';
import assert from 'node:assert/strict';

import { API } from '../lib/api.ts';
import { normalizeStoreOngoingVisits, reassignStoresAfterReview } from '../lib/store-reassignment.ts';

test('ongoing visit checks use the authenticated single-store and bulk endpoints', async (t) => {
  const originalFetch = globalThis.fetch;
  const originalWindow = globalThis.window;
  const originalLocalStorage = globalThis.localStorage;
  const requests = [];
  Object.defineProperty(globalThis, 'window', { value: {}, configurable: true });
  Object.defineProperty(globalThis, 'localStorage', {
    value: { getItem: (key) => key === 'authToken' ? 'store-token' : null }, configurable: true,
  });
  globalThis.fetch = async (url, options) => {
    requests.push({ url: String(url), options });
    return new Response(JSON.stringify([{ id: 91, storeId: 357, storeName: 'Example Store', employeeName: 'Current Officer', checkinDate: '2026-10-29', checkinTime: '10:30:00' }]), {
      status: 200, headers: { 'content-type': 'application/json' },
    });
  };
  t.after(() => {
    globalThis.fetch = originalFetch;
    if (originalWindow === undefined) delete globalThis.window;
    else Object.defineProperty(globalThis, 'window', { value: originalWindow, configurable: true });
    if (originalLocalStorage === undefined) delete globalThis.localStorage;
    else Object.defineProperty(globalThis, 'localStorage', { value: originalLocalStorage, configurable: true });
  });

  const single = await API.getStoreOngoingVisits(357);
  const bulk = await API.getStoresOngoingVisits([357, 13818, 13819]);
  assert.equal(requests[0].url, 'https://api.gajkesaristeels.in/store/ongoing-visits?storeid=357');
  assert.equal(requests[0].options.method || 'GET', 'GET');
  assert.equal(requests[1].url, 'https://api.gajkesaristeels.in/store/ongoing-visits/bulk');
  assert.equal(requests[1].options.method, 'POST');
  assert.deepEqual(JSON.parse(requests[1].options.body), { storeIds: [357, 13818, 13819] });
  requests.forEach(({ options }) => assert.equal(options.headers.Authorization, 'Bearer store-token'));
  assert.equal(single[0].visitId, 91);
  assert.equal(bulk[0].checkinTime, '10:30:00');
});

test('ongoing visit review supports grouped stores and rejects unknown or incomplete responses', () => {
  assert.deepEqual(normalizeStoreOngoingVisits([], [357]), []);
  const grouped = normalizeStoreOngoingVisits([
    { storeId: 357, storeName: 'First Store', ongoingVisits: [{ id: 91, employeeName: 'Officer One' }] },
    { storeId: 13818, storeName: 'Second Store', ongoingVisits: [{ visitId: 92, employeeName: 'Officer Two' }] },
    { storeId: 13819, ongoingVisits: [] },
  ], [357, 13818, 13819]);
  assert.deepEqual(grouped.map((visit) => [visit.visitId, visit.storeId]), [[91, 357], [92, 13818]]);
  assert.equal(grouped[1].employeeName, 'Officer Two');
  assert.throws(() => normalizeStoreOngoingVisits({ message: 'Unknown response' }, [357]));
  assert.throws(() => normalizeStoreOngoingVisits({ content: [], last: false }, [357]));
  assert.throws(() => normalizeStoreOngoingVisits([{ id: 91, storeId: 999 }], [357]));
  assert.throws(() => normalizeStoreOngoingVisits([{ id: 91 }], [357, 13818]));
});

test('reassignment requires another review if the ongoing visits change', async () => {
  const selection = {
    sourceEmployeeId: 29, targetEmployeeId: 85, storeIds: [357, 13818],
    sourceEmployeeName: 'Current Officer', targetEmployeeName: 'New Officer', storeNames: {},
  };
  const latest = normalizeStoreOngoingVisits([{ id: 91, storeId: 357 }], selection.storeIds);
  const writes = [];
  const actions = { getOngoingVisits: async () => latest, reassign: async (payload) => writes.push(payload) };

  const firstAttempt = await reassignStoresAfterReview(selection, [], actions);
  assert.equal(firstAttempt.status, 'review-changed');
  assert.equal(writes.length, 0);
  const confirmation = await reassignStoresAfterReview(selection, latest, actions);
  assert.equal(confirmation.status, 'reassigned');
  assert.deepEqual(writes, [{ sourceEmployeeId: 29, targetEmployeeId: 85, storeIds: [357, 13818] }]);
});

test('a failed ongoing visit check never reassigns stores', async () => {
  let writes = 0;
  await assert.rejects(reassignStoresAfterReview({
    sourceEmployeeId: 29, targetEmployeeId: 85, storeIds: [357],
    sourceEmployeeName: 'Current Officer', targetEmployeeName: 'New Officer', storeNames: {},
  }, [], {
    getOngoingVisits: async () => { throw new Error('Visits could not be checked'); },
    reassign: async () => { writes += 1; },
  }), /Visits could not be checked/);
  assert.equal(writes, 0);
});

test('store search filters by the exact source employee id', async (t) => {
  const originalFetch = globalThis.fetch;
  const originalWindow = globalThis.window;
  const originalLocalStorage = globalThis.localStorage;
  const requests = [];

  Object.defineProperty(globalThis, 'window', { value: {}, configurable: true });
  Object.defineProperty(globalThis, 'localStorage', {
    value: { getItem: (key) => key === 'authToken' ? 'store-token' : null },
    configurable: true,
  });
  globalThis.fetch = async (url, options) => {
    requests.push({ url: String(url), options });
    return new Response(JSON.stringify({
      content: [],
      page: 0,
      size: 20,
      totalElements: 0,
      totalPages: 0,
      first: true,
      last: true,
    }), { status: 200, headers: { 'content-type': 'application/json' } });
  };

  t.after(() => {
    globalThis.fetch = originalFetch;
    if (originalWindow === undefined) delete globalThis.window;
    else Object.defineProperty(globalThis, 'window', { value: originalWindow, configurable: true });
    if (originalLocalStorage === undefined) delete globalThis.localStorage;
    else Object.defineProperty(globalThis, 'localStorage', { value: originalLocalStorage, configurable: true });
  });

  await new API().getStoresFilteredPaginated({
    employeeId: 205,
    state: 'Maharashtra',
    page: 0,
    size: 20,
  });

  const url = new URL(requests[0].url);
  assert.equal(url.pathname, '/v2/store/search');
  assert.equal(url.searchParams.get('employeeId'), '205');
  assert.equal(url.searchParams.get('state'), 'Maharashtra');
  assert.equal(url.searchParams.get('page'), '0');
  assert.equal(url.searchParams.get('size'), '20');
  assert.equal(requests[0].options.headers.Authorization, 'Bearer store-token');
});

test('bulk store reassignment sends the selected ids with authentication', async (t) => {
  const originalFetch = globalThis.fetch;
  const originalWindow = globalThis.window;
  const originalLocalStorage = globalThis.localStorage;
  const requests = [];

  Object.defineProperty(globalThis, 'window', { value: {}, configurable: true });
  Object.defineProperty(globalThis, 'localStorage', {
    value: { getItem: (key) => key === 'authToken' ? 'store-token' : null },
    configurable: true,
  });
  globalThis.fetch = async (url, options) => {
    requests.push({ url: String(url), options });
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };

  t.after(() => {
    globalThis.fetch = originalFetch;
    if (originalWindow === undefined) delete globalThis.window;
    else Object.defineProperty(globalThis, 'window', { value: originalWindow, configurable: true });
    if (originalLocalStorage === undefined) delete globalThis.localStorage;
    else Object.defineProperty(globalThis, 'localStorage', { value: originalLocalStorage, configurable: true });
  });

  await API.bulkEditStoreEmployee({
    sourceEmployeeId: 205,
    targetEmployeeId: 310,
    storeIds: [9862, 9863],
  });

  assert.equal(requests[0].url, 'https://api.gajkesaristeels.in/store/bulk-edit-employee');
  assert.equal(requests[0].options.method, 'PUT');
  assert.equal(requests[0].options.headers.Authorization, 'Bearer store-token');
  assert.deepEqual(JSON.parse(requests[0].options.body), {
    sourceEmployeeId: 205,
    targetEmployeeId: 310,
    storeIds: [9862, 9863],
  });
});

test('bulk store reassignment surfaces the backend message without HTTP details', async (t) => {
  const originalFetch = globalThis.fetch;
  const originalWindow = globalThis.window;
  const originalLocalStorage = globalThis.localStorage;

  Object.defineProperty(globalThis, 'window', { value: {}, configurable: true });
  Object.defineProperty(globalThis, 'localStorage', {
    value: { getItem: (key) => key === 'authToken' ? 'store-token' : null },
    configurable: true,
  });
  globalThis.fetch = async () => new Response(
    JSON.stringify([{ message: 'Store 12878 city must match the target employee city.' }]),
    { status: 400, headers: { 'content-type': 'application/json' } },
  );

  t.after(() => {
    globalThis.fetch = originalFetch;
    if (originalWindow === undefined) delete globalThis.window;
    else Object.defineProperty(globalThis, 'window', { value: originalWindow, configurable: true });
    if (originalLocalStorage === undefined) delete globalThis.localStorage;
    else Object.defineProperty(globalThis, 'localStorage', { value: originalLocalStorage, configurable: true });
  });

  await assert.rejects(
    API.bulkEditStoreEmployee({
      sourceEmployeeId: 205,
      targetEmployeeId: 310,
      storeIds: [12878],
    }),
    (error) => {
      assert.equal(error.message, 'Store 12878 city must match the target employee city.');
      assert.equal(error.status, 400);
      assert.doesNotMatch(error.message, /API request failed|Body:|400/);
      return true;
    },
  );
});
