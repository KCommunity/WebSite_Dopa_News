import { NextResponse } from "next/server";
import { z } from "zod";
import { createPendingArticle } from "@/lib/store";
import { TAXONOMY } from "@/lib/taxonomy";

export const dynamic = "force-dynamic";

const categorySlugs = TAXONOMY.map((category) => category.slug) as [
  (typeof TAXONOMY)[number]["slug"],
  ...(typeof TAXONOMY)[number]["slug"][],
];

const bodySchema = z.object({
  title: z.string().min(5).max(240),
  summary: z.string().min(20).max(2000),
  body: z.string().max(20000).optional(),
  category: z.enum(categorySlugs),
  country: z.string().max(120).optional(),
  sourceName: z.string().min(2).max(160),
  sourceUrl: z
    .string()
    .min(1)
    .refine((value) => /^https?:\/\//i.test(value), "Source URL must start with http(s)"),
  keywords: z.string().max(400).optional(),
});

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const payload = bodySchema.parse(json);
    const article = await createPendingArticle({
      title: payload.title,
      summary: payload.summary,
      body: payload.body,
      category: payload.category,
      country: payload.country,
      sourceName: payload.sourceName,
      sourceUrl: payload.sourceUrl,
      keywords: payload.keywords
        ?.split(",")
        .map((keyword) => keyword.trim())
        .filter(Boolean),
    });

    return NextResponse.json({ ok: true, article });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid news submission", details: error.flatten() },
        { status: 400 },
      );
    }
    const detail = error instanceof Error ? error.message : "Could not add news";
    return NextResponse.json({ error: detail }, { status: 500 });
  }
}
