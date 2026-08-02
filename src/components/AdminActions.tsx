"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function AdminActions({ articleId }: { articleId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function act(action: "publish" | "reject") {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/articles/${articleId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error || "Action failed");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="admin-actions">
      <button type="button" disabled={busy} onClick={() => act("publish")}>
        Approve & publish
      </button>
      <button
        type="button"
        className="ghost"
        disabled={busy}
        onClick={() => act("reject")}
      >
        Reject
      </button>
      {error ? <p className="form-error">{error}</p> : null}
    </div>
  );
}
