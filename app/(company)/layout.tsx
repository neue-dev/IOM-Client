import { QueryProvider } from "@/app/providers/query-provider";
import { CompanyProfileProvider } from "@/app/providers/company-profile.provider";
import { CompanyHeader } from "./company-header";

export default function CompanyLayout({ children }: { children: React.ReactNode }) {
  return (
    <QueryProvider>
      <CompanyProfileProvider>
        <div className="flex min-h-screen flex-col">
          <CompanyHeader />
          {children}
        </div>
      </CompanyProfileProvider>
    </QueryProvider>
  );
}
