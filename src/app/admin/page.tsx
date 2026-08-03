import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/** Keep /admin as entry point. */
export default function AdminIndexPage() {
  redirect("/admin/add");
}
