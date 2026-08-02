import { AdminArticleEditor } from "@/components/AdminArticleEditor";
import { CollectButton } from "@/components/CollectButton";
import { ManualNewsForm } from "@/components/ManualNewsForm";
import { TrustedSourcesPanel } from "@/components/TrustedSourcesPanel";
import { formatDate } from "@/lib/format";
import { getArticleSources } from "@/lib/sources";
import {
  getStorageMode,
  listArticlesByStatus,
  listPublishedArticles,
  readStore,
} from "@/lib/store";
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
  const storageMode = getStorageMode();

  return (
    <section className="admin-page">
      <div className="shell">
        <div className="section-head">
          <h1 className="page-title">Editorial desk</h1>
          <p className="lede">
            AI assistants prepare candidates. Humans edit, check sources, and
            approve publication. Nothing goes live without review.
          </p>
          <p className="collect-hint">
            News are not collected automatically every day yet. Use RSS
            collection, internet search, or add a story manually below.
          </p>
          {storageMode === "memory" ? (
            <p className="form-error">
              Durable storage is not configured on this host. Collected news may
              disappear after refresh. In Vercel: Storage → create Blob → connect
              to this project (adds BLOB_READ_WRITE_TOKEN), then redeploy.
            </p>
          ) : null}
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

        <div style={{ marginTop: "3rem" }}>
          <ManualNewsForm />
        </div>

        <div style={{ marginTop: "3rem" }}>
          <TrustedSourcesPanel sources={store.sources} />
        </div>

        <div className="admin-queue" style={{ marginTop: "2.5rem" }}>
          <h2 className="page-title" style={{ fontSize: "1.8rem" }}>
            Validation queue
          </h2>
          {pending.length === 0 ? (
            <p className="empty-state">
              Queue is clear. Run collection or internet search to gather new
              candidates.
            </p>
          ) : (
            pending.map((article) => (
              <article key={article.id} className="admin-item">
                <div className="news-row-meta">
                  <span>{getCategoryName(article.category)}</span>
                  <span>Impact {article.impactScore}</span>
                  <span>Credibility {article.credibilityScore}</span>
                  <span>{getArticleSources(article).length} source(s)</span>
                  <span>{formatDate(article.collectedAt)}</span>
                  {article.discoveryMethod === "web_search" ? (
                    <span>Web search</span>
                  ) : null}
                  {article.discoveryMethod === "manual" ? (
                    <span>Manual</span>
                  ) : null}
                </div>
                <h3>{article.title}</h3>
                <p>{article.summary}</p>
                <p>{article.explainability}</p>
                {article.searchQuery ? (
                  <p className="collect-hint">Query: {article.searchQuery}</p>
                ) : null}
                <AdminArticleEditor article={article} />
              </article>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
