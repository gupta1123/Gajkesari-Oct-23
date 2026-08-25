export type ContractorEngineerVisitReportFormData = {
  visitDate: string;
  officerName: string;
  region: string;
  districtArea: string;
  category: string;
  customerName: string;
  firmName: string;
  mobileNo: string;
  address: string;
  projectName: string;
  projectType: string;
  projectStage: string;
  approxRequirementMt: string;
  monthlyConsumptionMt: string;
  currentBrandUsed: string;
  currentDealer: string;
  nextPurchaseExpected: string;
  purposeOfVisit: string;
  materialsProvided: string[];
  customerFeedbackDiscussion: string;
  competitorRows: Array<{
    brand: string;
    approxRate: string;
    remarks: string;
  }>;
  potential: string;
  expectedQtyMt: string;
  nextFollowUpDate: string;
  followUpMode: string;
  remarks: string;
  customerSignature: string;
  officerSignature: string;
};

const PAGE_WIDTH = 595.276;
const PAGE_HEIGHT = 841.89;
const MARGIN_X = 34;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_X * 2;
const NAVY = "0.102 0.227 0.392";
const RED = "0.780 0.170 0.170";
const TEXT = "0.165 0.196 0.255";
const MUTED = "0.380 0.450 0.560";
const BORDER = "0.690 0.760 0.840";
const TABLE_HEADER = "0.930 0.953 0.973";

type FontName = "F1" | "F2";

function escapePdfText(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
    .replace(/\r?\n/g, " ");
}

function normalizeText(value?: string | number | null) {
  if (value === null || value === undefined) return "";
  return String(value).replace(/[^\x09\x0A\x0D\x20-\x7E]/g, "").trim();
}

function formatDateForPdf(value: string) {
  if (!value) return "";
  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function wrapText(value: string, maxChars: number, maxLines: number) {
  const words = normalizeText(value).split(/\s+/).filter(Boolean);
  const lines: string[] = [];

  for (const word of words) {
    const current = lines[lines.length - 1];
    if (!current) {
      lines.push(word.slice(0, maxChars));
    } else if (`${current} ${word}`.length <= maxChars) {
      lines[lines.length - 1] = `${current} ${word}`;
    } else if (lines.length < maxLines) {
      lines.push(word.slice(0, maxChars));
    }

    if (lines.length >= maxLines && lines[lines.length - 1].length >= maxChars) break;
  }

  return lines.slice(0, maxLines);
}

class PdfPage {
  private commands: string[] = [];

  private y(top: number) {
    return PAGE_HEIGHT - top;
  }

  raw(command: string) {
    this.commands.push(command);
  }

  strokeColor(color: string) {
    this.raw(`${color} RG`);
  }

  fillColor(color: string) {
    this.raw(`${color} rg`);
  }

  lineWidth(width: number) {
    this.raw(`${width} w`);
  }

  rect(x: number, top: number, width: number, height: number, mode: "S" | "f" | "B" = "S") {
    this.raw(`${x.toFixed(2)} ${(this.y(top) - height).toFixed(2)} ${width.toFixed(2)} ${height.toFixed(2)} re ${mode}`);
  }

  line(x1: number, top1: number, x2: number, top2: number) {
    this.raw(`${x1.toFixed(2)} ${this.y(top1).toFixed(2)} m ${x2.toFixed(2)} ${this.y(top2).toFixed(2)} l S`);
  }

  dashedLine(x1: number, top: number, x2: number) {
    this.raw("[1.2 1.4] 0 d");
    this.strokeColor(MUTED);
    this.lineWidth(0.55);
    this.line(x1, top, x2, top);
    this.raw("[] 0 d");
  }

  text(
    x: number,
    top: number,
    value: string,
    options: { size?: number; font?: FontName; color?: string } = {},
  ) {
    const size = options.size ?? 9;
    const font = options.font ?? "F1";
    const color = options.color ?? TEXT;
    this.fillColor(color);
    this.raw(`BT /${font} ${size} Tf ${x.toFixed(2)} ${this.y(top).toFixed(2)} Td (${escapePdfText(normalizeText(value))}) Tj ET`);
  }

  checkbox(x: number, top: number, checked: boolean) {
    this.strokeColor(MUTED);
    this.lineWidth(0.7);
    this.rect(x, top, 6.8, 6.8);
    if (checked) {
      this.strokeColor(NAVY);
      this.lineWidth(1.1);
      this.line(x + 1.2, top + 3.7, x + 2.9, top + 5.7);
      this.line(x + 2.9, top + 5.7, x + 5.9, top + 1.2);
    }
  }

  output() {
    return this.commands.join("\n");
  }
}

class PdfDocument {
  private objects: string[] = [];

  addObject(value: string) {
    this.objects.push(value);
    return this.objects.length;
  }

  build(pageContent: string) {
    const fontRegularId = this.addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
    const fontBoldId = this.addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>");
    const stream = `<< /Length ${new TextEncoder().encode(pageContent).length} >>\nstream\n${pageContent}\nendstream`;
    const contentId = this.addObject(stream);
    const pagesId = this.objects.length + 2;
    const pageId = this.addObject(
      `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /Font << /F1 ${fontRegularId} 0 R /F2 ${fontBoldId} 0 R >> >> /Contents ${contentId} 0 R >>`,
    );
    const actualPagesId = this.addObject(`<< /Type /Pages /Kids [${pageId} 0 R] /Count 1 >>`);
    const catalogId = this.addObject(`<< /Type /Catalog /Pages ${actualPagesId} 0 R >>`);

    const parts = ["%PDF-1.4\n%\xE2\xE3\xCF\xD3\n"];
    const offsets: number[] = [0];
    let byteLength = new TextEncoder().encode(parts[0]).length;

    this.objects.forEach((object, index) => {
      offsets.push(byteLength);
      const body = `${index + 1} 0 obj\n${object}\nendobj\n`;
      parts.push(body);
      byteLength += new TextEncoder().encode(body).length;
    });

    const xrefOffset = byteLength;
    const xrefLines = [
      `xref\n0 ${this.objects.length + 1}`,
      "0000000000 65535 f ",
      ...offsets.slice(1).map((offset) => `${offset.toString().padStart(10, "0")} 00000 n `),
      `trailer\n<< /Size ${this.objects.length + 1} /Root ${catalogId} 0 R >>`,
      "startxref",
      String(xrefOffset),
      "%%EOF",
    ];
    parts.push(xrefLines.join("\n"));

    return new TextEncoder().encode(parts.join(""));
  }
}

function drawSectionHeader(page: PdfPage, top: number, title: string) {
  page.fillColor(NAVY);
  page.rect(MARGIN_X, top, CONTENT_WIDTH, 15, "f");
  page.text(MARGIN_X + 4, top + 10.6, title, { size: 9.6, font: "F2", color: "1 1 1" });
}

function drawField(
  page: PdfPage,
  label: string,
  x: number,
  top: number,
  lineStart: number,
  lineEnd: number,
  value: string,
  options: { size?: number; maxChars?: number } = {},
) {
  page.text(x, top, label, { size: options.size ?? 8.7, font: "F2" });
  page.dashedLine(lineStart, top + 2.4, lineEnd);
  const maxChars = options.maxChars ?? Math.max(10, Math.floor((lineEnd - lineStart) / 4.6));
  page.text(lineStart + 2, top - 0.8, normalizeText(value).slice(0, maxChars), { size: 8.2 });
}

function drawChoiceRow(
  page: PdfPage,
  label: string,
  top: number,
  options: string[],
  selected: string | string[],
  startX: number,
  gap: number,
  positions?: number[],
) {
  const selectedValues = Array.isArray(selected) ? selected : [selected];
  if (label) page.text(MARGIN_X + 3, top, label, { size: 8.7, font: "F2" });
  options.forEach((option, index) => {
    const x = positions?.[index] ?? startX + index * gap;
    page.checkbox(x, top - 7.8, selectedValues.includes(option));
    page.text(x + 9.2, top, option, { size: 8.6 });
  });
}

function drawWrappedLines(
  page: PdfPage,
  value: string,
  startTop: number,
  lineTops: number[],
  maxChars: number,
) {
  const lines = wrapText(value, maxChars, lineTops.length);
  lineTops.forEach((lineTop, index) => {
    page.dashedLine(MARGIN_X, lineTop, MARGIN_X + CONTENT_WIDTH);
    if (lines[index]) {
      page.text(MARGIN_X + 3, lineTop - 3.2, lines[index], { size: 8.2 });
    }
  });
}

function drawHeader(page: PdfPage) {
  page.text(MARGIN_X + 2, 43, "GAJKESARI STEELS & ALLOYS PVT. LTD.", {
    size: 16.2,
    font: "F2",
    color: NAVY,
  });
  page.text(MARGIN_X + 2, 62, "CONTRACTOR / ENGINEER VISIT REPORT", {
    size: 11.7,
    font: "F2",
    color: RED,
  });
  page.strokeColor(NAVY);
  page.lineWidth(1.4);
  page.line(MARGIN_X, 74, MARGIN_X + CONTENT_WIDTH, 74);
}

function drawReport(page: PdfPage, data: ContractorEngineerVisitReportFormData) {
  drawHeader(page);

  drawSectionHeader(page, 80, "1. OFFICER DETAILS");
  drawField(page, "Visit Date:", MARGIN_X + 3, 111, 90, 203, formatDateForPdf(data.visitDate));
  drawField(page, "Officer Name:", 210, 111, 275, 555, data.officerName);
  drawField(page, "Region:", MARGIN_X + 3, 127, 90, 203, data.region);
  drawField(page, "District / Area:", 210, 127, 275, 555, data.districtArea);

  drawSectionHeader(page, 139, "2. CUSTOMER DETAILS");
  drawChoiceRow(
    page,
    "Category:",
    166,
    ["Contractor", "Engineer", "Architect", "Builder", "Others"],
    data.category,
    90,
    63,
  );
  drawField(page, "Name:", MARGIN_X + 3, 182, 90, 291, data.customerName);
  drawField(page, "Firm Name:", 300, 182, 353, 555, data.firmName);
  drawField(page, "Mobile No.:", MARGIN_X + 3, 198, 90, 291, data.mobileNo);
  drawField(page, "Address:", 300, 198, 353, 555, data.address, { maxChars: 44 });

  drawSectionHeader(page, 211, "3. PROJECT DETAILS");
  drawField(page, "Project Name:", MARGIN_X + 3, 242, 99, 550, data.projectName, { maxChars: 76 });
  drawChoiceRow(
    page,
    "Project Type:",
    258,
    ["Residential", "Commercial", "Industrial", "Government", "Infrastructure", "Others"],
    data.projectType,
    100,
    68,
  );
  drawChoiceRow(
    page,
    "Project Stage:",
    274,
    ["Planning", "Foundation", "RCC Work", "Brick Work", "Finishing", "Completed"],
    data.projectStage,
    100,
    64,
  );

  drawSectionHeader(page, 286, "4. STEEL REQUIREMENT");
  drawField(page, "Approx. Req. (MT):", MARGIN_X + 3, 316, 145, 298, data.approxRequirementMt);
  drawField(page, "Monthly Cons. (MT):", 307, 316, 402, 555, data.monthlyConsumptionMt);
  drawField(page, "Current Brand Used:", MARGIN_X + 3, 332, 145, 298, data.currentBrandUsed);
  drawField(page, "Current Dealer:", 307, 332, 402, 555, data.currentDealer);
  drawField(page, "Next Purchase Expected:", MARGIN_X + 3, 348, 145, 310, data.nextPurchaseExpected);

  drawSectionHeader(page, 361, "5. PURPOSE OF VISIT & MATERIALS PROVIDED");
  drawChoiceRow(
    page,
    "Purpose of Visit:",
    391,
    ["Introduction", "Product Presentation", "Rate Discussion", "Technical Discussion", "Complaint"],
    data.purposeOfVisit,
    121,
    85,
    [121, 190, 292, 378, 480],
  );
  drawChoiceRow(
    page,
    "",
    405,
    ["Follow-up", "Order Collection"],
    data.purposeOfVisit,
    121,
    58,
    [121, 180],
  );
  drawChoiceRow(
    page,
    "Materials Provided:",
    419,
    ["Brochure", "Visiting Card", "Rate List", "Sample", "Test Certificate"],
    data.materialsProvided,
    121,
    64,
    [121, 185, 256, 316, 385],
  );

  drawSectionHeader(page, 432, "6. CUSTOMER FEEDBACK / DISCUSSION");
  drawWrappedLines(page, data.customerFeedbackDiscussion, 461, [466, 481, 496], 112);

  drawSectionHeader(page, 508, "7. COMPETITOR INFORMATION");
  page.fillColor(TABLE_HEADER);
  page.rect(MARGIN_X, 527, CONTENT_WIDTH, 18, "f");
  page.strokeColor(BORDER);
  page.lineWidth(0.55);
  page.rect(MARGIN_X, 527, CONTENT_WIDTH, 49);
  page.line(190, 527, 190, 576);
  page.line(322, 527, 322, 576);
  page.line(MARGIN_X, 545, MARGIN_X + CONTENT_WIDTH, 545);
  page.line(MARGIN_X, 561, MARGIN_X + CONTENT_WIDTH, 561);
  page.text(MARGIN_X + 5, 541, "BRAND", { size: 8.4, font: "F2" });
  page.text(195, 541, "APPROX. RATE (RS/MT)", { size: 8.4, font: "F2" });
  page.text(327, 541, "REMARKS", { size: 8.4, font: "F2" });
  data.competitorRows.slice(0, 2).forEach((row, index) => {
    const top = index === 0 ? 556 : 572;
    page.text(MARGIN_X + 5, top, row.brand, { size: 8.1 });
    page.text(195, top, row.approxRate, { size: 8.1 });
    page.text(327, top, row.remarks, { size: 8.1 });
  });

  drawSectionHeader(page, 582, "8. BUSINESS POTENTIAL & FOLLOW-UP");
  drawChoiceRow(page, "Potential:", 612, ["Immediate", "15 Days", "1 Month", "Future"], data.potential, 110, 62);
  drawField(page, "Expected Qty:", MARGIN_X + 3, 636, 110, 235, data.expectedQtyMt);
  page.text(111, 649, "MT", { size: 8.4 });
  drawField(page, "Next Follow-up Date:", 242, 636, 332, 555, formatDateForPdf(data.nextFollowUpDate));
  drawChoiceRow(page, "Follow-up Mode:", 660, ["Call", "Visit", "WhatsApp", "Meeting"], data.followUpMode, 110, 76);

  drawSectionHeader(page, 673, "9. REMARKS");
  drawWrappedLines(page, data.remarks, 700, [706, 721], 112);

  page.strokeColor(MUTED);
  page.lineWidth(0.75);
  page.raw("[3 4] 0 d");
  page.line(MARGIN_X + 2, 759, 270, 759);
  page.line(325, 759, MARGIN_X + CONTENT_WIDTH - 2, 759);
  page.raw("[] 0 d");
  page.text(112, 771, data.customerSignature || "Customer Signature", { size: 8.7, font: "F2" });
  page.text(408, 771, data.officerSignature || "Officer Signature", { size: 8.7, font: "F2" });
}

export function createContractorEngineerVisitReportPdfBytes(
  data: ContractorEngineerVisitReportFormData,
) {
  const page = new PdfPage();
  drawReport(page, data);
  return new PdfDocument().build(page.output());
}

export function createContractorEngineerVisitReportPdfBlob(
  data: ContractorEngineerVisitReportFormData,
) {
  return new Blob([createContractorEngineerVisitReportPdfBytes(data)], {
    type: "application/pdf",
  });
}

export function getContractorEngineerVisitReportFileName(
  data: ContractorEngineerVisitReportFormData,
) {
  const datePart = data.visitDate || new Date().toISOString().slice(0, 10);
  const customerPart = normalizeText(data.customerName || data.firmName || "visit-report")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 36);
  return `contractor-engineer-visit-report-${customerPart || "form"}-${datePart}.pdf`;
}
