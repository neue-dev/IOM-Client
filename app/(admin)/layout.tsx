import { QueryProvider } from "@/app/providers/query-provider";
import { AdminProfileProvider } from "@/app/providers/admin-profile.provider";
import { PortalDocumentTitle } from "@/components/portal-document-title";
import { AdminHeader } from "./admin-header";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <QueryProvider>
      <AdminProfileProvider>
        <PortalDocumentTitle portal="Platform Admin" />
        <div className="flex min-h-screen flex-col">
          <AdminHeader />
          {children}
        </div>
      </AdminProfileProvider>
    </QueryProvider>
  );
}
