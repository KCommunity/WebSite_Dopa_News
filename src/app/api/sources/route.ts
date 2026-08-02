import { NextResponse } from "next/server";
import { z } from "zod";
import {
  deleteTrustedSource,
  listTrustedSources,
  upsertTrustedSource,
} from "@/lib/store";

export const dynamic = "force-dynamic";

const sourceSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2).max(120),
  url: z.string().url(),
  feedUrl: z.string().url().optional().or(z.literal("")),
  reliability: z.number().min(0).max(1).default(0.8),
  notes: z.string().max(500).optional(),
  enabled: z.boolean().optional(),
  recommendedBy: z.string().max(120).optional(),
  channel: z
    .enum(["rss", "website", "instagram", "x", "facebook", "other"])
    .optional(),
});

export async function GET() {
  const sources = await listTrustedSources();
  return NextResponse.json({ sources });
}

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const payload = sourceSchema.parse(json);
    const source = await upsertTrustedSource({
      ...payload,
      feedUrl: payload.feedUrl || undefined,
      channel: payload.channel || "rss",
      enabled: payload.enabled ?? true,
    });
    return NextResponse.json({ ok: true, source });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid source" }, { status: 400 });
    }
    const detail = error instanceof Error ? error.message : "Save failed";
    return NextResponse.json({ error: detail }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Missing source id" }, { status: 400 });
    }
    const ok = await deleteTrustedSource(id);
    if (!ok) {
      return NextResponse.json({ error: "Source not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Delete failed";
    return NextResponse.json({ error: detail }, { status: 500 });
  }
}
