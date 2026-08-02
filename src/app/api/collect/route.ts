import { NextResponse } from "next/server";
import { collectFromSources, DEFAULT_SOURCES } from "@/lib/collection";
import { readStore, writeStore } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
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
      ...result,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Collection failed. Check source feeds and try again." },
      { status: 500 },
    );
  }
}
