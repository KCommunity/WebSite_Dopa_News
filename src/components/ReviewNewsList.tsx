"use client";

import Link from "next/link";
import { useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AdminArticleEditor } from "@/components/AdminArticleEditor";
import { usePendingQueue } from "@/components/PendingQueueProvider";
import { formatDate } from "@/lib/format";
import { getArticleSources } from "@/lib/sources";
import { getCategoryName } from "@/lib/taxonomy";
import type { Article } from "@/lib/types";

const PAGE_SIZE = 10;

function statusLabel(status: Article["status"]): string {
  if (status === "pending_validation") return "Pending validation";
  if (status === "published") return "Published";
  if (status === "rejected") return "Rejected";
  return status.replaceAll("_", " ");
}

export function ReviewNewsList({ serverArticles }: { serverArticles: Article[] }) {
  const { pending, resolvePending } = usePendingQueue();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const pageParam = Number(searchParams.get("page") || "1");
  const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;

  const articles = useMemo(() => {
    const byId = new Map<string, Article>();
    for (const article of serverArticles) {
      byId.set(article.id, article);
    }
    // Session-collected pending items that the server may not have persisted yet.
    for (const article of pending) {
      if (!byId.has(article.id)) {
        byId.set(article.id, article);
      }
    }

    const rank = (status: Article["status"]) => {
      if (status === "pending_validation") return 0;
      if (status === "published") return 1;
      if (status === "rejected") return 3;
      return 2;
    };

    return [...byId.values()].sort((a, b) => {
      const byStatus = rank(a.status) - rank(b.status);
      if (byStatus !== 0) return byStatus;
      return b.collectedAt.localeCompare(a.collectedAt);
    });
  }, [serverArticles, pending]);

  const pendingCount = articles.filter(
    (article) => article.status === "pending_validation",
  ).length;
  const totalPages = Math.max(1, Math.ceil(articles.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * PAGE_SIZE;
  const pageItems = articles.slice(start, start + PAGE_SIZE);

  function goToPage(next: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(next));
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="admin-queue">
      <div className="section-head" style={{ marginBottom: "1.25rem" }}>
        <h2 className="page-title" style={{ fontSize: "1.8rem" }}>
          All news ({articles.length})
        </h2>
        <p className="collect-hint">
          {pendingCount} pending validation
          {pendingCount > 0 ? " — shown first." : "."} {PAGE_SIZE} news per
          page.
        </p>
      </div>

      {articles.length === 0 ? (
        <p className="empty-state">
          No news yet.{" "}
          <Link href="/admin/add">Add News</Link> to search or submit a story.
        </p>
      ) : (
        pageItems.map((article) => {
          const isPending = article.status === "pending_validation";
          return (
            <article
              key={article.id}
              className={
                isPending ? "admin-item admin-item-pending" : "admin-item"
              }
            >
              <div className="news-row-meta">
                <span className={isPending ? "status-pill pending" : "status-pill"}>
                  {statusLabel(article.status)}
                </span>
                <span>{getCategoryName(article.category)}</span>
                <span>Impact {article.impactScore}</span>
                <span>Credibility {article.credibilityScore}</span>
                <span>{getArticleSources(article).length} source(s)</span>
                <span>{formatDate(article.collectedAt)}</span>
                {article.country ? <span>{article.country}</span> : null}
                {article.discoveryMethod === "web_search" ? (
                  <span>Web search</span>
                ) : null}
                {article.discoveryMethod === "manual" ? <span>Manual</span> : null}
                {article.discoveryMethod === "rss" ? <span>RSS</span> : null}
              </div>
              <h3>{article.title}</h3>
              <p>{article.summary}</p>
              {article.explainability ? <p>{article.explainability}</p> : null}
              {article.searchQuery ? (
                <p className="collect-hint">Query: {article.searchQuery}</p>
              ) : null}
              {isPending ? (
                <AdminArticleEditor
                  article={article}
                  onResolved={(outcome) => resolvePending(article.id, outcome)}
                />
              ) : article.status === "published" && article.slug ? (
                <p className="collect-hint">
                  Live at{" "}
                  <a href={`/news/${article.slug}`} target="_blank" rel="noreferrer">
                    /news/{article.slug}
                  </a>
                </p>
              ) : null}
            </article>
          );
        })
      )}

      {articles.length > PAGE_SIZE ? (
        <div className="admin-pagination" role="navigation" aria-label="News pages">
          <button
            type="button"
            className="ghost"
            disabled={safePage <= 1}
            onClick={() => goToPage(safePage - 1)}
          >
            Previous
          </button>
          <span>
            Page {safePage} of {totalPages}
          </span>
          <button
            type="button"
            className="ghost"
            disabled={safePage >= totalPages}
            onClick={() => goToPage(safePage + 1)}
          >
            Next
          </button>
        </div>
      ) : null}
    </div>
  );
}
