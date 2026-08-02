"use client";

import { useEffect, useState } from "react";
import { AdminArticleEditor } from "@/components/AdminArticleEditor";
import { formatDate } from "@/lib/format";
import {
  mergeServerAndLocalPending,
  removeFromLocalPendingQueue,
} from "@/lib/pending-queue";
import { getArticleSources } from "@/lib/sources";
import { getCategoryName } from "@/lib/taxonomy";
import type { Article } from "@/lib/types";

export function ValidationQueue({
  serverPending,
}: {
  serverPending: Article[];
}) {
  const [pending, setPending] = useState<Article[]>(serverPending);

  useEffect(() => {
    setPending(mergeServerAndLocalPending(serverPending));

    function onQueueUpdated() {
      setPending(mergeServerAndLocalPending(serverPending));
    }

    window.addEventListener("dopa-pending-updated", onQueueUpdated);
    return () => window.removeEventListener("dopa-pending-updated", onQueueUpdated);
  }, [serverPending]);

  function handleResolved(id: string) {
    removeFromLocalPendingQueue(id);
    setPending((current) => current.filter((article) => article.id !== id));
  }

  return (
    <div className="admin-queue" style={{ marginTop: "2.5rem" }}>
      <h2 className="page-title" style={{ fontSize: "1.8rem" }}>
        Validation queue
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
              onResolved={() => handleResolved(article.id)}
            />
          </article>
        ))
      )}
    </div>
  );
}
