"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ComponentType, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  FileText,
  PackageCheck,
  Phone,
  RefreshCw,
  TrendingUp,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  contractorEngineerVisitReportsApi,
  type ContractorEngineerVisitReport,
} from "@/lib/contractor-engineer-visit-reports-api";

type VisitReportDetailPageProps = {
  reportId: number;
};

const SUBMITTED_REPORTS_ROUTE =
  "/dashboard/reports?tab=contractorEngineerVisitReport&contractorReportTab=submittedReports";

type DetailFieldProps = {
  label: string;
  value?: string | number | null;
  className?: string;
};

const displayValue = (value?: string | number | null) =>
  value === null || value === undefined || value === "" ? "-" : String(value);

const formatDate = (value?: string | null) => {
  if (!value) return "-";
  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : format(date, "dd MMM yyyy");
};

const formatNumber = (value?: number | null, suffix = "") =>
  value === null || value === undefined
    ? "-"
    : `${new Intl.NumberFormat("en-IN").format(value)}${suffix}`;

const formatCurrency = (value?: number | null) =>
  value === null || value === undefined
    ? "-"
    : new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 2,
      }).format(value);

function DetailField({ label, value, className = "" }: DetailFieldProps) {
  return (
    <div className={className}>
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="mt-1 break-words text-sm font-medium leading-6 text-foreground">
        {displayValue(value)}
      </dd>
    </div>
  );
}

function DetailSection({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: ComponentType<{ className?: string }>;
  children: ReactNode;
}) {
  return (
    <section className="rounded-md border bg-card p-5 sm:p-6">
      <div className="mb-5 flex items-center gap-2 border-b pb-4">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function CompactField({ label, value }: DetailFieldProps) {
  return (
    <div className="flex items-start justify-between gap-5 border-b py-3 first:pt-0 last:border-b-0 last:pb-0">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="max-w-[60%] break-words text-right text-sm font-medium text-foreground">
        {displayValue(value)}
      </dd>
    </div>
  );
}

const getInitials = (value?: string | null) => {
  const initials = value
    ?.trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
  return initials || "-";
};

export default function VisitReportDetailPage({ reportId }: VisitReportDetailPageProps) {
  const router = useRouter();
  const [report, setReport] = useState<ContractorEngineerVisitReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadReport = useCallback(async () => {
    if (!Number.isFinite(reportId) || reportId <= 0) {
      setError("Invalid visit report ID.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      setReport(await contractorEngineerVisitReportsApi.getById(reportId));
    } catch (requestError) {
      setReport(null);
      setError(
        requestError instanceof Error ? requestError.message : "Failed to load the visit report.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [reportId]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const handleBackToSubmittedReports = () => {
    router.push(SUBMITTED_REPORTS_ROUTE);
  };

  const materials = useMemo(() => {
    if (!report) return [];
    return [
      report.materialBrochure && "Brochure",
      report.materialVisitingCard && "Visiting card",
      report.materialRateList && "Rate list",
      report.materialSample && "Sample",
      report.materialTestCertificate && "Test certificate",
    ].filter((item): item is string => Boolean(item));
  }, [report]);

  if (isLoading) {
    return (
      <div className="w-full space-y-7">
        <div className="space-y-3 border-b pb-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </div>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          {[0, 1].map((column) => (
            <div key={column} className="space-y-6">
              {[0, 1, 2].map((section) => (
                <div key={section} className="space-y-4 rounded-md border p-6">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-28 w-full" />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="mx-auto max-w-3xl py-10">
        <div className="rounded-md border border-destructive/30 bg-destructive/5 p-5">
          <h2 className="font-semibold text-destructive">Unable to open visit report</h2>
          <p className="mt-2 text-sm text-destructive">{error || "Visit report not found."}</p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button type="button" onClick={loadReport}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Again
            </Button>
            <Button type="button" variant="outline" onClick={handleBackToSubmittedReports}>
              Back to Submitted Reports
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const customerTitle = [report.customerName, report.firmName].filter(Boolean).join(" · ") || "Customer not provided";

  return (
    <div className="w-full space-y-6">
      <header className="space-y-4">
        <Button type="button" variant="outline" onClick={handleBackToSubmittedReports}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Submitted Reports
        </Button>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold text-foreground">
              {displayValue(report.category)} Visit Report
            </h1>
            <Badge variant="outline">Submitted</Badge>
          </div>
          <p className="mt-2 break-words text-sm text-muted-foreground">
            {formatDate(report.visitDate)} · {customerTitle}
          </p>
        </div>
      </header>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.85fr)_minmax(300px,1fr)]">
        <main className="space-y-6">
          <DetailSection title="Visit overview" icon={CalendarDays}>
            <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
              <DetailField label="Visit date" value={formatDate(report.visitDate)} />
              <DetailField label="Category" value={report.category} />
              <DetailField label="Officer" value={report.officerName} />
              <DetailField label="Region" value={report.region} />
              <DetailField label="District / Area" value={report.districtArea} />
              <DetailField label="Purpose of visit" value={report.purposeOfVisit} />
            </dl>
          </DetailSection>

          <DetailSection title="Requirements and competitor information" icon={TrendingUp}>
            <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
              <DetailField label="Approx. requirement" value={formatNumber(report.approxRequirementMt, " MT")} />
              <DetailField label="Expected quantity" value={formatNumber(report.expectedQtyMt, " MT")} />
              <DetailField label="Current brand used" value={report.currentBrandUsed} />
              <DetailField label="Current dealer" value={report.currentDealer} />
              <DetailField label="Next purchase expected" value={report.nextPurchaseExpected} className="sm:col-span-2" />
            </dl>

            <div className="mt-6 rounded-md border bg-muted/30 p-4">
              <p className="mb-4 text-xs font-semibold uppercase text-muted-foreground">
                Competitor information
              </p>
              <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
                <DetailField label="Competitor brand" value={report.competitorBrand1} />
                <DetailField label="Approx. rate" value={formatCurrency(report.competitorApproxRate1)} />
                <DetailField label="Remarks" value={report.competitorRemarks1} className="sm:col-span-2" />
              </dl>
            </div>
          </DetailSection>

          <DetailSection title="Discussion and outcome" icon={FileText}>
            <div className="space-y-4">
              <div className="rounded-r-md border-l-4 border-primary bg-primary/5 p-4">
                <p className="text-xs font-semibold uppercase text-muted-foreground">
                  Customer feedback / discussion
                </p>
                <p className="mt-2 whitespace-pre-wrap text-sm font-medium leading-6">
                  {displayValue(report.customerFeedbackDiscussion)}
                </p>
              </div>
              <div className="rounded-r-md border-l-4 border-border bg-muted/30 p-4">
                <p className="text-xs font-semibold uppercase text-muted-foreground">Remarks</p>
                <p className="mt-2 whitespace-pre-wrap text-sm font-medium leading-6">
                  {displayValue(report.remarks)}
                </p>
              </div>
              <div className="pt-1">
                <p className="mb-3 text-xs font-semibold uppercase text-muted-foreground">
                  Materials shared
                </p>
                {materials.length ? (
                  <div className="flex flex-wrap gap-2">
                    {materials.map((material) => (
                      <Badge key={material} variant="secondary">{material}</Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No materials recorded.</p>
                )}
              </div>
            </div>
          </DetailSection>
        </main>

        <aside className="space-y-6">
          <section className="rounded-md border bg-card p-5">
            <div className="mb-5 flex items-center justify-between border-b pb-4">
              <Badge variant="outline">Submitted</Badge>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold">
                {getInitials(report.customerName)}
              </div>
              <div className="min-w-0">
                <h2 className="break-words text-base font-semibold">{displayValue(report.customerName)}</h2>
                <p className="mt-0.5 break-words text-sm text-muted-foreground">{displayValue(report.firmName)}</p>
              </div>
            </div>
            <dl className="mt-5">
              <CompactField label="Mobile" value={report.mobileNo} />
              <CompactField label="Address" value={report.address} />
            </dl>
          </section>

          <DetailSection title="Project details" icon={Building2}>
            <dl>
              <CompactField label="Project name" value={report.projectName} />
              <CompactField label="Project type" value={report.projectType} />
              <CompactField label="Project stage" value={report.projectStage} />
              <CompactField label="Monthly consumption" value={formatNumber(report.monthlyConsumptionMt, " MT")} />
            </dl>
          </DetailSection>

          <DetailSection title="Follow-up" icon={Phone}>
            <dl>
              <CompactField label="Potential" value={report.potential} />
              <CompactField label="Mode" value={report.followUpMode} />
              <CompactField label="Next follow-up" value={formatDate(report.nextFollowUpDate)} />
            </dl>
          </DetailSection>

          <DetailSection title="Verification signatures" icon={PackageCheck}>
            <dl className="grid grid-cols-2 gap-5">
              <DetailField label="Customer" value={report.customerSignature} />
              <DetailField label="Officer" value={report.officerSignature} />
            </dl>
          </DetailSection>
        </aside>
      </div>
    </div>
  );
}
