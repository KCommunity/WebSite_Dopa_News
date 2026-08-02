import { NextResponse } from "next/server";
import { searchArticles } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? "";
  const results = await searchArticles(q);
  return NextResponse.json({ q, count: results.length, results });
}
