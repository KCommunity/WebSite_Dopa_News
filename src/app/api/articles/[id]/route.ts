import { NextResponse } from "next/server";
import { z } from "zod";
import {
  ensureArticleInStore,
  updateArticleContent,
  updateArticleStatus,
} from "@/lib/store";
import { TAXONOMY } from "@/lib/taxonomy";
import type { Article } from "@/lib/types";

export const dynamic = "force-dynamic";

const categorySlugs = TAXONOMY.map((category) => category.slug) as [
  (typeof TAXONOMY)[number]["slug"],
  ...(typeof TAXONOMY)[number]["slug"][],
];

const sourceSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  url: z
    .string()
    .min(1)
    .refine((value) => /^https?:\/\//i.test(value), "Source URL must start with http(s)"),
  reliability: z.number().min(0).max(1).optional(),
});

const articleSnapshotSchema = z.object({
  id: z.string().min(1),
  slug: z.string().min(1),
  title: z.string().min(1),
  summary: z.string().min(1),
  body: z.string().min(1),
  category: z.enum(categorySlugs),
  status: z.string(),
  sourceId: z.string(),
  sourceName: z.string(),
  sourceUrl: z.string(),
  sources: z.array(sourceSchema).optional(),
  originalLanguage: z.string(),
  country: z.string().optional(),
  keywords: z.array(z.string()),
  impactScore: z.number(),
  credibilityScore: z.number(),
  explainability: z.string(),
  collectedAt: z.string(),
  processedAt: z.string().optional(),
  discoveryMethod: z.enum(["rss", "web_search", "seed", "manual"]).optional(),
  searchQuery: z.string().optional(),
});

const bodySchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("publish"),
    article: articleSnapshotSchema.optional(),
  }),
  z.object({
    action: z.literal("reject"),
    article: articleSnapshotSchema.optional(),
  }),
  z.object({
    action: z.literal("update"),
    title: z.string().min(3).max(240),
    summary: z.string().min(3).max(2000),
    body: z.string().min(3).max(20000),
    category: z.enum(categorySlugs),
    country: z.string().max(120).optional(),
    keywords: z.array(z.string().min(1).max(60)).max(20),
    explainability: z.string().min(3).max(4000),
    impactScore: z.number().min(0).max(100),
    credibilityScore: z.number().min(0).max(100),
    sources: z.array(sourceSchema).min(1).max(12),
    article: articleSnapshotSchema.optional(),
  }),
]);

type Props = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, { params }: Props) {
  const { id } = await params;

  try {
    const json = await request.json();
    const payload = bodySchema.parse(json);

    if (payload.article && payload.article.id === id) {
      await ensureArticleInStore(payload.article as Article);
    }

    if (payload.action === "publish" || payload.action === "reject") {
      const status = payload.action === "publish" ? "published" : "rejected";
      const article = await updateArticleStatus(id, status, {
        validatedBy: "editor",
      });

      if (!article) {
        return NextResponse.json(
          {
            error:
              "Article not found on the server. Search again, or connect Vercel Blob for durable storage.",
          },
          { status: 404 },
        );
      }

      return NextResponse.json({ ok: true, article });
    }

    const article = await updateArticleContent(id, {
      title: payload.title,
      summary: payload.summary,
      body: payload.body,
      category: payload.category,
      country: payload.country,
      keywords: payload.keywords,
      explainability: payload.explainability,
      impactScore: payload.impactScore,
      credibilityScore: payload.credibilityScore,
      sources: payload.sources,
    });

    if (!article) {
      return NextResponse.json(
        {
          error:
            "Article not found on the server. Search again, or connect Vercel Blob for durable storage.",
        },
        { status: 404 },
      );
    }

    return NextResponse.json({ ok: true, article });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid article update", details: error.flatten() },
        { status: 400 },
      );
    }
    console.error(error);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}
