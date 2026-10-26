import type { ContractorEngineerVisitReport } from "./contractor-engineer-visit-reports-api.ts";
import type { ContractorEngineerVisitReportFormData } from "./contractor-engineer-visit-report-pdf.ts";

const text = (value?: string | number | null) =>
  value === null || value === undefined ? "" : String(value);

export function mapSavedVisitReportToFormData(
  report: ContractorEngineerVisitReport,
): ContractorEngineerVisitReportFormData {
  return {
    visitDate: text(report.visitDate).slice(0, 10),
    officerName: text(report.officerName),
    region: text(report.region),
    districtArea: text(report.districtArea),
    category: text(report.category),
    customerName: text(report.customerName),
    firmName: text(report.firmName),
    mobileNo: text(report.mobileNo),
    address: text(report.address),
    projectName: text(report.projectName),
    projectType: text(report.projectType),
    projectStage: text(report.projectStage),
    approxRequirementMt: text(report.approxRequirementMt),
    monthlyConsumptionMt: text(report.monthlyConsumptionMt),
    currentBrandUsed: text(report.currentBrandUsed),
    currentDealer: text(report.currentDealer),
    nextPurchaseExpected: text(report.nextPurchaseExpected),
    purposeOfVisit: text(report.purposeOfVisit),
    materialsProvided: [
      report.materialBrochure && "Brochure",
      report.materialVisitingCard && "Visiting Card",
      report.materialRateList && "Rate List",
      report.materialSample && "Sample",
      report.materialTestCertificate && "Test Certificate",
    ].filter((value): value is string => Boolean(value)),
    customerFeedbackDiscussion: text(report.customerFeedbackDiscussion),
    competitorRows: [
      {
        brand: text(report.competitorBrand1),
        approxRate: text(report.competitorApproxRate1),
        remarks: text(report.competitorRemarks1),
      },
      {
        brand: text(report.competitorBrand2),
        approxRate: text(report.competitorApproxRate2),
        remarks: text(report.competitorRemarks2),
      },
    ],
    potential: text(report.potential),
    expectedQtyMt: text(report.expectedQtyMt),
    nextFollowUpDate: text(report.nextFollowUpDate).slice(0, 10),
    followUpMode: text(report.followUpMode),
    remarks: text(report.remarks),
    customerSignature: text(report.customerSignature),
    officerSignature: text(report.officerSignature),
  };
}

export function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
