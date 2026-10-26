import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createContractorEngineerVisitReportPdfBytes,
} from '../lib/contractor-engineer-visit-report-pdf.ts';
import {
  createContractorEngineerVisitReportDocxBlob,
} from '../lib/contractor-engineer-visit-report-docx.ts';
import {
  mapSavedVisitReportToFormData,
} from '../lib/contractor-engineer-visit-report-export.ts';
import {
  encodeReportSignature,
  parseReportSignature,
} from '../lib/report-signature.ts';

const report = {
  id: 77,
  visitDate: '2026-10-26',
  officerName: 'Anita Officer',
  region: 'South',
  districtArea: 'Bengaluru',
  category: 'Engineer',
  customerName: 'Sample Customer',
  competitorBrand1: 'Alpha Steel',
  competitorApproxRate1: 51000,
  competitorRemarks1: 'Primary competitor',
  competitorBrand2: 'Beta Steel',
  competitorApproxRate2: 50500,
  competitorRemarks2: 'Secondary competitor',
  customerSignature: 'Customer Name',
  officerSignature: 'Officer Name',
};

test('signature strokes survive their compact storage format', () => {
  const strokes = [[[0.1, 0.2], [0.35, 0.4], [0.8, 0.15]]];
  const encoded = encodeReportSignature(strokes);
  assert.match(encoded, /^gksig:v1:/);
  assert.deepEqual(parseReportSignature(encoded), strokes);
  assert.equal(parseReportSignature('Typed Name'), null);
});

test('saved reports retain both competitors in PDF and Word exports', async () => {
  const form = mapSavedVisitReportToFormData(report);
  assert.equal(form.competitorRows.length, 2);
  assert.equal(form.competitorRows[1].brand, 'Beta Steel');

  const pdfText = new TextDecoder().decode(createContractorEngineerVisitReportPdfBytes(form));
  assert.match(pdfText, /Alpha Steel/);
  assert.match(pdfText, /Beta Steel/);

  const docxBlob = await createContractorEngineerVisitReportDocxBlob(form);
  const signature = new Uint8Array(await docxBlob.arrayBuffer()).slice(0, 2);
  assert.deepEqual([...signature], [0x50, 0x4b]);
  assert.equal(docxBlob.type, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
});
