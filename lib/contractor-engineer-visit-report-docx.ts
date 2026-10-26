import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  ImageRun,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType,
  convertInchesToTwip,
} from "docx";

import type { ContractorEngineerVisitReportFormData } from "./contractor-engineer-visit-report-pdf.ts";
import { parseReportSignature, type SignatureStrokes } from "./report-signature.ts";

const NAVY = "1A3A64";
const RED = "C72B2B";
const TEXT = "2A3241";
const MUTED = "637187";
const BORDER = "B0C2D6";
const LIGHT_BLUE = "EDF3F8";
const WHITE = "FFFFFF";

const noValue = "—";
const value = (text?: string | null) => text?.trim() || noValue;

const borders = {
  top: { style: BorderStyle.SINGLE, size: 4, color: BORDER },
  bottom: { style: BorderStyle.SINGLE, size: 4, color: BORDER },
  left: { style: BorderStyle.SINGLE, size: 4, color: BORDER },
  right: { style: BorderStyle.SINGLE, size: 4, color: BORDER },
  insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: BORDER },
  insideVertical: { style: BorderStyle.SINGLE, size: 4, color: BORDER },
};

function title(text: string, color = NAVY, size = 24) {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 80 },
    children: [new TextRun({ text, bold: true, color, size, font: "Arial" })],
  });
}

function sectionHeader(text: string) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders,
    rows: [
      new TableRow({
        children: [
          new TableCell({
            shading: { type: ShadingType.CLEAR, color: NAVY, fill: NAVY },
            margins: { top: 90, bottom: 90, left: 120, right: 120 },
            children: [
              new Paragraph({
                children: [new TextRun({ text, bold: true, color: WHITE, size: 19, font: "Arial" })],
              }),
            ],
          }),
        ],
      }),
    ],
  });
}

function fieldCell(label: string, fieldValue?: string | null) {
  return new TableCell({
    verticalAlign: VerticalAlign.CENTER,
    margins: { top: 90, bottom: 90, left: 120, right: 120 },
    children: [
      new Paragraph({
        spacing: { after: 35 },
        children: [new TextRun({ text: label.toUpperCase(), bold: true, color: MUTED, size: 15, font: "Arial" })],
      }),
      new Paragraph({
        children: [new TextRun({ text: value(fieldValue), color: TEXT, size: 19, font: "Arial" })],
      }),
    ],
  });
}

function fields(rows: Array<Array<[string, string | null | undefined]>>) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders,
    rows: rows.map((row) => new TableRow({ children: row.map(([label, fieldValue]) => fieldCell(label, fieldValue)) })),
  });
}

function choices(label: string, options: string[], selected: string | string[]) {
  const selectedValues = Array.isArray(selected) ? selected : [selected];
  return new Paragraph({
    spacing: { before: 80, after: 80 },
    children: [
      new TextRun({ text: `${label}:  `, bold: true, color: TEXT, size: 18, font: "Arial" }),
      ...options.flatMap((option, index) => [
        new TextRun({
          text: `${selectedValues.includes(option) ? "☒" : "☐"} ${option}${index === options.length - 1 ? "" : "    "}`,
          color: selectedValues.includes(option) ? NAVY : MUTED,
          bold: selectedValues.includes(option),
          size: 17,
          font: "Arial",
        }),
      ]),
    ],
  });
}

function narrative(text: string) {
  return new Paragraph({
    spacing: { before: 100, after: 120, line: 300 },
    children: [new TextRun({ text: value(text), color: TEXT, size: 18, font: "Arial" })],
  });
}

function competitorTable(data: ContractorEngineerVisitReportFormData) {
  const headerCell = (text: string) => new TableCell({
    shading: { type: ShadingType.CLEAR, color: LIGHT_BLUE, fill: LIGHT_BLUE },
    margins: { top: 90, bottom: 90, left: 100, right: 100 },
    children: [new Paragraph({ children: [new TextRun({ text, bold: true, color: NAVY, size: 17, font: "Arial" })] })],
  });
  const dataCell = (text: string) => new TableCell({
    margins: { top: 90, bottom: 90, left: 100, right: 100 },
    children: [new Paragraph({ children: [new TextRun({ text: value(text), color: TEXT, size: 17, font: "Arial" })] })],
  });

  const rows = data.competitorRows.slice(0, 2);
  while (rows.length < 2) rows.push({ brand: "", approxRate: "", remarks: "" });

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders,
    rows: [
      new TableRow({ children: [headerCell("BRAND"), headerCell("APPROX. RATE (₹/MT)"), headerCell("REMARKS")] }),
      ...rows.map((row) => new TableRow({ children: [dataCell(row.brand), dataCell(row.approxRate), dataCell(row.remarks)] })),
    ],
  });
}

function drawSignatureOnCanvas(strokes: SignatureStrokes) {
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = 600;
  canvas.height = 150;
  const context = canvas.getContext("2d");
  if (!context) return null;

  context.strokeStyle = `#${TEXT}`;
  context.lineWidth = 4;
  context.lineCap = "round";
  context.lineJoin = "round";
  strokes.forEach((stroke) => {
    if (!stroke.length) return;
    context.beginPath();
    stroke.forEach(([x, y], index) => {
      if (index === 0) context.moveTo(x * canvas.width, y * canvas.height);
      else context.lineTo(x * canvas.width, y * canvas.height);
    });
    context.stroke();
  });

  const data = atob(canvas.toDataURL("image/png").split(",")[1]);
  return Uint8Array.from(data, (character) => character.charCodeAt(0));
}

function signatureCell(label: string, signature: string) {
  const strokes = parseReportSignature(signature);
  const pngBytes = strokes ? drawSignatureOnCanvas(strokes) : null;
  return new TableCell({
    margins: { top: 120, bottom: 100, left: 120, right: 120 },
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 80 },
        children: pngBytes
          ? [new ImageRun({ data: pngBytes, type: "png", transformation: { width: 220, height: 55 } })]
          : [new TextRun({
              text: strokes ? "Signed electronically" : value(signature),
              bold: true,
              color: TEXT,
              size: 18,
              font: "Arial",
            })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        border: { top: { style: BorderStyle.SINGLE, size: 6, color: MUTED } },
        spacing: { before: 80 },
        children: [new TextRun({ text: label, bold: true, color: MUTED, size: 16, font: "Arial" })],
      }),
    ],
  });
}

export async function createContractorEngineerVisitReportDocxBlob(
  data: ContractorEngineerVisitReportFormData,
) {
  const documentFile = new Document({
    styles: {
      default: {
        document: { run: { font: "Arial", color: TEXT, size: 18 } },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(0.55),
              bottom: convertInchesToTwip(0.55),
              left: convertInchesToTwip(0.55),
              right: convertInchesToTwip(0.55),
            },
          },
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: "Gajkesari Steels & Alloys Pvt. Ltd. • Contractor / Engineer Visit Report", color: MUTED, size: 14, font: "Arial" })],
              }),
            ],
          }),
        },
        children: [
          title("GAJKESARI STEELS & ALLOYS PVT. LTD.", NAVY, 30),
          title("CONTRACTOR / ENGINEER VISIT REPORT", RED, 22),
          sectionHeader("1. OFFICER DETAILS"),
          fields([
            [["Visit Date", data.visitDate], ["Officer Name", data.officerName]],
            [["Region", data.region], ["District / Area", data.districtArea]],
          ]),
          sectionHeader("2. CUSTOMER DETAILS"),
          choices("Category", ["Contractor", "Engineer", "Architect", "Builder", "Others"], data.category),
          fields([
            [["Name", data.customerName], ["Firm Name", data.firmName]],
            [["Mobile No.", data.mobileNo], ["Address", data.address]],
          ]),
          sectionHeader("3. PROJECT DETAILS"),
          fields([[["Project Name", data.projectName]]]),
          choices("Project Type", ["Residential", "Commercial", "Industrial", "Government", "Infrastructure", "Others"], data.projectType),
          choices("Project Stage", ["Planning", "Foundation", "RCC Work", "Brick Work", "Finishing", "Completed"], data.projectStage),
          sectionHeader("4. STEEL REQUIREMENT"),
          fields([
            [["Approx. Requirement (MT)", data.approxRequirementMt], ["Monthly Consumption (MT)", data.monthlyConsumptionMt]],
            [["Current Brand Used", data.currentBrandUsed], ["Current Dealer", data.currentDealer]],
            [["Next Purchase Expected", data.nextPurchaseExpected]],
          ]),
          sectionHeader("5. PURPOSE OF VISIT & MATERIALS PROVIDED"),
          choices("Purpose of Visit", ["Introduction", "Product Presentation", "Rate Discussion", "Technical Discussion", "Complaint", "Follow-up", "Order Collection"], data.purposeOfVisit),
          choices("Materials Provided", ["Brochure", "Visiting Card", "Rate List", "Sample", "Test Certificate"], data.materialsProvided),
          sectionHeader("6. CUSTOMER FEEDBACK / DISCUSSION"),
          narrative(data.customerFeedbackDiscussion),
          new Paragraph({ pageBreakBefore: true }),
          sectionHeader("7. COMPETITOR INFORMATION"),
          competitorTable(data),
          sectionHeader("8. BUSINESS POTENTIAL & FOLLOW-UP"),
          choices("Potential", ["Immediate", "15 Days", "1 Month", "Future"], data.potential),
          fields([
            [["Expected Qty (MT)", data.expectedQtyMt], ["Next Follow-up Date", data.nextFollowUpDate]],
            [["Follow-up Mode", data.followUpMode]],
          ]),
          sectionHeader("9. REMARKS"),
          narrative(data.remarks),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders,
            rows: [new TableRow({ children: [
              signatureCell("Customer Signature", data.customerSignature),
              signatureCell("Officer Signature", data.officerSignature),
            ] })],
          }),
        ],
      },
    ],
  });

  return Packer.toBlob(documentFile);
}

export function getContractorEngineerVisitReportDocxFileName(
  data: ContractorEngineerVisitReportFormData,
) {
  const datePart = data.visitDate || new Date().toISOString().slice(0, 10);
  const customerPart = (data.customerName || data.firmName || "visit-report")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 36);
  return `contractor-engineer-visit-report-${customerPart || "form"}-${datePart}.docx`;
}
