import { NewsList } from "@/components/NewsList";
import { listPublishedArticles } from "@/lib/store";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Latest News",
};

export default async function NewsPage() {
  const articles = await listPublishedArticles();

  return (
    <section className="page-block">
      <div className="shell">
        <div className="section-head">
          <h1 className="page-title">Latest good news</h1>
          <p className="lede">
            Published stories that cleared editorial review. Impact over noise.
          </p>
        </div>
        <NewsList articles={articles} />
      </div>
    </section>
  );
}
