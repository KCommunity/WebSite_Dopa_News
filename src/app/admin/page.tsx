import { AdminNav } from "@/components/AdminNav";
import { CollectButton } from "@/components/CollectButton";
import { ManualNewsForm } from "@/components/ManualNewsForm";
import { ValidationQueue } from "@/components/ValidationQueue";
import {
  getStorageMode,
  listArticlesByStatus,
  listPublishedArticles,
  readStore,
} from "@/lib/store";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Editorial Desk · News",
};

export default async function AdminNewsPage() {
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
            Collect, review, and publish good news. AI assistants prepare
            candidates — humans approve.
          </p>
          <AdminNav active="news" />
          <p className="collect-hint">
            News are not collected automatically every day yet. Use RSS
            collection, internet search, or add a story manually below.
          </p>
          {storageMode === "memory" ? (
            <p className="form-error">
              Durable storage is not configured on this host. Search results are
              kept in your browser session for this visit. For permanent storage
              on Vercel: Storage → create Blob → connect to this project, then
              redeploy.
            </p>
          ) : null}
        </div>

        <div className="stats-row">
          <div>
            <strong>{pending.length}</strong>
            Pending on server
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

        <ValidationQueue serverPending={pending} />
      </div>
    </section>
  );
}
