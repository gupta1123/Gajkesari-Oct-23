import test from 'node:test';
import assert from 'node:assert/strict';
import { meetingsApi } from '../lib/meetings-api.ts';

test('meeting creation preserves the manager request contract', async (t) => {
  const originalFetch = globalThis.fetch;
  const originalWindow = globalThis.window;
  const originalLocalStorage = globalThis.localStorage;
  const requests = [];

  Object.defineProperty(globalThis, 'window', { value: {}, configurable: true });
  Object.defineProperty(globalThis, 'localStorage', {
    value: { getItem: (key) => key === 'authToken' ? 'meeting-token' : null },
    configurable: true,
  });
  globalThis.fetch = async (url, options) => {
    requests.push({ url: String(url), options });
    return new Response('1826', { status: 200, headers: { 'content-type': 'application/json' } });
  };

  t.after(() => {
    globalThis.fetch = originalFetch;
    if (originalWindow === undefined) delete globalThis.window;
    else Object.defineProperty(globalThis, 'window', { value: originalWindow, configurable: true });
    if (originalLocalStorage === undefined) delete globalThis.localStorage;
    else Object.defineProperty(globalThis, 'localStorage', { value: originalLocalStorage, configurable: true });
  });

  const expectedPayload = {
    meetingType: 'Dealer',
    storeId: 1825,
    objective: 'Test',
    expectedBusinessImpact: 'Test',
    meetingDate: '2026-09-12',
    meetingTime: '15:00:00',
    city: 'Bangalore',
    state: 'Karnataka',
    location: 'Kr Puram',
    customerReference: 'Raghuveer',
    expectedAttendees: 12,
    expectedBudget: 1234,
    expectedGiftsMaterials: '[{"giftItem":"cap","quantity":10,"estimatedAmount":0}]',
    allowWalkInAttendees: true,
    remarks: 'Test meeting',
    plan: {
      expectedBudget: 1234,
      companyContribution: 122,
      dealerContribution: 1112,
      plannedExpenseDetails: '[{"expenseHead":"venue","amount":123,"paidBy":"COMPANY"}]',
      expectedGiftsMaterials: '[{"giftItem":"cap","quantity":10,"estimatedAmount":0}]',
      plannedGiftDetails: '[{"giftItem":"cap","quantity":10,"estimatedAmount":0}]',
      budgetRemarks: 'Test budget',
    },
    attendees: [{
      name: 'Shilpa',
      mobileNumber: '8104846414',
      email: 'shilpa@gmail.com',
      category: 'contractor',
      cityArea: 'Bangalore',
      companyShopProject: 'XYZ',
      expected: true,
      categoryDetails: '',
      remarks: 'Test attendee',
    }],
  };

  const meetingId = await meetingsApi.createMeeting(expectedPayload);

  assert.equal(meetingId, 1826);
  assert.equal(requests.length, 1);
  assert.equal(requests[0].url, 'https://api.gajkesaristeels.in/meeting/create');
  assert.equal(requests[0].options.method, 'POST');
  assert.equal(requests[0].options.headers.Authorization, 'Bearer meeting-token');
  assert.deepEqual(JSON.parse(requests[0].options.body), expectedPayload);
  assert.equal('creatorId' in JSON.parse(requests[0].options.body), false);
  assert.equal(typeof JSON.parse(requests[0].options.body).plan.plannedExpenseDetails, 'string');
  assert.equal(typeof JSON.parse(requests[0].options.body).plan.plannedGiftDetails, 'string');
});
