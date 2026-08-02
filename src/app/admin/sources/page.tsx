import { AdminNav } from "@/components/AdminNav";
import { TrustedSourcesPanel } from "@/components/TrustedSourcesPanel";
import { getStorageMode, readStore } from "@/lib/store";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Editorial Desk · Sources",
};

export default async function AdminSourcesPage() {
  const store = await readStore();
  const storageMode = getStorageMode();

  return (
    <section className="admin-page">
      <div className="shell">
        <div className="section-head">
          <h1 className="page-title">Editorial desk</h1>
          <p className="lede">
            Recommend and manage trusted outlets used for RSS collection and
            search fallback.
          </p>
          <AdminNav active="sources" />
          {storageMode === "memory" ? (
            <p className="form-error">
              Durable storage is not configured. Source changes may not persist
              after refresh until Vercel Blob is connected.
            </p>
          ) : null}
        </div>

        <TrustedSourcesPanel sources={store.sources} />
      </div>
    </section>
  );
}
