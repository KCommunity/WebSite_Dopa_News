"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import type { Source } from "@/lib/types";

export function TrustedSourcesPanel({ sources }: { sources: Source[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [feedUrl, setFeedUrl] = useState("");
  const [recommendedBy, setRecommendedBy] = useState("");
  const [notes, setNotes] = useState("");
  const [channel, setChannel] = useState<Source["channel"]>("rss");
  const [reliability, setReliability] = useState("0.80");

  async function recommendSource(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch("/api/sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          url,
          feedUrl: feedUrl || undefined,
          recommendedBy: recommendedBy || "editor",
          notes,
          channel,
          reliability: Number(reliability),
          enabled: true,
        }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error || "Could not save source");
      setName("");
      setUrl("");
      setFeedUrl("");
      setRecommendedBy("");
      setNotes("");
      setMessage("Trusted source added.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save source");
    } finally {
      setBusy(false);
    }
  }

  async function toggleEnabled(source: Source) {
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch("/api/sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...source,
          enabled: !(source.enabled ?? true),
        }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error || "Update failed");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Update failed");
    } finally {
      setBusy(false);
    }
  }

  async function removeSource(id: string) {
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/sources?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error || "Delete failed");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Delete failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="trusted-sources">
      <p className="collect-hint">
        Social channels (Instagram, X, Facebook) can be listed here; live
        collection from those networks needs official APIs in a later phase.
      </p>

      <ul className="trusted-source-list">
        {sources.map((source) => (
          <li key={source.id}>
            <div>
              <strong>{source.name}</strong>
              <span>
                {(source.channel || "rss").toUpperCase()} · reliability{" "}
                {Math.round(source.reliability * 100)}% ·{" "}
                {source.enabled === false ? "disabled" : "enabled"}
              </span>
              <a href={source.url} target="_blank" rel="noreferrer">
                {source.url}
              </a>
              {source.feedUrl ? <code>{source.feedUrl}</code> : null}
              {source.recommendedBy ? (
                <em>Recommended by {source.recommendedBy}</em>
              ) : null}
            </div>
            <div className="admin-actions">
              <button
                type="button"
                className="ghost"
                disabled={busy}
                onClick={() => toggleEnabled(source)}
              >
                {source.enabled === false ? "Enable" : "Disable"}
              </button>
              <button
                type="button"
                className="ghost"
                disabled={busy}
                onClick={() => removeSource(source.id)}
              >
                Remove
              </button>
            </div>
          </li>
        ))}
      </ul>

      <form className="admin-edit-form" onSubmit={recommendSource}>
        <strong>Recommend a trusted source</strong>
        <div className="admin-edit-grid">
          <label>
            Name
            <input
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </label>
          <label>
            Website URL
            <input
              required
              type="url"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
            />
          </label>
          <label>
            RSS feed URL (optional)
            <input
              type="url"
              value={feedUrl}
              onChange={(event) => setFeedUrl(event.target.value)}
            />
          </label>
          <label>
            Channel
            <select
              value={channel}
              onChange={(event) =>
                setChannel(event.target.value as Source["channel"])
              }
            >
              <option value="rss">RSS</option>
              <option value="website">Website</option>
              <option value="instagram">Instagram</option>
              <option value="x">X / Twitter</option>
              <option value="facebook">Facebook</option>
              <option value="other">Other</option>
            </select>
          </label>
          <label>
            Reliability (0–1)
            <input
              type="number"
              min={0}
              max={1}
              step={0.01}
              value={reliability}
              onChange={(event) => setReliability(event.target.value)}
            />
          </label>
          <label>
            Recommended by
            <input
              value={recommendedBy}
              onChange={(event) => setRecommendedBy(event.target.value)}
              placeholder="Your name"
            />
          </label>
        </div>
        <label>
          Notes
          <textarea
            rows={2}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
          />
        </label>
        <div className="admin-actions">
          <button type="submit" disabled={busy}>
            {busy ? "Saving…" : "Add to trusted list"}
          </button>
        </div>
      </form>
      {message ? <p className="collect-message">{message}</p> : null}
    </section>
  );
}
