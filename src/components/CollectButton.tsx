"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function CollectButton() {
  const router = useRouter();
  const [busy, setBusy] = useState<"rss" | "web" | null>(null);
  const [query, setQuery] = useState("medical breakthrough OR solar microgrid OR wildlife recovery");
  const [message, setMessage] = useState<string | null>(null);

  async function collectRss() {
    setBusy("rss");
    setMessage(null);
    try {
      const response = await fetch("/api/collect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "rss" }),
      });
      const payload = (await response.json()) as {
        error?: string;
        fetched?: number;
        accepted?: number;
        added?: number;
        merged?: number;
      };
      if (!response.ok) throw new Error(payload.error || "Collection failed");
      setMessage(
        `RSS: fetched ${payload.fetched}, accepted ${payload.accepted}, added ${payload.added}, merged sources on ${payload.merged}.`,
      );
      router.refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Collection failed");
    } finally {
      setBusy(null);
    }
  }

  async function collectWeb(event: FormEvent) {
    event.preventDefault();
    setBusy("web");
    setMessage(null);
    try {
      const response = await fetch("/api/collect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "web", query }),
      });
      const payload = (await response.json()) as {
        error?: string;
        fetched?: number;
        accepted?: number;
        added?: number;
        merged?: number;
        query?: string;
      };
      if (!response.ok) throw new Error(payload.error || "Internet search failed");
      setMessage(
        `Web search “${payload.query}”: fetched ${payload.fetched}, accepted ${payload.accepted}, added ${payload.added}, merged sources on ${payload.merged}.`,
      );
      router.refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Internet search failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="collect-panel">
      <div className="collect-actions">
        <button type="button" disabled={busy !== null} onClick={collectRss}>
          {busy === "rss" ? "Collecting…" : "Run RSS collection"}
        </button>
      </div>

      <form className="web-search-form" onSubmit={collectWeb}>
        <label htmlFor="web-query">Internet search</label>
        <div className="web-search-row">
          <input
            id="web-query"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search the web for good news…"
            disabled={busy !== null}
          />
          <button type="submit" disabled={busy !== null || !query.trim()}>
            {busy === "web" ? "Searching…" : "Search & collect"}
          </button>
        </div>
        <p className="collect-hint">
          Searches Google News, filters for positive progress, and adds candidates
          to the validation queue. Matching stories merge extra sources.
        </p>
      </form>

      {message ? <p className="collect-message">{message}</p> : null}
    </div>
  );
}
