import { NextResponse } from "next/server";
import { z } from "zod";
import {
  collectFromSources,
  collectFromWebSearch,
  DEFAULT_SOURCES,
} from "@/lib/collection";
import { FOCUS_REGIONS } from "@/lib/regions";
import { readStore, writeStore } from "@/lib/store";

export const dynamic = "force-dynamic";

const regionIds = FOCUS_REGIONS.map((region) => region.id) as [
  (typeof FOCUS_REGIONS)[number]["id"],
  ...(typeof FOCUS_REGIONS)[number]["id"][],
];

const bodySchema = z.object({
  mode: z.enum(["rss", "web"]).default("rss"),
  query: z.string().trim().max(200).optional(),
  regions: z.array(z.enum(regionIds)).max(5).optional(),
});

export async function POST(request: Request) {
  try {
    const json = await request.json().catch(() => ({}));
    const { mode, query, regions } = bodySchema.parse(json);

    if (mode === "web") {
      const result = await collectFromWebSearch(query || "", regions);
      return NextResponse.json({ ok: true, mode, ...result });
    }

    const store = await readStore();
    if (store.sources.length === 0) {
      store.sources = DEFAULT_SOURCES;
      await writeStore(store);
    }

    const activeSources = (store.sources.length ? store.sources : DEFAULT_SOURCES).filter(
      (source) => source.enabled !== false,
    );

    const result = await collectFromSources(activeSources);

    return NextResponse.json({
      ok: true,
      mode: "rss",
      ...result,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid collection request" }, { status: 400 });
    }
    console.error(error);
    const detail =
      error instanceof Error ? error.message : "Unknown collection error";
    return NextResponse.json(
      {
        error: `Collection failed: ${detail}`,
      },
      { status: 500 },
    );
  }
}
