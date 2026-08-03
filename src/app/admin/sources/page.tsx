import { AdminShell } from "@/components/AdminShell";
import { TrustedSourcesPanel } from "@/components/TrustedSourcesPanel";
import { getStorageMode, readStore } from "@/lib/store";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Manage News Source · Editorial Desk",
};

export default async function AdminSourcesPage() {
  const store = await readStore();
  const storageMode = getStorageMode();

  return (
    <AdminShell
      title="Manage News Source"
      lede="Recommend and manage trusted outlets used for RSS collection and search fallback."
      active="sources"
      notice={
        <>
          <p className="collect-hint">
            This page is for sources only. Collect on{" "}
            <a href="/admin/add">Add News</a> and validate on{" "}
            <a href="/admin/review">Review News</a>.
          </p>
          {storageMode === "memory" ? (
            <p className="form-error">
              Durable storage is not configured. Source changes may not persist
              after refresh until Vercel Blob is connected.
            </p>
          ) : null}
        </>
      }
    >
      <TrustedSourcesPanel sources={store.sources} />
    </AdminShell>
  );
}
