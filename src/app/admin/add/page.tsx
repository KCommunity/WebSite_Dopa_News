import { AdminDeskStats } from "@/components/AdminDeskStats";
import { AdminShell } from "@/components/AdminShell";
import { CollectButton } from "@/components/CollectButton";
import { ManualNewsForm } from "@/components/ManualNewsForm";
import { PendingQueueProvider } from "@/components/PendingQueueProvider";
import {
  getStorageMode,
  listArticlesByStatus,
  listPublishedArticles,
  readStore,
} from "@/lib/store";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Add News · Editorial Desk",
};

export default async function AdminAddNewsPage() {
  const [pending, published, store] = await Promise.all([
    listArticlesByStatus("pending_validation"),
    listPublishedArticles(),
    readStore(),
  ]);
  const storageMode = getStorageMode();

  return (
    <AdminShell
      title="Add News"
      lede="Search the internet for very recent stories, run RSS collection, or submit a tip manually. Review and publish on Review News."
      active="add"
      notice={
        <>
          <p className="collect-hint">
            Focus: personal triumph, health wins, happy endings, happy families,
            and new energy (last 7 days). After collecting, open{" "}
            <a href="/admin/review">Review News</a> to validate.
          </p>
          {storageMode === "memory" ? (
            <p className="form-error">
              Server storage is temporary on this host. For permanent storage:
              Vercel → Storage → Blob → connect this project → redeploy.
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
        <CollectButton />
        <div style={{ marginTop: "3rem" }}>
          <ManualNewsForm />
        </div>
        <p className="collect-hint" style={{ marginTop: "2rem" }}>
          Collected items appear in your session and on{" "}
          <a href="/admin/review">Review News</a> for validation.
        </p>
      </PendingQueueProvider>
    </AdminShell>
  );
}
