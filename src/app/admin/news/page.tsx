import { AdminDeskStats } from "@/components/AdminDeskStats";
import { AdminShell } from "@/components/AdminShell";
import { CollectButton } from "@/components/CollectButton";
import { ManualNewsForm } from "@/components/ManualNewsForm";
import { PendingQueueProvider } from "@/components/PendingQueueProvider";
import { ValidationQueue } from "@/components/ValidationQueue";
import {
  getStorageMode,
  listArticlesByStatus,
  listPublishedArticles,
  readStore,
} from "@/lib/store";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "News · Editorial Desk",
};

export default async function AdminNewsPage() {
  const [pending, published, store] = await Promise.all([
    listArticlesByStatus("pending_validation"),
    listPublishedArticles(),
    readStore(),
  ]);
  const storageMode = getStorageMode();

  return (
    <AdminShell
      title="News"
      lede="Find very recent stories of personal triumph, health wins, happy endings, happy families, and new energy — then publish the ones you approve."
      active="news"
      notice={
        <>
          <p className="collect-hint">
            Flow: Search & collect (last 7 days) → edit in the validation queue
            → Approve & publish. Manage outlets on{" "}
            <a href="/admin/sources">Sources</a>.
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
        <ValidationQueue />
      </PendingQueueProvider>
    </AdminShell>
  );
}
