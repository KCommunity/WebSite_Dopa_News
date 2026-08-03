"use client";

import { AdminArticleEditor } from "@/components/AdminArticleEditor";
import { usePendingQueue } from "@/components/PendingQueueProvider";
import { formatDate } from "@/lib/format";
import { getArticleSources } from "@/lib/sources";
import { getCategoryName } from "@/lib/taxonomy";

export function ValidationQueue() {
  const { pending, resolvePending } = usePendingQueue();


  return (
    <div className="admin-queue" style={{ marginTop: "2.5rem" }}>
      <h2 className="page-title" style={{ fontSize: "1.8rem" }}>
        Validation queue ({pending.length})
      </h2>
      {pending.length === 0 ? (
        <p className="empty-state">
          Queue is clear. Run collection, internet search, or add a story
          manually.
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
              {article.discoveryMethod === "manual" ? <span>Manual</span> : null}
              {article.discoveryMethod === "rss" ? <span>RSS</span> : null}
            </div>
            <h3>{article.title}</h3>
            <p>{article.summary}</p>
            <p>{article.explainability}</p>
            {article.searchQuery ? (
              <p className="collect-hint">Query: {article.searchQuery}</p>
            ) : null}
            <AdminArticleEditor
              article={article}
              onResolved={(outcome) => resolvePending(article.id, outcome)}
            />
          </article>
        ))
      )}
    </div>
  );
}
