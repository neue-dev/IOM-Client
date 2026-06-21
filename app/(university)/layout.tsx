import { QueryProvider } from "@/app/providers/query-provider";
import { UniversityProfileProvider } from "@/app/providers/university-profile.provider";
import { UniversityHeader } from "./university-header";

export default function UniversityLayout({ children }: { children: React.ReactNode }) {
  return (
    <QueryProvider>
      <UniversityProfileProvider>
        <div className="flex min-h-screen flex-col">
          <UniversityHeader />
          {children}
        </div>
      </UniversityProfileProvider>
    </QueryProvider>
  );
}
