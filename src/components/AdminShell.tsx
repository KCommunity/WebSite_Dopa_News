import { AdminNav, type AdminSection } from "@/components/AdminNav";

export function AdminShell({
  title,
  lede,
  active,
  children,
  notice,
}: {
  title: string;
  lede: string;
  active: AdminSection;
  children: React.ReactNode;
  notice?: React.ReactNode;
}) {
  return (
    <section className="admin-page">
      <div className="shell">
        <AdminNav active={active} />
        <div className="section-head">
          <p className="admin-kicker">Editorial desk</p>
          <h1 className="page-title">{title}</h1>
          <p className="lede">{lede}</p>
          {notice}
        </div>
        {children}
      </div>
    </section>
  );
}
