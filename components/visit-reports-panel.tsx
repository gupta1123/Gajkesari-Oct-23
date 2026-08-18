"use client";

import { useRouter } from "next/navigation";
import { Download, Eye, FileCheck2, FileText, Loader2 } from "lucide-react";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
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
  isExporting = false,
  onExport,
  onRetry,
}: VisitReportsPanelProps) {
  const router = useRouter();

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onExport}
          disabled={isLoading || isExporting || reports.length === 0}
        >
          {isExporting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Download className="mr-2 h-4 w-4" />
          )}
          {isExporting ? "Preparing..." : "Download Excel"}
        </Button>
      </div>

      <Card className="border shadow-sm">
        <CardHeader className="border-b pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border bg-muted/40">
              <FileCheck2 className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-base">Submitted Visit Reports</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Contractor and Engineer reports submitted on this visit date.
              </p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-3 p-5">
              {[0, 1].map((item) => (
                <Skeleton key={item} className="h-14 w-full" />
              ))}
            </div>
          ) : error ? (
            <div className="p-5">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
                <span>{error}</span>
                {onRetry && (
                  <Button type="button" variant="outline" size="sm" onClick={onRetry}>
                    Try again
                  </Button>
                )}
              </div>
            </div>
          ) : reports.length === 0 ? (
            <div className="flex min-h-44 flex-col items-center justify-center px-6 py-10 text-center">
              <FileText className="mb-3 h-8 w-8 text-muted-foreground" />
              <p className="text-sm font-medium">No submitted report available</p>
              <p className="mt-1 max-w-md text-sm text-muted-foreground">
                Submitted Contractor or Engineer reports for this date will appear here.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Category</TableHead>
                    <TableHead>Customer / Firm</TableHead>
                    <TableHead>Officer</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>Visit Date</TableHead>
                    <TableHead className="w-24 text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reports.map((report) => (
                    <TableRow key={report.id}>
                      <TableCell className="font-medium">{displayValue(report.category)}</TableCell>
                      <TableCell>
                        <p className="font-medium">{displayValue(report.customerName)}</p>
                        {report.firmName && (
                          <p className="mt-0.5 text-xs text-muted-foreground">{report.firmName}</p>
                        )}
                      </TableCell>
                      <TableCell>{displayValue(report.officerName)}</TableCell>
                      <TableCell>{displayValue(report.projectName)}</TableCell>
                      <TableCell className="whitespace-nowrap">{formatDate(report.visitDate)}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => router.push(`/dashboard/visits/reports/${report.id}`)}
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          View Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
