import VisitReportDetailPage from "@/components/visit-report-detail-page";

export default async function VisitReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <VisitReportDetailPage reportId={Number(id)} />;
}
