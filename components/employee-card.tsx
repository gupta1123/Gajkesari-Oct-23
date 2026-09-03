import { Card, CardContent } from "@/components/ui/card";
import { MapPin, User, ChevronRight } from "lucide-react";

interface Employee {
  id: number;
  name: string;
  position: string;
  avatar: string;
  lastUpdated: string;
  status: string;
  location: string;
  totalVisits?: number;
}

interface EmployeeCardProps {
  employee: Employee;
  onClick: () => void;
}

export default function EmployeeCard({ employee, onClick }: EmployeeCardProps) {
  const initials = employee.name
    ? employee.name
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0])
        .join("")
        .toUpperCase()
    : "?";

  return (
    <Card 
      className="gap-0 border-border/70 py-0 shadow-sm transition-all hover:border-border hover:shadow-md cursor-pointer"
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onClick();
        }
      }}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-xs font-semibold text-primary-foreground">
              {initials}
            </span>
            <div className="min-w-0">
              <h3 className="truncate font-semibold text-sm text-foreground" title={employee.name}>{employee.name}</h3>
              <p className="truncate text-xs text-muted-foreground">{employee.position}</p>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
        </div>
        <div className="mt-3 space-y-1.5 pt-1 border-t">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <span className="truncate">{employee.location || 'Location not specified'}</span>
          </div>
          {employee.totalVisits !== undefined && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <User className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <span>Visits: <span className="font-medium text-foreground">{employee.totalVisits}</span></span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
