import { NextResponse } from "next/server";
import { z } from "zod";
import {
  collectFromSources,
  collectFromWebSearch,
  DEFAULT_SOURCES,
} from "@/lib/collection";
import { readStore, writeStore } from "@/lib/store";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  mode: z.enum(["rss", "web"]).default("rss"),
  query: z.string().trim().max(200).optional(),
});

export async function POST(request: Request) {
  try {
    const json = await request.json().catch(() => ({}));
    const { mode, query } = bodySchema.parse(json);

    if (mode === "web") {
      if (!query) {
        return NextResponse.json(
          { error: "Enter a search query for internet search." },
          { status: 400 },
        );
      }
      const result = await collectFromWebSearch(query);
      return NextResponse.json({ ok: true, mode, ...result });
    }

    const store = await readStore();
    if (store.sources.length === 0) {
      store.sources = DEFAULT_SOURCES;
      await writeStore(store);
    }

    const result = await collectFromSources(
      store.sources.length ? store.sources : DEFAULT_SOURCES,
    );

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
    return NextResponse.json(
      { error: "Collection failed. Check feeds or search query and try again." },
      { status: 500 },
    );
  }
}
