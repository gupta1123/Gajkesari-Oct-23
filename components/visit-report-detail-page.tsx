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
import { Card, CardContent } from "@/components/ui/card";
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

const displayValue = (value?: string | number | null) =>
  value === null || value === undefined || value === "" ? null : String(value);

const formatDate = (value?: string | null) => {
  if (!value) return null;
  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : format(date, "dd MMM yyyy");
};

const formatNumber = (value?: number | null, suffix = "") =>
  value === null || value === undefined
    ? null
    : `${new Intl.NumberFormat("en-IN").format(value)}${suffix}`;

const formatCurrency = (value?: number | null) =>
  value === null || value === undefined
    ? null
    : new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 2,
      }).format(value);

function SpecItem({
  label,
  value,
  className = "",
}: {
  label: string;
  value?: string | number | null;
  className?: string;
}) {
  const formatted = displayValue(value);
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
        {label}
      </span>
      {formatted ? (
        <span className="text-sm font-semibold text-foreground break-words">{formatted}</span>
      ) : (
        <span className="text-sm font-normal text-muted-foreground/60 italic">—</span>
      )}
    </div>
  );
}

function CompactRow({
  label,
  value,
}: {
  label: string;
  value?: string | number | null;
}) {
  const formatted = displayValue(value);
  return (
    <div className="flex items-center justify-between gap-3 text-xs border-b border-border/50 py-2.5 last:border-b-0 last:pb-0">
      <span className="text-muted-foreground font-medium">{label}</span>
      {formatted ? (
        <span className="font-semibold text-foreground text-right truncate max-w-[60%]">{formatted}</span>
      ) : (
        <span className="text-muted-foreground/60 italic font-normal">—</span>
      )}
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
  return initials || "CE";
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
        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
          {[0, 1].map((column) => (
            <div key={column} className="space-y-6">
              {[0, 1, 2].map((section) => (
                <div key={section} className="space-y-4 rounded-xl border p-6">
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
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6">
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

  const reportCategory = displayValue(report.category) || "Contractor";
  const customerTitle = displayValue(report.customerName) || "Customer details";
  const formattedVisitDate = formatDate(report.visitDate) || "—";

  return (
    <div className="w-full space-y-6">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleBackToSubmittedReports}
            className="h-9 w-9 shrink-0"
            title="Back to Submitted Reports"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-foreground">
              {reportCategory} Visit Report
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {formattedVisitDate} • {customerTitle}
            </p>
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleBackToSubmittedReports}
          className="h-9 text-xs font-semibold"
        >
          Back to Submitted Reports
        </Button>
      </div>

      {/* Split Workspace Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6 items-start">
        {/* Left Column: Primary Operational Details (70% Width) */}
        <div className="space-y-6 min-w-0">
          {/* Card 1: Visit Overview */}
          <Card className="rounded-xl border border-border/70 bg-card p-6 shadow-sm">
            <h2 className="text-base font-bold text-foreground flex items-center gap-2 border-b border-border/60 pb-3 mb-5">
              <CalendarDays className="h-4 w-4 text-primary" />
              Visit Overview
            </h2>
            <div className="grid gap-5 sm:grid-cols-2">
              <SpecItem label="Visit Date" value={formattedVisitDate} />
              <SpecItem label="Category" value={report.category} />
              <SpecItem label="Surveyor Officer" value={report.officerName} />
              <SpecItem label="Region" value={report.region} />
              <SpecItem label="District / Area" value={report.districtArea} />
              <SpecItem label="Purpose of Visit" value={report.purposeOfVisit} />
            </div>
          </Card>

          {/* Card 2: Requirements & Competitor Intel */}
          <Card className="rounded-xl border border-border/70 bg-card p-6 shadow-sm space-y-6">
            <h2 className="text-base font-bold text-foreground flex items-center gap-2 border-b border-border/60 pb-3">
              <TrendingUp className="h-4 w-4 text-primary" />
              Requirements & Competitor Intel
            </h2>
            <div className="grid gap-5 sm:grid-cols-2">
              <SpecItem label="Approx. Requirement" value={formatNumber(report.approxRequirementMt, " MT")} />
              <SpecItem label="Expected Quantity" value={formatNumber(report.expectedQtyMt, " MT")} />
              <SpecItem label="Current Brand Used" value={report.currentBrandUsed} />
              <SpecItem label="Current Dealer" value={report.currentDealer} />
              <SpecItem label="Next Purchase Expected" value={report.nextPurchaseExpected} className="sm:col-span-2" />
            </div>

            {/* Competitor Intelligence Block */}
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 dark:bg-amber-950/20 p-4 md:p-5 space-y-3">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-600 dark:text-amber-400 block">
                Competitor Intelligence
              </span>
              <div className="grid gap-4 sm:grid-cols-2">
                <SpecItem label="Competitor Brand" value={report.competitorBrand1} />
                <SpecItem label="Approx. Rate" value={formatCurrency(report.competitorApproxRate1)} />
                <SpecItem label="Remarks" value={report.competitorRemarks1} className="sm:col-span-2" />
              </div>
            </div>
          </Card>

          {/* Card 3: Discussion & Outcomes */}
          <Card className="rounded-xl border border-border/70 bg-card p-6 shadow-sm space-y-5">
            <h2 className="text-base font-bold text-foreground flex items-center gap-2 border-b border-border/60 pb-3">
              <FileText className="h-4 w-4 text-primary" />
              Discussion & Outcomes
            </h2>

            {/* Customer Feedback / Discussion Block */}
            <div className="rounded-r-xl border-l-4 border-primary bg-primary/5 p-4 space-y-1">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-primary block">
                Customer Feedback / Discussion
              </span>
              <p className="text-sm font-medium text-foreground whitespace-pre-wrap leading-relaxed">
                {displayValue(report.customerFeedbackDiscussion) || <span className="text-muted-foreground/60 italic font-normal">—</span>}
              </p>
            </div>

            {/* Remarks Block */}
            <div className="rounded-r-xl border-l-4 border-border/80 bg-muted/30 p-4 space-y-1">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground block">
                Remarks
              </span>
              <p className="text-sm font-medium text-foreground whitespace-pre-wrap leading-relaxed">
                {displayValue(report.remarks) || <span className="text-muted-foreground/60 italic font-normal">—</span>}
              </p>
            </div>

            {/* Materials Shared Chips */}
            <div className="space-y-2 pt-1">
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
                Materials Shared
              </span>
              {materials.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {materials.map((material) => (
                    <Badge key={material} className="bg-primary/10 text-primary border-primary/20 font-semibold px-3 py-1 text-xs">
                      {material}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground/60 italic">No materials recorded</p>
              )}
            </div>
          </Card>
        </div>

        {/* Right Column: Sidebar Specs (30% Width) */}
        <div className="space-y-6">
          {/* Card 1: Stakeholder Profile */}
          <Card className="rounded-xl border border-border/70 bg-card p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 font-bold px-2.5 py-0.5 rounded-md text-[11px] uppercase">
                Submitted
              </Badge>
            </div>

            <div className="flex items-center gap-3.5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-sm border border-primary/20">
                {getInitials(report.customerName)}
              </div>
              <div className="min-w-0">
                <h3 className="text-base font-bold text-foreground truncate" title={displayValue(report.customerName) || ""}>
                  {displayValue(report.customerName) || "Customer Name"}
                </h3>
                <p className="text-xs text-muted-foreground truncate">
                  {displayValue(report.firmName) || "—"}
                </p>
              </div>
            </div>

            <div className="space-y-1">
              <CompactRow label="Mobile" value={report.mobileNo} />
              <div className="pt-2">
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                  Address
                </span>
                <p className="text-xs font-semibold text-foreground break-words">
                  {displayValue(report.address) || <span className="text-muted-foreground/60 italic font-normal">—</span>}
                </p>
              </div>
            </div>
          </Card>

          {/* Card 2: Project Details */}
          <Card className="rounded-xl border border-border/70 bg-card p-6 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-foreground flex items-center gap-2 border-b border-border/60 pb-3">
              <Building2 className="h-4 w-4 text-primary" />
              Project Details
            </h2>
            <div className="space-y-1">
              <CompactRow label="Project Name" value={report.projectName} />
              <CompactRow label="Project Type" value={report.projectType} />
              <CompactRow label="Project Stage" value={report.projectStage} />
              <CompactRow label="Monthly Consumption" value={formatNumber(report.monthlyConsumptionMt, " MT")} />
            </div>
          </Card>

          {/* Card 3: Follow-up Specs */}
          <Card className="rounded-xl border border-border/70 bg-card p-6 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-foreground flex items-center gap-2 border-b border-border/60 pb-3">
              <Phone className="h-4 w-4 text-primary" />
              Follow-up Specs
            </h2>
            <div className="space-y-1">
              <CompactRow label="Potential" value={report.potential} />
              <CompactRow label="Follow-up Mode" value={report.followUpMode} />
              <CompactRow label="Next Follow-up" value={formatDate(report.nextFollowUpDate)} />
            </div>
          </Card>

          {/* Card 4: Verification Signatures */}
          <Card className="rounded-xl border border-border/70 bg-card p-6 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-foreground flex items-center gap-2 border-b border-border/60 pb-3">
              <PackageCheck className="h-4 w-4 text-primary" />
              Verification Signatures
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <SpecItem label="Customer Sign" value={report.customerSignature} />
              <SpecItem label="Officer Sign" value={report.officerSignature} />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
