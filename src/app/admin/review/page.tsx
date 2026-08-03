import { Suspense } from "react";
import { AdminDeskStats } from "@/components/AdminDeskStats";
import { AdminShell } from "@/components/AdminShell";
import { PendingQueueProvider } from "@/components/PendingQueueProvider";
import { ReviewNewsList } from "@/components/ReviewNewsList";
import {
  getStorageMode,
  listAllArticlesForReview,
  listArticlesByStatus,
  listPublishedArticles,
  readStore,
} from "@/lib/store";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Review News · Editorial Desk",
};

export default async function AdminReviewNewsPage() {
  const [articles, pending, published, store] = await Promise.all([
    listAllArticlesForReview(),
    listArticlesByStatus("pending_validation"),
    listPublishedArticles(),
    readStore(),
  ]);
  const storageMode = getStorageMode();

  return (
    <AdminShell
      title="Review News"
      lede="All news in the knowledge base. Pending validation items are listed first. Approve, reject, or open published stories."
      active="review"
      notice={
        <>
          <p className="collect-hint">
            Showing up to 10 news items per page. Add more from{" "}
            <a href="/admin/add">Add News</a>.
          </p>
          {storageMode === "memory" ? (
            <p className="form-error">
              Server storage is temporary on this host. Rejected or published
              changes may not persist until Vercel Blob is connected.
            </p>
          ) : null}
        </>
      }
    >
      <PendingQueueProvider
        serverPending={pending}
        publishedCount={published.length}
        totalCount={store.articles.length}
      >
        <AdminDeskStats />
        <Suspense fallback={<p className="collect-hint">Loading news…</p>}>
          <ReviewNewsList serverArticles={articles} />
        </Suspense>
      </PendingQueueProvider>
    </AdminShell>
  );
}
