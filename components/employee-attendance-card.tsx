import { useState, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Calendar,
  Sun,
  CloudSun,
  XCircle
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { Heading, Text } from "@/components/ui/typography";
import CustomCalendar from "./custom-calendar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface Visit {
  id: number;
  customer: string;
  time: string;
  purpose: string;
}

interface AttendanceRecord {
  date: string;
  status: "present" | "half" | "absent";
  visits: Visit[];
}

interface Employee {
  id: number;
  name: string;
  position: string;
  avatar: string;
  fullDays: number;
  halfDays: number;
  absent: number;
  attendance: AttendanceRecord[];
}

type NormalizedStatus = 'full day' | 'half day' | 'absent' | 'paid' | 'activity';

interface EmployeeAttendanceEntry {
  id: number;
  employeeId: number;
  employeeName: string;
  attendanceStatus: NormalizedStatus;
  checkinDate: string;
  checkoutDate: string;
  rawStatus?: string;
  date?: string;
}

interface EmployeeAttendanceCardProps {
  employee: Employee;
  selectedMonth: number;
  selectedYear: number;
  attendanceData: EmployeeAttendanceEntry[];
  onDateClick?: (date: string, employeeName: string) => void;
}

export default function EmployeeAttendanceCard({ employee, selectedMonth, selectedYear, attendanceData, onDateClick }: EmployeeAttendanceCardProps) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [summary, setSummary] = useState({
    fullDays: employee.fullDays,
    halfDays: employee.halfDays,
    absentDays: employee.absent
  });

  const handleDayClick = useCallback((date: string) => {
    if (onDateClick) {
      onDateClick(date, employee.name);
      return;
    }
    const record = employee.attendance.find(record => record.date === date);
    if (record) {
      setSelectedDate(date);
      setIsDialogOpen(true);
    }
  }, [onDateClick, employee.name, employee.attendance]);

  const handleSummaryChange = useCallback((newSummary: { fullDays: number; halfDays: number; absentDays: number }) => {
    setSummary(prev => {
      if (prev.fullDays === newSummary.fullDays && prev.halfDays === newSummary.halfDays && prev.absentDays === newSummary.absentDays) {
        return prev;
      }
      return newSummary;
    });
  }, []);

  const getInitials = (name: string) => {
    if (!name) return "";
    const parts = name.trim().split(/\s+/).slice(0, 2);
    return parts.map(p => p[0]?.toUpperCase() ?? "").join("");
  };

  const selectedDateVisits = selectedDate 
    ? employee.attendance.find(record => record.date === selectedDate)?.visits || []
    : [];

  return (
    <>
      <Card className="w-full gap-0 overflow-hidden bg-card py-0 transition-shadow hover:shadow-md">
        <CardHeader className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={employee.avatar} alt={employee.name} />
                <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                  {getInitials(employee.name)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex flex-col justify-center">
                <h3 className="m-0 p-0 text-sm font-semibold text-foreground dark:text-gray-200 leading-tight truncate">
                  {employee.name}
                </h3>
                <Badge variant="secondary" className="mt-0.5 w-fit px-1.5 py-0 text-[10px] font-medium text-muted-foreground">
                  {employee.position}
                </Badge>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4 pt-0">
          <div className="mb-2.5 grid grid-cols-3 gap-1.5">
            <div className="w-full rounded-md bg-emerald-50/90 py-1 px-1.5 text-center dark:bg-emerald-950/50">
              <div className="flex items-center justify-center gap-1">
                <Sun className="h-3 w-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 leading-none">
                  {summary.fullDays}
                </span>
              </div>
              <span className="mt-0.5 block text-[10px] font-medium text-emerald-700 dark:text-emerald-400 leading-tight truncate">
                Full Days
              </span>
            </div>
            <div className="w-full rounded-md bg-amber-50/90 py-1 px-1.5 text-center dark:bg-amber-950/50">
              <div className="flex items-center justify-center gap-1">
                <CloudSun className="h-3 w-3 text-amber-600 dark:text-amber-400 shrink-0" />
                <span className="text-xs font-bold text-amber-800 dark:text-amber-300 leading-none">
                  {summary.halfDays}
                </span>
              </div>
              <span className="mt-0.5 block text-[10px] font-medium text-amber-700 dark:text-amber-400 leading-tight truncate">
                Half Days
              </span>
            </div>
            <div className="w-full rounded-md bg-rose-50/90 py-1 px-1.5 text-center dark:bg-rose-950/50">
              <div className="flex items-center justify-center gap-1">
                <XCircle className="h-3 w-3 text-rose-600 dark:text-rose-400 shrink-0" />
                <span className="text-xs font-bold text-rose-800 dark:text-rose-300 leading-none">
                  {summary.absentDays}
                </span>
              </div>
              <span className="mt-0.5 block text-[10px] font-medium text-rose-700 dark:text-rose-400 leading-tight truncate">
                Absent
              </span>
            </div>
          </div>
          
          <div className="mt-3 flex justify-center">
            <CustomCalendar
              month={selectedMonth}
              year={selectedYear}
              attendanceData={attendanceData}
              onSummaryChange={handleSummaryChange}
              onDateClick={handleDayClick}
              employeeName={employee.name}
            />
          </div>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Visits on {selectedDate ? format(parseISO(selectedDate), "MMM dd, yyyy") : ""}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {selectedDateVisits.length > 0 ? (
              selectedDateVisits.map((visit) => (
                <div key={visit.id} className="border rounded-lg p-3 dark:border-gray-700">
                  <div className="flex justify-between">
                    <Heading as="h4" size="md" weight="semibold" className="dark:text-gray-200">
                      {visit.customer}
                    </Heading>
                    <Badge variant="secondary" className="dark:bg-gray-700 dark:text-gray-300">
                      {visit.time}
                    </Badge>
                  </div>
                  <Text size="sm" tone="muted" className="mt-1 dark:text-gray-400">
                    {visit.purpose}
                  </Text>
                </div>
              ))
            ) : (
              <Text size="sm" tone="muted" className="py-4 text-center dark:text-gray-400">
                No visits recorded for this day
              </Text>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
