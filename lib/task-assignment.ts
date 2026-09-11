export const DEFAULT_TASK_ASSIGNER_ID = 86;

export const resolveTaskAssignerId = (employeeId: number | null | undefined): number => {
  return Number.isInteger(employeeId) && Number(employeeId) > 0
    ? Number(employeeId)
    : DEFAULT_TASK_ASSIGNER_ID;
};
