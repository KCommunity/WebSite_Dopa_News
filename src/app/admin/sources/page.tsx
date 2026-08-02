import { AdminShell } from "@/components/AdminShell";
import { TrustedSourcesPanel } from "@/components/TrustedSourcesPanel";
import { getStorageMode, readStore } from "@/lib/store";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Sources · Editorial Desk",
};

export default async function AdminSourcesPage() {
  const store = await readStore();
  const storageMode = getStorageMode();

  return (
    <AdminShell
      title="Sources"
      lede="Recommend and manage trusted outlets used for RSS collection and search fallback. News review is on a separate page."
      active="sources"
      notice={
        <>
          <p className="collect-hint">
            This page is for trusted sources only. Review news on the{" "}
            <a href="/admin/news">News</a> page.
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
