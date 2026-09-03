"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Eye, FileCheck2, FileText, User } from "lucide-react";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { type ContractorEngineerVisitReport } from "@/lib/contractor-engineer-visit-reports-api";

type VisitReportsPanelProps = {
  reports: ContractorEngineerVisitReport[];
  isLoading?: boolean;
  error?: string | null;
  isExporting?: boolean;
  onExport: () => void;
  onRetry?: () => void;
};

const displayValue = (value?: string | number | null) =>
  value === null || value === undefined || value === "" ? "-" : String(value);

const formatDate = (value?: string | null) => {
  if (!value) return "-";
  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : format(date, "dd MMM yyyy");
};

export default function VisitReportsPanel({
  reports,
  isLoading = false,
  error,
  onRetry,
}: VisitReportsPanelProps) {
  const router = useRouter();
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [expandedCards, setExpandedCards] = useState<number[]>([]);

  useEffect(() => {
    setCurrentPage(1);
  }, [reports.length]);

  const totalPages = Math.ceil(reports.length / rowsPerPage) || 1;
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedReports = useMemo(() => {
    const start = (safeCurrentPage - 1) * rowsPerPage;
    return reports.slice(start, start + rowsPerPage);
  }, [reports, safeCurrentPage, rowsPerPage]);

  return (
    <Card className="overflow-hidden border-border/70 bg-card shadow-sm">
      <CardHeader className="border-b py-3 px-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border bg-muted/40">
            <FileCheck2 className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <CardTitle className="text-sm font-semibold">Submitted Visit Reports</CardTitle>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Contractor and Engineer reports submitted for the selected filters.
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {isLoading ? (
          <div className="space-y-2 p-4">
            {[0, 1, 2].map((item) => (
              <Skeleton key={item} className="h-10 w-full" />
            ))}
          </div>
        ) : error ? (
          <div className="p-4">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
              <span>{error}</span>
              {onRetry && (
                <Button type="button" variant="outline" size="sm" onClick={onRetry} className="h-8 text-xs">
                  Try again
                </Button>
              )}
            </div>
          </div>
        ) : reports.length === 0 ? (
          <div className="flex min-h-36 flex-col items-center justify-center px-4 py-8 text-center">
            <FileText className="mb-2 h-7 w-7 text-muted-foreground/60" />
            <p className="text-xs font-semibold text-foreground">No submitted report available</p>
            <p className="mt-0.5 max-w-md text-xs text-muted-foreground">
              Submitted Contractor or Engineer reports for this date will appear here.
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <Table className="w-full text-xs font-poppins">
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead className="text-xs font-medium text-muted-foreground whitespace-nowrap h-10">Category</TableHead>
                    <TableHead className="text-xs font-medium text-muted-foreground whitespace-nowrap h-10">Customer / Firm</TableHead>
                    <TableHead className="text-xs font-medium text-muted-foreground whitespace-nowrap h-10">Officer / Area</TableHead>
                    <TableHead className="text-xs font-medium text-muted-foreground whitespace-nowrap h-10">Project</TableHead>
                    <TableHead className="text-xs font-medium text-muted-foreground whitespace-nowrap h-10">Potential / Follow-up</TableHead>
                    <TableHead className="text-xs font-medium text-muted-foreground whitespace-nowrap h-10">Visit Date</TableHead>
                    <TableHead className="w-20 text-right text-xs font-medium text-muted-foreground whitespace-nowrap h-10">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedReports.map((report) => (
                    <TableRow key={report.id} className="hover:bg-muted/25 transition-colors">
                      <TableCell className="text-xs py-3">
                        <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium bg-muted/80 text-foreground ring-1 ring-inset ring-border/50">
                          {displayValue(report.category)}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs py-3">
                        <p className="font-semibold text-foreground truncate max-w-[180px]" title={displayValue(report.customerName)}>
                          {displayValue(report.customerName)}
                        </p>
                        {report.firmName && (
                          <p className="mt-0.5 text-[11px] text-muted-foreground truncate max-w-[180px]">{report.firmName}</p>
                        )}
                      </TableCell>
                      <TableCell className="text-xs py-3">
                        <p className="font-medium text-foreground truncate max-w-[160px]">{displayValue(report.officerName)}</p>
                        <p className="mt-0.5 text-[11px] text-muted-foreground truncate max-w-[160px]">
                          {[report.region, report.districtArea].filter(Boolean).join(" / ") || "-"}
                        </p>
                      </TableCell>
                      <TableCell className="text-xs py-3">
                        <p className="font-medium text-foreground truncate max-w-[160px]">{displayValue(report.projectName)}</p>
                        <p className="mt-0.5 text-[11px] text-muted-foreground truncate max-w-[160px]">
                          {[report.projectType, report.projectStage].filter(Boolean).join(" / ") || "-"}
                        </p>
                      </TableCell>
                      <TableCell className="text-xs py-3">
                        <p className="font-medium text-foreground truncate max-w-[160px]">{displayValue(report.potential)}</p>
                        <p className="mt-0.5 text-[11px] text-muted-foreground truncate max-w-[160px]">
                          {[report.followUpMode, formatDate(report.nextFollowUpDate)].filter((item) => item && item !== "-").join(" / ") || "-"}
                        </p>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-xs py-3">{formatDate(report.visitDate)}</TableCell>
                      <TableCell className="text-right py-3">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2.5 text-xs font-medium"
                          onClick={() => router.push(`/dashboard/reports/contractor-engineer/${report.id}`)}
                        >
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Mobile View Cards */}
            <div className="space-y-3 p-3 md:hidden">
              {paginatedReports.map((report) => {
                const isExpanded = expandedCards.includes(report.id);
                return (
                  <Card key={report.id} className="overflow-hidden border border-border/70 shadow-none bg-card">
                    <CardContent className="p-3.5 space-y-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-semibold text-sm text-foreground truncate">{displayValue(report.customerName)}</p>
                          {report.firmName && <p className="text-xs text-muted-foreground truncate">{report.firmName}</p>}
                        </div>
                        <span className="shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium bg-muted text-foreground ring-1 ring-inset ring-border/50">
                          {displayValue(report.category)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-border/50">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <User className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                          <span className="truncate">{displayValue(report.officerName)}</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 shrink-0"
                          onClick={() => {
                            setExpandedCards((prev) =>
                              prev.includes(report.id) ? prev.filter((id) => id !== report.id) : [...prev, report.id]
                            );
                          }}
                        >
                          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </Button>
                      </div>
                      {isExpanded && (
                        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/50 text-xs">
                          <div><span className="text-muted-foreground">Project</span><p className="font-medium truncate">{displayValue(report.projectName)}</p></div>
                          <div><span className="text-muted-foreground">Potential</span><p className="font-medium truncate">{displayValue(report.potential)}</p></div>
                          <div><span className="text-muted-foreground">Area</span><p className="font-medium truncate">{displayValue(report.districtArea || report.region)}</p></div>
                          <div><span className="text-muted-foreground">Visit Date</span><p className="font-medium truncate">{formatDate(report.visitDate)}</p></div>
                        </div>
                      )}
                      <div className="flex justify-end pt-1">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 px-3 text-xs"
                          onClick={() => router.push(`/dashboard/reports/contractor-engineer/${report.id}`)}
                        >
                          <Eye className="mr-1.5 h-3.5 w-3.5" />
                          View details
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Pagination Controls Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t p-3 text-xs bg-card">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground font-medium">Rows per page:</span>
                <Select
                  value={String(rowsPerPage)}
                  onValueChange={(val) => {
                    setRowsPerPage(Number(val));
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="h-8 w-18 text-xs bg-background shadow-none">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="text-xs">
                    <SelectItem value="10" className="text-xs">10</SelectItem>
                    <SelectItem value="25" className="text-xs">25</SelectItem>
                    <SelectItem value="50" className="text-xs">50</SelectItem>
                    <SelectItem value="100" className="text-xs">100</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                  disabled={safeCurrentPage <= 1}
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                >
                  <ChevronLeft className="mr-1 h-3.5 w-3.5" />
                  Previous
                </Button>
                <span className="text-xs text-muted-foreground font-medium">
                  Page {safeCurrentPage} of {totalPages} · {reports.length} reports
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                  disabled={safeCurrentPage >= totalPages}
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                >
                  Next
                  <ChevronRight className="ml-1 h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
