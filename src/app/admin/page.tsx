import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/** Keep /admin as entry point; news lives on its own page. */
export default function AdminIndexPage() {
  redirect("/admin/news");
}
