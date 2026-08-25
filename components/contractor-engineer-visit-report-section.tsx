"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  CalendarIcon,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  FileDown,
  Loader2,
  RefreshCw,
  RotateCcw,
  Search,
} from "lucide-react";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { SpacedCalendar } from "@/components/ui/spaced-calendar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import VisitReportsPanel from "@/components/visit-reports-panel";
import {
  contractorEngineerVisitReportsApi,
  downloadVisitReportExport,
  type ContractorEngineerVisitReport,
  type ContractorEngineerVisitReportPayload,
} from "@/lib/contractor-engineer-visit-reports-api";
import {
  createContractorEngineerVisitReportPdfBlob,
  getContractorEngineerVisitReportFileName,
  type ContractorEngineerVisitReportFormData,
} from "@/lib/contractor-engineer-visit-report-pdf";

const CATEGORY_OPTIONS = ["Contractor", "Engineer", "Architect", "Builder", "Others"];
const PROJECT_TYPE_OPTIONS = [
  "Residential",
  "Commercial",
  "Industrial",
  "Government",
  "Infrastructure",
  "Others",
];
const PROJECT_STAGE_OPTIONS = [
  "Planning",
  "Foundation",
  "RCC Work",
  "Brick Work",
  "Finishing",
  "Completed",
];
const PURPOSE_OPTIONS = [
  "Introduction",
  "Product Presentation",
  "Rate Discussion",
  "Technical Discussion",
  "Complaint",
  "Follow-up",
  "Order Collection",
];
const MATERIAL_OPTIONS = ["Brochure", "Visiting Card", "Rate List", "Sample", "Test Certificate"];
const POTENTIAL_OPTIONS = ["Immediate", "15 Days", "1 Month", "Future"];
const FOLLOW_UP_OPTIONS = ["Call", "Visit", "WhatsApp", "Meeting"];
const FORM_STEPS = [
  "Officer & Customer",
  "Project & Requirement",
  "Visit Discussion",
  "Follow-up & Signatures",
] as const;

function todayIso() {
  const date = new Date();
  return toLocalIsoDate(date);
}

function toLocalIsoDate(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function parseLocalIsoDate(value: string) {
  if (!value) return undefined;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return undefined;
  return new Date(year, month - 1, day);
}

function createInitialForm(): ContractorEngineerVisitReportFormData {
  return {
    visitDate: todayIso(),
    officerName: "",
    region: "",
    districtArea: "",
    category: "",
    customerName: "",
    firmName: "",
    mobileNo: "",
    address: "",
    projectName: "",
    projectType: "",
    projectStage: "",
    approxRequirementMt: "",
    monthlyConsumptionMt: "",
    currentBrandUsed: "",
    currentDealer: "",
    nextPurchaseExpected: "",
    purposeOfVisit: "",
    materialsProvided: [],
    customerFeedbackDiscussion: "",
    competitorRows: [{ brand: "", approxRate: "", remarks: "" }],
    potential: "",
    expectedQtyMt: "",
    nextFollowUpDate: "",
    followUpMode: "",
    remarks: "",
    customerSignature: "",
    officerSignature: "",
  };
}

function cleanText(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function cleanNumber(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const numericValue = Number(trimmed);
  return Number.isFinite(numericValue) ? numericValue : null;
}

function buildVisitReportPayload(
  form: ContractorEngineerVisitReportFormData,
): ContractorEngineerVisitReportPayload {
  const materials = new Set(form.materialsProvided);
  const competitor = form.competitorRows[0] || { brand: "", approxRate: "", remarks: "" };

  return {
    visitDate: cleanText(form.visitDate),
    officerName: cleanText(form.officerName),
    region: cleanText(form.region),
    districtArea: cleanText(form.districtArea),
    category: cleanText(form.category),
    customerName: cleanText(form.customerName),
    firmName: cleanText(form.firmName),
    mobileNo: cleanText(form.mobileNo),
    address: cleanText(form.address),
    projectName: cleanText(form.projectName),
    projectType: cleanText(form.projectType),
    projectStage: cleanText(form.projectStage),
    approxRequirementMt: cleanNumber(form.approxRequirementMt),
    monthlyConsumptionMt: cleanNumber(form.monthlyConsumptionMt),
    currentBrandUsed: cleanText(form.currentBrandUsed),
    currentDealer: cleanText(form.currentDealer),
    nextPurchaseExpected: cleanText(form.nextPurchaseExpected),
    purposeOfVisit: cleanText(form.purposeOfVisit),
    materialBrochure: materials.has("Brochure"),
    materialVisitingCard: materials.has("Visiting Card"),
    materialRateList: materials.has("Rate List"),
    materialSample: materials.has("Sample"),
    materialTestCertificate: materials.has("Test Certificate"),
    customerFeedbackDiscussion: cleanText(form.customerFeedbackDiscussion),
    competitorBrand1: cleanText(competitor.brand),
    competitorApproxRate1: cleanNumber(competitor.approxRate),
    competitorRemarks1: cleanText(competitor.remarks),
    potential: cleanText(form.potential),
    expectedQtyMt: cleanNumber(form.expectedQtyMt),
    nextFollowUpDate: cleanText(form.nextFollowUpDate),
    followUpMode: cleanText(form.followUpMode),
    remarks: cleanText(form.remarks),
    customerSignature: cleanText(form.customerSignature),
    officerSignature: cleanText(form.officerSignature),
  };
}

type TextFieldProps = {
  id: string;
  label: string;
  value: string;
  type?: string;
  onChange: (value: string) => void;
};

function TextField({ id, label, value, type = "text", onChange }: TextFieldProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

type DateFieldProps = {
  id: string;
  label: string;
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
};

function DateField({ id, label, value, placeholder = "Pick a date", onChange }: DateFieldProps) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedDate = parseLocalIsoDate(value);

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Popover modal={false} open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            className={`w-full justify-start text-left font-normal ${
              !value ? "text-muted-foreground" : ""
            }`}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {selectedDate ? format(selectedDate, "PPP") : <span>{placeholder}</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-auto p-0"
          align="start"
          side="bottom"
          onInteractOutside={(event) => event.preventDefault()}
          onPointerDownOutside={(event) => event.preventDefault()}
        >
          <SpacedCalendar
            mode="single"
            selected={selectedDate}
            onSelect={(date) => {
              onChange(date ? toLocalIsoDate(date) : "");
              setIsOpen(false);
            }}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

type FilterSelectProps = {
  id: string;
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
};

function FilterSelect({ id, label, value, options, onChange }: FilterSelectProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="border-input bg-background text-foreground h-9 w-full rounded-md border px-3 py-1 text-sm shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
      >
        <option value="all">All</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}

type ChoiceGroupProps = {
  label: string;
  options: string[];
  value: string | string[];
  onChange: (value: string | string[]) => void;
  multiple?: boolean;
};

function ChoiceGroup({ label, options, value, onChange, multiple = false }: ChoiceGroupProps) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedValues = Array.isArray(value) ? value : value ? [value] : [];
  const groupId = label.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const selectedSummary = selectedValues.length
    ? selectedValues.join(", ")
    : multiple
      ? "Select one or more"
      : "Select one";

  const toggleOption = (option: string) => {
    if (multiple) {
      onChange(
        selectedValues.includes(option)
          ? selectedValues.filter((item) => item !== option)
          : [...selectedValues, option],
      );
      return;
    }
    onChange(selectedValues.includes(option) ? "" : option);
  };

  return (
    <div className="rounded-md border bg-background">
      <button
        type="button"
        className="flex min-h-12 w-full items-center justify-between gap-4 px-3 py-2 text-left transition-colors hover:bg-muted/50"
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
        aria-controls={`${groupId}-options`}
      >
        <span className="min-w-0">
          <span className="block text-sm font-medium text-foreground">{label}</span>
          <span className="mt-1 block truncate text-xs text-muted-foreground">
            {selectedSummary}
          </span>
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div id={`${groupId}-options`} className="space-y-3 border-t p-3">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {options.map((option) => {
              const id = `${groupId}-${option.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
              return (
                <label
                  key={option}
                  htmlFor={id}
                  className="flex min-h-9 cursor-pointer items-center gap-3 rounded-md border px-3 py-2 text-sm transition-colors hover:bg-muted/50"
                >
                  <Checkbox
                    id={id}
                    checked={selectedValues.includes(option)}
                    onCheckedChange={() => toggleOption(option)}
                  />
                  <span className="break-words">{option}</span>
                </label>
              );
            })}
          </div>
          <div className="flex justify-end">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsOpen(false)}>
              Close
            </Button>
          </div>
        </div>
      )}
      </div>
  );
}

function FormSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-4 border-t pt-5 first:border-t-0 first:pt-0">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      {children}
    </section>
  );
}

export default function ContractorEngineerVisitReportSection() {
  const [form, setForm] = useState<ContractorEngineerVisitReportFormData>(() => createInitialForm());
  const [activeReportTab, setActiveReportTab] = useState("fillReport");
  const [activeFormStep, setActiveFormStep] = useState(0);
  const [reports, setReports] = useState<ContractorEngineerVisitReport[]>([]);
  const [reportStartDate, setReportStartDate] = useState(() => todayIso());
  const [reportEndDate, setReportEndDate] = useState(() => todayIso());
  const [isReportsLoading, setIsReportsLoading] = useState(false);
  const [reportsError, setReportsError] = useState<string | null>(null);
  const [isReportsExporting, setIsReportsExporting] = useState(false);
  const [isSavingReport, setIsSavingReport] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formMessage, setFormMessage] = useState<string | null>(null);
  const [submittedSearch, setSubmittedSearch] = useState("");
  const [submittedCategory, setSubmittedCategory] = useState("all");
  const [submittedProjectType, setSubmittedProjectType] = useState("all");
  const [submittedPotential, setSubmittedPotential] = useState("all");

  const setField = useCallback(
    <K extends keyof ContractorEngineerVisitReportFormData>(
      field: K,
      value: ContractorEngineerVisitReportFormData[K],
    ) => {
      setForm((current) => ({ ...current, [field]: value }));
    },
    [],
  );

  const updateCompetitorRow = useCallback(
    (index: number, field: keyof ContractorEngineerVisitReportFormData["competitorRows"][number], value: string) => {
      setForm((current) => ({
        ...current,
        competitorRows: current.competitorRows.map((row, rowIndex) =>
          rowIndex === index ? { ...row, [field]: value } : row,
        ),
      }));
    },
    [],
  );

  const validatedDateRange = useMemo(() => {
    if (!reportStartDate || !reportEndDate) return null;
    if (new Date(reportStartDate) > new Date(reportEndDate)) return null;
    return { start: reportStartDate, end: reportEndDate };
  }, [reportEndDate, reportStartDate]);

  const loadSubmittedReports = useCallback(async () => {
    if (!validatedDateRange) {
      setReportsError("Select a valid submitted report date range.");
      return;
    }

    setIsReportsLoading(true);
    setReportsError(null);
    try {
      const data = await contractorEngineerVisitReportsApi.getByDateRange(
        validatedDateRange.start,
        validatedDateRange.end,
      );
      setReports(data || []);
    } catch (error) {
      setReports([]);
      setReportsError(error instanceof Error ? error.message : "Failed to load submitted reports.");
    } finally {
      setIsReportsLoading(false);
    }
  }, [validatedDateRange]);

  useEffect(() => {
    loadSubmittedReports();
  }, [loadSubmittedReports]);

  const filteredReports = useMemo(() => {
    const query = submittedSearch.trim().toLowerCase();

    return reports.filter((report) => {
      const matchesQuery =
        !query ||
        [
          report.customerName,
          report.firmName,
          report.officerName,
          report.projectName,
          report.region,
          report.districtArea,
          report.mobileNo,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(query));

      const matchesCategory =
        submittedCategory === "all" || report.category === submittedCategory;
      const matchesProjectType =
        submittedProjectType === "all" || report.projectType === submittedProjectType;
      const matchesPotential =
        submittedPotential === "all" || report.potential === submittedPotential;

      return matchesQuery && matchesCategory && matchesProjectType && matchesPotential;
    });
  }, [reports, submittedCategory, submittedPotential, submittedProjectType, submittedSearch]);

  const clearSubmittedFilters = () => {
    setSubmittedSearch("");
    setSubmittedCategory("all");
    setSubmittedProjectType("all");
    setSubmittedPotential("all");
  };

  const downloadSubmittedReports = async () => {
    if (!validatedDateRange || isReportsExporting) {
      setReportsError("Select a valid submitted report date range.");
      return;
    }

    setIsReportsExporting(true);
    setReportsError(null);
    try {
      const response = await contractorEngineerVisitReportsApi.exportByDateRange(
        validatedDateRange.start,
        validatedDateRange.end,
      );
      downloadVisitReportExport(
        response,
        `contractor-engineer-visit-reports-${validatedDateRange.start}-to-${validatedDateRange.end}.xlsx`,
      );
    } catch (error) {
      setReportsError(error instanceof Error ? error.message : "Failed to download submitted reports.");
    } finally {
      setIsReportsExporting(false);
    }
  };

  const downloadPdf = async () => {
    if (isSavingReport) return;

    setIsSavingReport(true);
    setFormError(null);
    setFormMessage(null);

    try {
      await contractorEngineerVisitReportsApi.create(buildVisitReportPayload(form));

      const reportDate = form.visitDate || todayIso();
      setReportStartDate(reportDate);
      setReportEndDate(reportDate);
      setReports(
        await contractorEngineerVisitReportsApi.getByDateRange(reportDate, reportDate),
      );
      setActiveReportTab("submittedReports");
      setFormMessage("Report saved successfully.");

      const blob = createContractorEngineerVisitReportPdfBlob(form);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = getContractorEngineerVisitReportFileName(form);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Failed to save report.");
    } finally {
      setIsSavingReport(false);
    }
  };

  const resetForm = () => {
    setForm(createInitialForm());
    setActiveFormStep(0);
    setFormError(null);
    setFormMessage(null);
  };

  const isFirstStep = activeFormStep === 0;
  const isFinalStep = activeFormStep === FORM_STEPS.length - 1;
  const goToPreviousStep = () => setActiveFormStep((step) => Math.max(0, step - 1));
  const goToNextStep = () =>
    setActiveFormStep((step) => Math.min(FORM_STEPS.length - 1, step + 1));

  return (
    <Tabs value={activeReportTab} onValueChange={setActiveReportTab} className="w-full">
      <div className="mb-5 overflow-x-auto">
        <TabsList className="flex h-auto w-max min-w-full justify-start gap-2 p-1">
          <TabsTrigger value="fillReport">Fill Report</TabsTrigger>
          <TabsTrigger value="submittedReports">Submitted Reports</TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="fillReport" className="space-y-4">
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle className="text-xl font-semibold text-foreground">
                Contractor / Engineer Visit Report
              </CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Page {activeFormStep + 1} of {FORM_STEPS.length}: {FORM_STEPS[activeFormStep]}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={resetForm}>
                <RotateCcw className="mr-2 h-4 w-4" />
                Reset
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {FORM_STEPS.map((step, index) => {
              const isActive = index === activeFormStep;
              const isComplete = index < activeFormStep;
              return (
                <button
                  key={step}
                  type="button"
                  onClick={() => setActiveFormStep(index)}
                  className={`flex min-h-12 items-center gap-3 rounded-md border px-3 py-2 text-left text-sm transition-colors ${
                    isActive
                      ? "border-primary bg-primary text-primary-foreground"
                      : isComplete
                        ? "border-primary/30 bg-primary/5 text-foreground hover:bg-primary/10"
                        : "border-border bg-background text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  }`}
                >
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold ${
                      isActive
                        ? "border-primary-foreground text-primary-foreground"
                        : "border-current"
                    }`}
                  >
                    {index + 1}
                  </span>
                  <span className="break-words font-medium">{step}</span>
                </button>
              );
            })}
          </div>

          {(formError || formMessage) && (
            <div
              className={`mb-5 rounded-md border p-3 text-sm ${
                formError
                  ? "border-destructive/30 bg-destructive/5 text-destructive"
                  : "border-emerald-200 bg-emerald-50 text-emerald-700"
              }`}
            >
              {formError || formMessage}
            </div>
          )}

          <form className="space-y-6" onSubmit={(event) => event.preventDefault()}>
            {activeFormStep === 0 && (
              <div className="space-y-6">
                <FormSection title="Officer Details">
              <div className="grid gap-4 md:grid-cols-2">
                <DateField
                  id="contractor-report-visit-date"
                  label="Visit Date"
                  value={form.visitDate}
                  onChange={(value) => setField("visitDate", value)}
                />
                <TextField
                  id="contractor-report-officer-name"
                  label="Officer Name"
                  value={form.officerName}
                  onChange={(value) => setField("officerName", value)}
                />
                <TextField
                  id="contractor-report-region"
                  label="Region"
                  value={form.region}
                  onChange={(value) => setField("region", value)}
                />
                <TextField
                  id="contractor-report-district-area"
                  label="District / Area"
                  value={form.districtArea}
                  onChange={(value) => setField("districtArea", value)}
                />
              </div>
                </FormSection>

                <FormSection title="Customer Details">
              <ChoiceGroup
                label="Category"
                options={CATEGORY_OPTIONS}
                value={form.category}
                onChange={(value) => setField("category", value as string)}
              />
              <div className="grid gap-4 md:grid-cols-2">
                <TextField
                  id="contractor-report-customer-name"
                  label="Name"
                  value={form.customerName}
                  onChange={(value) => setField("customerName", value)}
                />
                <TextField
                  id="contractor-report-firm-name"
                  label="Firm Name"
                  value={form.firmName}
                  onChange={(value) => setField("firmName", value)}
                />
                <TextField
                  id="contractor-report-mobile"
                  label="Mobile No."
                  value={form.mobileNo}
                  onChange={(value) => setField("mobileNo", value)}
                />
                <TextField
                  id="contractor-report-address"
                  label="Address"
                  value={form.address}
                  onChange={(value) => setField("address", value)}
                />
              </div>
                </FormSection>
              </div>
            )}

            {activeFormStep === 1 && (
              <div className="space-y-6">
                <FormSection title="Project Details">
              <TextField
                id="contractor-report-project-name"
                label="Project Name"
                value={form.projectName}
                onChange={(value) => setField("projectName", value)}
              />
              <ChoiceGroup
                label="Project Type"
                options={PROJECT_TYPE_OPTIONS}
                value={form.projectType}
                onChange={(value) => setField("projectType", value as string)}
              />
              <ChoiceGroup
                label="Project Stage"
                options={PROJECT_STAGE_OPTIONS}
                value={form.projectStage}
                onChange={(value) => setField("projectStage", value as string)}
              />
                </FormSection>

                <FormSection title="Steel Requirement">
              <div className="grid gap-4 md:grid-cols-2">
                <TextField
                  id="contractor-report-approx-requirement"
                  label="Approx. Req. (MT)"
                  value={form.approxRequirementMt}
                  onChange={(value) => setField("approxRequirementMt", value)}
                />
                <TextField
                  id="contractor-report-monthly-consumption"
                  label="Monthly Cons. (MT)"
                  value={form.monthlyConsumptionMt}
                  onChange={(value) => setField("monthlyConsumptionMt", value)}
                />
                <TextField
                  id="contractor-report-current-brand"
                  label="Current Brand Used"
                  value={form.currentBrandUsed}
                  onChange={(value) => setField("currentBrandUsed", value)}
                />
                <TextField
                  id="contractor-report-current-dealer"
                  label="Current Dealer"
                  value={form.currentDealer}
                  onChange={(value) => setField("currentDealer", value)}
                />
                <TextField
                  id="contractor-report-next-purchase"
                  label="Next Purchase Expected"
                  value={form.nextPurchaseExpected}
                  onChange={(value) => setField("nextPurchaseExpected", value)}
                />
              </div>
                </FormSection>
              </div>
            )}

            {activeFormStep === 2 && (
              <div className="space-y-6">
                <FormSection title="Purpose And Materials">
              <ChoiceGroup
                label="Purpose of Visit"
                options={PURPOSE_OPTIONS}
                value={form.purposeOfVisit}
                onChange={(value) => setField("purposeOfVisit", value as string)}
              />
              <ChoiceGroup
                label="Materials Provided"
                options={MATERIAL_OPTIONS}
                value={form.materialsProvided}
                multiple
                onChange={(value) => setField("materialsProvided", value as string[])}
              />
                </FormSection>

                <FormSection title="Customer Feedback / Discussion">
              <Textarea
                value={form.customerFeedbackDiscussion}
                onChange={(event) => setField("customerFeedbackDiscussion", event.target.value)}
                className="min-h-28"
              />
                </FormSection>

                <FormSection title="Competitor Information">
              <div className="space-y-3">
                {form.competitorRows.map((row, index) => (
                  <div key={index} className="grid gap-3 rounded-md border p-3 md:grid-cols-[1fr_160px_1.4fr]">
                    <TextField
                      id={`contractor-report-competitor-brand-${index}`}
                      label="Brand"
                      value={row.brand}
                      onChange={(value) => updateCompetitorRow(index, "brand", value)}
                    />
                    <TextField
                      id={`contractor-report-competitor-rate-${index}`}
                      label="Approx. Rate"
                      value={row.approxRate}
                      onChange={(value) => updateCompetitorRow(index, "approxRate", value)}
                    />
                    <TextField
                      id={`contractor-report-competitor-remarks-${index}`}
                      label="Remarks"
                      value={row.remarks}
                      onChange={(value) => updateCompetitorRow(index, "remarks", value)}
                    />
                  </div>
                ))}
              </div>
                </FormSection>
              </div>
            )}

            {activeFormStep === 3 && (
              <div className="space-y-6">
                <FormSection title="Business Potential And Follow-up">
              <ChoiceGroup
                label="Potential"
                options={POTENTIAL_OPTIONS}
                value={form.potential}
                onChange={(value) => setField("potential", value as string)}
              />
              <div className="grid gap-4 md:grid-cols-2">
                <TextField
                  id="contractor-report-expected-qty"
                  label="Expected Qty (MT)"
                  value={form.expectedQtyMt}
                  onChange={(value) => setField("expectedQtyMt", value)}
                />
                <DateField
                  id="contractor-report-next-follow-up"
                  label="Next Follow-up Date"
                  value={form.nextFollowUpDate}
                  onChange={(value) => setField("nextFollowUpDate", value)}
                />
              </div>
              <ChoiceGroup
                label="Follow-up Mode"
                options={FOLLOW_UP_OPTIONS}
                value={form.followUpMode}
                onChange={(value) => setField("followUpMode", value as string)}
              />
                </FormSection>

                <FormSection title="Remarks And Signatures">
              <Textarea
                value={form.remarks}
                onChange={(event) => setField("remarks", event.target.value)}
                className="min-h-24"
              />
              <div className="grid gap-4 md:grid-cols-2">
                <TextField
                  id="contractor-report-customer-signature"
                  label="Customer Signature"
                  value={form.customerSignature}
                  onChange={(value) => setField("customerSignature", value)}
                />
                <TextField
                  id="contractor-report-officer-signature"
                  label="Officer Signature"
                  value={form.officerSignature}
                  onChange={(value) => setField("officerSignature", value)}
                />
              </div>
                </FormSection>
              </div>
            )}

            <div className="flex flex-col-reverse gap-3 border-t pt-5 sm:flex-row sm:items-center sm:justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={goToPreviousStep}
                disabled={isFirstStep}
              >
                <ChevronLeft className="mr-2 h-4 w-4" />
                Back
              </Button>

              {isFinalStep ? (
                <Button type="button" onClick={downloadPdf} disabled={isSavingReport}>
                  {isSavingReport ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <FileDown className="mr-2 h-4 w-4" />
                  )}
                  {isSavingReport ? "Saving..." : "Save & Download PDF"}
                </Button>
              ) : (
                <Button type="button" onClick={goToNextStep}>
                  Next
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      </TabsContent>

      <TabsContent value="submittedReports" className="space-y-4">
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold text-foreground">Submitted Reports</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <DateField
                id="contractor-submitted-start"
                label="From Date"
                value={reportStartDate}
                onChange={setReportStartDate}
              />
              <DateField
                id="contractor-submitted-end"
                label="To Date"
                value={reportEndDate}
                onChange={setReportEndDate}
              />
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <TextField
                id="contractor-submitted-search"
                label="Search"
                value={submittedSearch}
                onChange={setSubmittedSearch}
              />
              <FilterSelect
                id="contractor-submitted-category"
                label="Category"
                value={submittedCategory}
                options={CATEGORY_OPTIONS}
                onChange={setSubmittedCategory}
              />
              <FilterSelect
                id="contractor-submitted-project-type"
                label="Project Type"
                value={submittedProjectType}
                options={PROJECT_TYPE_OPTIONS}
                onChange={setSubmittedProjectType}
              />
              <FilterSelect
                id="contractor-submitted-potential"
                label="Potential"
                value={submittedPotential}
                options={POTENTIAL_OPTIONS}
                onChange={setSubmittedPotential}
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={loadSubmittedReports}
                disabled={isReportsLoading}
              >
                {isReportsLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Search className="mr-2 h-4 w-4" />
                )}
                Load Reports
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={downloadSubmittedReports}
                disabled={isReportsExporting || !validatedDateRange}
              >
                {isReportsExporting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Download className="mr-2 h-4 w-4" />
                )}
                Download Excel
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={loadSubmittedReports}
                disabled={isReportsLoading}
                aria-label="Refresh submitted reports"
              >
                <RefreshCw className={isReportsLoading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
              </Button>
              <Button type="button" variant="ghost" onClick={clearSubmittedFilters}>
                Clear Filters
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Showing {filteredReports.length} of {reports.length} submitted reports.
            </p>
          </CardContent>
        </Card>

        <VisitReportsPanel
          reports={filteredReports}
          isLoading={isReportsLoading}
          error={reportsError}
          isExporting={isReportsExporting}
          onExport={downloadSubmittedReports}
          onRetry={loadSubmittedReports}
        />
      </TabsContent>
    </Tabs>
  );
}
