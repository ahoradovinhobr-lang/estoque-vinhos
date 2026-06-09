import { redirect } from "next/navigation";

type SearchPageProps = {
  searchParams?: Promise<{
    q?: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams;
  const query = String(params?.q ?? "").trim();

  redirect(query ? `/leitura?q=${encodeURIComponent(query)}` : "/leitura");
}
