import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/** Legacy /admin/news → Add News. */
export default function AdminNewsRedirectPage() {
  redirect("/admin/add");
}
