"use client";

import { useState } from "react";
import { Download, Eye, FileCheck2, FileText, Loader2 } from "lucide-react";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  contractorEngineerVisitReportsApi,
  type ContractorEngineerVisitReport,
} from "@/lib/contractor-engineer-visit-reports-api";

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

const getMaterials = (report: ContractorEngineerVisitReport) => {
  const materials = [
    report.materialBrochure && "Brochure",
    report.materialVisitingCard && "Visiting card",
    report.materialRateList && "Rate list",
    report.materialSample && "Sample",
    report.materialTestCertificate && "Test certificate",
  ].filter(Boolean);
  return materials.length ? materials.join(", ") : "-";
};

export default function VisitReportsPanel({
  reports,
  isLoading = false,
  error,
  isExporting = false,
  onExport,
  onRetry,
}: VisitReportsPanelProps) {
  const [selectedReport, setSelectedReport] = useState<ContractorEngineerVisitReport | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const openReport = async (report: ContractorEngineerVisitReport) => {
    setSelectedReport(report);
    setDetailError(null);
    setIsDetailLoading(true);

    try {
      const detail = await contractorEngineerVisitReportsApi.getById(report.id);
      setSelectedReport(detail);
    } catch (requestError) {
      setDetailError(
        requestError instanceof Error ? requestError.message : "Failed to load the report details.",
      );
    } finally {
      setIsDetailLoading(false);
    }
  };

  const closeReport = () => {
    if (isDetailLoading) return;
    setSelectedReport(null);
    setDetailError(null);
  };

  return (
    <>
      <Card className="border shadow-sm">
        <CardHeader className="border-b pb-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
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
                        <Button type="button" variant="outline" size="sm" onClick={() => openReport(report)}>
                          <Eye className="mr-2 h-4 w-4" />
                          View
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

      <Dialog open={selectedReport !== null} onOpenChange={(open) => !open && closeReport()}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Visit Report</DialogTitle>
            <DialogDescription>
              {selectedReport
                ? `${displayValue(selectedReport.category)} · ${formatDate(selectedReport.visitDate)}`
                : "Submitted Contractor or Engineer visit report."}
            </DialogDescription>
          </DialogHeader>

          {isDetailLoading ? (
            <div className="space-y-3 py-3">
              {[0, 1, 2].map((item) => <Skeleton key={item} className="h-16 w-full" />)}
            </div>
          ) : selectedReport ? (
            <div className="space-y-6 py-2">
              {detailError && (
                <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                  {detailError}
                </div>
              )}

              <section>
                <h3 className="border-b pb-2 text-sm font-semibold">Customer and project</h3>
                <dl className="grid gap-x-8 gap-y-4 pt-4 sm:grid-cols-2">
                  <div><dt className="text-xs text-muted-foreground">Customer</dt><dd className="mt-1 text-sm font-medium">{displayValue(selectedReport.customerName)}</dd></div>
                  <div><dt className="text-xs text-muted-foreground">Firm</dt><dd className="mt-1 text-sm font-medium">{displayValue(selectedReport.firmName)}</dd></div>
                  <div><dt className="text-xs text-muted-foreground">Mobile</dt><dd className="mt-1 text-sm font-medium">{displayValue(selectedReport.mobileNo)}</dd></div>
                  <div><dt className="text-xs text-muted-foreground">District / Area</dt><dd className="mt-1 text-sm font-medium">{displayValue(selectedReport.districtArea)}</dd></div>
                  <div><dt className="text-xs text-muted-foreground">Project</dt><dd className="mt-1 text-sm font-medium">{displayValue(selectedReport.projectName)}</dd></div>
                  <div><dt className="text-xs text-muted-foreground">Type / Stage</dt><dd className="mt-1 text-sm font-medium">{[selectedReport.projectType, selectedReport.projectStage].filter(Boolean).join(" · ") || "-"}</dd></div>
                </dl>
              </section>

              <section>
                <h3 className="border-b pb-2 text-sm font-semibold">Requirement and follow-up</h3>
                <dl className="grid gap-x-8 gap-y-4 pt-4 sm:grid-cols-2">
                  <div><dt className="text-xs text-muted-foreground">Approx. requirement</dt><dd className="mt-1 text-sm font-medium">{selectedReport.approxRequirementMt == null ? "-" : `${selectedReport.approxRequirementMt} MT`}</dd></div>
                  <div><dt className="text-xs text-muted-foreground">Expected quantity</dt><dd className="mt-1 text-sm font-medium">{selectedReport.expectedQtyMt == null ? "-" : `${selectedReport.expectedQtyMt} MT`}</dd></div>
                  <div><dt className="text-xs text-muted-foreground">Potential</dt><dd className="mt-1 text-sm font-medium">{displayValue(selectedReport.potential)}</dd></div>
                  <div><dt className="text-xs text-muted-foreground">Next follow-up</dt><dd className="mt-1 text-sm font-medium">{formatDate(selectedReport.nextFollowUpDate)}{selectedReport.followUpMode ? ` · ${selectedReport.followUpMode}` : ""}</dd></div>
                  <div><dt className="text-xs text-muted-foreground">Current brand</dt><dd className="mt-1 text-sm font-medium">{displayValue(selectedReport.currentBrandUsed)}</dd></div>
                  <div><dt className="text-xs text-muted-foreground">Current dealer</dt><dd className="mt-1 text-sm font-medium">{displayValue(selectedReport.currentDealer)}</dd></div>
                  <div className="sm:col-span-2"><dt className="text-xs text-muted-foreground">Materials shared</dt><dd className="mt-1 text-sm font-medium">{getMaterials(selectedReport)}</dd></div>
                </dl>
              </section>

              <section>
                <h3 className="border-b pb-2 text-sm font-semibold">Discussion</h3>
                <dl className="grid gap-4 pt-4">
                  <div><dt className="text-xs text-muted-foreground">Purpose</dt><dd className="mt-1 whitespace-pre-wrap text-sm">{displayValue(selectedReport.purposeOfVisit)}</dd></div>
                  <div><dt className="text-xs text-muted-foreground">Customer feedback</dt><dd className="mt-1 whitespace-pre-wrap text-sm">{displayValue(selectedReport.customerFeedbackDiscussion)}</dd></div>
                  <div><dt className="text-xs text-muted-foreground">Remarks</dt><dd className="mt-1 whitespace-pre-wrap text-sm">{displayValue(selectedReport.remarks)}</dd></div>
                </dl>
              </section>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
