"use client";

import { usePendingQueue } from "@/components/PendingQueueProvider";

export function AdminDeskStats() {
  const { stats, pending } = usePendingQueue();

  return (
    <div className="stats-row">
      <div>
        <strong>{Math.max(stats.pendingServer, pending.length)}</strong>
        Pending for review
      </div>
      <div>
        <strong>{stats.published}</strong>
        Published
      </div>
      <div>
        <strong>{Math.max(stats.total, stats.published + pending.length)}</strong>
        In knowledge base
      </div>
    </div>
  );
}
