import { NewsList } from "@/components/NewsList";
import { SearchForm } from "@/components/SearchForm";
import { searchArticles } from "@/lib/store";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Search",
};

type Props = {
  searchParams: Promise<{ q?: string }>;
};

export default async function SearchPage({ searchParams }: Props) {
  const { q = "" } = await searchParams;
  const results = q ? await searchArticles(q) : [];

  return (
    <section className="page-block">
      <div className="shell">
        <div className="section-head">
          <h1 className="page-title">Search</h1>
          <p className="lede">Find published stories by topic, place, or keyword.</p>
        </div>
        <SearchForm initialQuery={q} />
        {q ? (
          <>
            <p className="lede">
              {results.length} result{results.length === 1 ? "" : "s"} for “{q}”
            </p>
            <NewsList articles={results} />
          </>
        ) : (
          <p className="empty-state">Enter a term to search the published archive.</p>
        )}
      </div>
    </section>
  );
}
