import VisitReportDetailPage from "@/components/visit-report-detail-page";

export default async function ContractorEngineerReportDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <VisitReportDetailPage reportId={Number(id)} />;
}
