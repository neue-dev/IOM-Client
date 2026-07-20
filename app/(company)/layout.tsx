import { CompanyProfileProvider } from "@/app/providers/company-profile.provider";
import { PortalDocumentTitle } from "@/components/portal-document-title";
import { CompanyHeader } from "./company-header";

export default function CompanyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <CompanyProfileProvider>
      <PortalDocumentTitle portal="Company" />
      <div className="flex min-h-screen flex-col">
        <CompanyHeader />
        {children}
      </div>
    </CompanyProfileProvider>
  );
}
