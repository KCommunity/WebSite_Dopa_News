import { AdminActions } from "@/components/AdminActions";
import { CollectButton } from "@/components/CollectButton";
import { formatDate } from "@/lib/format";
import { listArticlesByStatus, listPublishedArticles, readStore } from "@/lib/store";
import { getCategoryName } from "@/lib/taxonomy";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Editorial Desk",
};

export default async function AdminPage() {
  const [pending, published, store] = await Promise.all([
    listArticlesByStatus("pending_validation"),
    listPublishedArticles(),
    readStore(),
  ]);

  return (
    <section className="admin-page">
      <div className="shell">
        <div className="section-head">
          <h1 className="page-title">Editorial desk</h1>
          <p className="lede">
            Hermes prepares candidates. Humans approve publication. Nothing goes
            live without review.
          </p>
        </div>

        <div className="stats-row">
          <div>
            <strong>{pending.length}</strong>
            Pending validation
          </div>
          <div>
            <strong>{published.length}</strong>
            Published
          </div>
          <div>
            <strong>{store.articles.length}</strong>
            In knowledge base
          </div>
        </div>

        <CollectButton />

        <div className="admin-queue" style={{ marginTop: "2.5rem" }}>
          <h2 className="page-title" style={{ fontSize: "1.8rem" }}>
            Validation queue
          </h2>
          {pending.length === 0 ? (
            <p className="empty-state">
              Queue is clear. Run collection to gather new candidates.
            </p>
          ) : (
            pending.map((article) => (
              <article key={article.id} className="admin-item">
                <div className="news-row-meta">
                  <span>{getCategoryName(article.category)}</span>
                  <span>Impact {article.impactScore}</span>
                  <span>Credibility {article.credibilityScore}</span>
                  <span>{formatDate(article.collectedAt)}</span>
                </div>
                <h3>{article.title}</h3>
                <p>{article.summary}</p>
                <p>{article.explainability}</p>
                <p>
                  Source:{" "}
                  <a href={article.sourceUrl} target="_blank" rel="noreferrer">
                    {article.sourceName}
                  </a>
                </p>
                <AdminActions articleId={article.id} />
              </article>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
