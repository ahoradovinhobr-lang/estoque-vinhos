import { LimitedConsultation } from "@/components/consultation/limited-consultation";
import { PublicShell } from "@/components/layout/public-shell";

type SearchPageProps = {
  searchParams?: Promise<{
    codigo?: string;
    q?: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams;
  const content = (
    <LimitedConsultation code={params?.codigo} query={params?.q} />
  );

  return <PublicShell>{content}</PublicShell>;
}
