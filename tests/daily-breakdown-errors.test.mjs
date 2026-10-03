import assert from "node:assert/strict";
import test from "node:test";

import {
  getApiErrorMessage,
  isIncompletePayrollSetupError,
  readApiErrorMessage,
} from "../lib/daily-breakdown-errors.ts";

test("extracts the backend daily travel error from its array response", () => {
  const message = getApiErrorMessage([
    { error: "Runtime error: Unable to refresh daily travel calculation for employee 325 on 2026-10-01" },
  ]);

  assert.equal(
    message,
    "Runtime error: Unable to refresh daily travel calculation for employee 325 on 2026-10-01",
  );
  assert.equal(isIncompletePayrollSetupError(400, message), true);
});

test("does not misclassify other statuses or validation errors as missing payroll setup", () => {
  assert.equal(isIncompletePayrollSetupError(500, "Unable to refresh daily travel calculation"), false);
  assert.equal(isIncompletePayrollSetupError(400, "End date must be after start date"), false);
});

test("reads JSON object, JSON array and plain-text error bodies", async () => {
  assert.equal(
    await readApiErrorMessage(new Response(JSON.stringify({ message: "Invalid date range" }))),
    "Invalid date range",
  );
  assert.equal(
    await readApiErrorMessage(new Response(JSON.stringify([{ error: "Payroll configuration missing" }]))),
    "Payroll configuration missing",
  );
  assert.equal(
    await readApiErrorMessage(new Response("Service temporarily unavailable")),
    "Service temporarily unavailable",
  );
});
