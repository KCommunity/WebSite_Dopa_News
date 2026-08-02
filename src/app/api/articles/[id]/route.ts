import { NextResponse } from "next/server";
import { z } from "zod";
import { updateArticleStatus } from "@/lib/store";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  action: z.enum(["publish", "reject"]),
});

type Props = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, { params }: Props) {
  const { id } = await params;

  try {
    const json = await request.json();
    const { action } = bodySchema.parse(json);
    const status = action === "publish" ? "published" : "rejected";
    const article = await updateArticleStatus(id, status, {
      validatedBy: "editor",
    });

    if (!article) {
      return NextResponse.json({ error: "Article not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, article });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
    console.error(error);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}
