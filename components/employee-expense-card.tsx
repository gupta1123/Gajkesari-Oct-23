import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  CheckCircle, 
  Clock, 
  XCircle,
  Check,
  X,
  Calendar,
  Eye
} from "lucide-react";
import { format } from "date-fns";
import { Heading, Text } from "@/components/ui/typography";
import { Separator } from "@/components/ui/separator";
import type { ExpenseViewModel } from "@/components/expense-details-dialog";

interface Employee {
  id: number;
  name: string;
  position: string;
  avatar: string;
  totalExpenses: number;
  approved: number;
  pending: number;
  rejected: number;
  expenses: ExpenseViewModel[];
}

interface EmployeeExpenseCardProps {
  employee: Employee;
  busy?: boolean;
  showExpenses: boolean;
  onToggleExpenses: () => void;
  onApprove?: (employeeName: string, expenseId: number) => void;
  onReject?: (employeeName: string, expenseId: number) => void;
  onApproveMultiple?: (employeeName: string, expenseIds: number[]) => void;
  onRejectMultiple?: (employeeName: string, expenseIds: number[]) => void;
  onViewDetails?: (expense: ExpenseViewModel) => void;
}

export default function EmployeeExpenseCard({ employee, busy = false, showExpenses, onToggleExpenses, onApprove, onReject, onApproveMultiple, onRejectMultiple, onViewDetails }: EmployeeExpenseCardProps) {
  const expenses = employee.expenses;
  const [selectedExpenseIds, setSelectedExpenseIds] = useState<number[]>([]);

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case "approved":
        return (
          <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 hover:bg-emerald-100 text-[10px] px-2 py-0.5 font-medium border border-emerald-200/60">
            <CheckCircle className="mr-1 h-2.5 w-2.5" />Approved
          </Badge>
        );
      case "pending":
        return (
          <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 hover:bg-amber-100 text-[10px] px-2 py-0.5 font-medium border border-amber-200/60">
            <Clock className="mr-1 h-2.5 w-2.5" />Pending
          </Badge>
        );
      case "rejected":
        return (
          <Badge className="bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300 hover:bg-rose-100 text-[10px] px-2 py-0.5 font-medium border border-rose-200/60">
            <XCircle className="mr-1 h-2.5 w-2.5" />Rejected
          </Badge>
        );
      default:
        return <Badge className="text-[10px] px-2 py-0.5 font-medium">{status}</Badge>;
    }
  };

  const calculateTotals = () => {
    return expenses.reduce((acc, expense) => {
      const amount = expense.amount || 0;
      acc.total += amount;
      if (expense.status === "approved") {
        acc.approved += amount;
        acc.approvedCount += 1;
      }
      if (expense.status === "pending") {
        acc.pending += amount;
        acc.pendingCount += 1;
      }
      if (expense.status === "rejected") {
        acc.rejected += amount;
        acc.rejectedCount += 1;
      }
      return acc;
    }, {
      total: 0,
      approved: 0,
      pending: 0,
      rejected: 0,
      approvedCount: 0,
      pendingCount: 0,
      rejectedCount: 0
    });
  };

  const totals = calculateTotals();

  return (
    <Card className="w-full hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-gray-200 border-2 border-dashed rounded-xl w-10 h-10 flex items-center justify-center shrink-0">
              <span className="text-gray-600 font-medium text-sm">
                {employee.name.split(' ').map(n => n[0]).join('').toUpperCase()}
              </span>
            </div>
            <div className="min-w-0 flex flex-col justify-center">
              <h3 className="m-0 p-0 text-sm font-semibold text-foreground leading-tight truncate">
                {employee.name}
              </h3>
              <p className="m-0 p-0 text-xs text-muted-foreground leading-tight mt-0.5">
                {employee.position}
              </p>
            </div>
          </div>
          <div className="text-right flex flex-col justify-center">
            <p className="m-0 p-0 text-sm font-semibold text-foreground leading-tight">
              ₹{totals.total.toFixed(2)}
            </p>
            <p className="m-0 p-0 text-xs text-muted-foreground leading-tight mt-0.5">
              Total Expenses
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-2.5 grid grid-cols-3 gap-1.5">
          <div className="w-full rounded-md bg-emerald-50/90 py-1 px-1.5 text-center dark:bg-emerald-950/50">
            <div className="flex items-center justify-center gap-1">
              <CheckCircle className="h-3 w-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 leading-none">
                ₹{totals.approved.toFixed(2)}
              </span>
            </div>
            <span className="mt-0.5 block text-[10px] font-medium text-emerald-700 dark:text-emerald-400 leading-tight truncate">
              Approved
            </span>
          </div>
          <div className="w-full rounded-md bg-amber-50/90 py-1 px-1.5 text-center dark:bg-amber-950/50">
            <div className="flex items-center justify-center gap-1">
              <Clock className="h-3 w-3 text-amber-600 dark:text-amber-400 shrink-0" />
              <span className="text-xs font-bold text-amber-800 dark:text-amber-300 leading-none">
                ₹{totals.pending.toFixed(2)}
              </span>
            </div>
            <span className="mt-0.5 block text-[10px] font-medium text-amber-700 dark:text-amber-400 leading-tight truncate">
              Pending
            </span>
          </div>
          <div className="w-full rounded-md bg-rose-50/90 py-1 px-1.5 text-center dark:bg-rose-950/50">
            <div className="flex items-center justify-center gap-1">
              <XCircle className="h-3 w-3 text-rose-600 dark:text-rose-400 shrink-0" />
              <span className="text-xs font-bold text-rose-800 dark:text-rose-300 leading-none">
                ₹{totals.rejected.toFixed(2)}
              </span>
            </div>
            <span className="mt-0.5 block text-[10px] font-medium text-rose-700 dark:text-rose-400 leading-tight truncate">
              Rejected
            </span>
          </div>
        </div>
        
        <Button 
          variant="outline" 
          size="sm"
          className="w-full h-8 text-xs"
          onClick={onToggleExpenses}
        >
          {showExpenses ? "Hide Expenses" : "Show Expenses"}
        </Button>
        
        {showExpenses && (
          <div className="space-y-2.5 mt-3 pt-2">
            <Separator />
            <div className="space-y-2 max-h-60 overflow-y-auto pr-0.5">
              {expenses.map((expense) => (
                <div key={expense.id} className="flex items-center justify-between p-2 rounded-lg border border-border/50 bg-card hover:bg-muted/40 transition-colors text-xs">
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <Checkbox
                      disabled={busy || expense.status !== "pending"}
                      checked={selectedExpenseIds.includes(expense.id)}
                      onCheckedChange={(checked: boolean) => {
                        if (checked) {
                          setSelectedExpenseIds(prev => [...prev, expense.id]);
                        } else {
                          setSelectedExpenseIds(prev => prev.filter(id => id !== expense.id));
                        }
                      }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="m-0 p-0 text-xs font-semibold text-foreground truncate leading-tight">
                        {expense.category}
                      </p>
                      <div className="flex items-center gap-1 leading-tight mt-0.5 text-[11px] text-muted-foreground">
                        <Calendar className="h-3 w-3 shrink-0 text-muted-foreground" />
                        <span>{format(new Date(expense.date), "MMM dd, yyyy")}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0 ml-2">
                    <p className="m-0 p-0 text-xs font-bold text-foreground mr-1 whitespace-nowrap">
                      ₹{(expense.amount || 0).toFixed(2)}
                    </p>
                    {onViewDetails && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                        onClick={() => onViewDetails(expense)}
                        title="View expense details"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        <span className="sr-only">View expense details</span>
                      </Button>
                    )}
                    {expense.status === "pending" ? (
                      <div className="flex items-center gap-0.5">
                        <Button
                          disabled={busy}
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 p-0 hover:bg-emerald-50 text-emerald-600 dark:hover:bg-emerald-950/40"
                          aria-label="Approve expense"
                          onClick={() => {
                            onApprove?.(employee.name, expense.id);
                          }}
                        >
                          <Check className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          disabled={busy}
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 p-0 hover:bg-rose-50 text-rose-600 dark:hover:bg-rose-950/40"
                          aria-label="Reject expense"
                          onClick={() => {
                            onReject?.(employee.name, expense.id);
                          }}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ) : (
                      getStatusBadge(expense.status)
                    )}
                  </div>
                </div>
              ))}
            </div>
            
            {expenses.some(expense => expense.status === "pending") && (
              <div className="flex gap-2 pt-2">
                <Button
                  disabled={busy}
                  variant="outline"
                  size="sm"
                  className="flex-1 text-xs"
                  onClick={() => {
                    const pendingExpenseIds = expenses
                      .filter(expense => expense.status === "pending")
                      .map(expense => expense.id);
                    onApproveMultiple?.(employee.name, pendingExpenseIds);
                    setSelectedExpenseIds([]);
                  }}
                >
                  Approve All
                </Button>
                <Button
                  disabled={busy}
                  variant="outline"
                  size="sm"
                  className="flex-1 text-xs"
                  onClick={() => {
                    const pendingExpenseIds = expenses
                      .filter(expense => expense.status === "pending")
                      .map(expense => expense.id);
                    onRejectMultiple?.(employee.name, pendingExpenseIds);
                    setSelectedExpenseIds([]);
                  }}
                >
                  Reject All
                </Button>
              </div>
            )}
            
            {selectedExpenseIds.length > 0 && (
              <div className="flex gap-2 pt-2">
                <Button
                  disabled={busy}
                  variant="outline"
                  size="sm"
                  className="flex-1 text-xs"
                  onClick={() => {
                    onApproveMultiple?.(employee.name, selectedExpenseIds);
                    setSelectedExpenseIds([]);
                  }}
                >
                  Approve Selected ({selectedExpenseIds.length})
                </Button>
                <Button
                  disabled={busy}
                  variant="outline"
                  size="sm"
                  className="flex-1 text-xs"
                  onClick={() => {
                    onRejectMultiple?.(employee.name, selectedExpenseIds);
                    setSelectedExpenseIds([]);
                  }}
                >
                  Reject Selected ({selectedExpenseIds.length})
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
