"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function CollectButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function collect() {
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch("/api/collect", { method: "POST" });
      const payload = (await response.json()) as {
        error?: string;
        fetched?: number;
        accepted?: number;
        added?: number;
      };
      if (!response.ok) throw new Error(payload.error || "Collection failed");
      setMessage(
        `Fetched ${payload.fetched}, accepted ${payload.accepted}, added ${payload.added}.`,
      );
      router.refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Collection failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="collect-panel">
      <button type="button" disabled={busy} onClick={collect}>
        {busy ? "Collecting…" : "Run daily collection"}
      </button>
      {message ? <p>{message}</p> : null}
    </div>
  );
}
