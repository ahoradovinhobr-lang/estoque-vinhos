import { AppShell } from "@/components/layout/app-shell";

type ModulePlaceholderProps = {
  eyebrow: string;
  title: string;
  description: string;
};

export function ModulePlaceholder({
  eyebrow,
  title,
  description
}: ModulePlaceholderProps) {
  return (
    <AppShell>
      <header className="mb-6 border-b border-stone-200 pb-5">
        <p className="text-sm font-medium text-cellar">{eyebrow}</p>
        <h2 className="mt-1 text-2xl font-semibold text-ink">{title}</h2>
      </header>

      <section className="rounded-md border border-stone-200 bg-white px-4 py-10 text-center text-sm text-stone-500">
        {description}
      </section>
    </AppShell>
  );
}
