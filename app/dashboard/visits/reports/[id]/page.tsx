import { redirect } from "next/navigation";

export default async function VisitReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/dashboard/reports/contractor-engineer/${id}`);
}
