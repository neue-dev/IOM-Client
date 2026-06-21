"use client";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useCompanyProfile } from "@/app/providers/company-profile.provider";
import { preconfiguredAxios } from "@/app/api/preconfig.axios";
import { PageContainer, PageHeader, EmptyState } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { MoaStatusBadge } from "@/components/status-badge";
import { formatDateWithoutTime } from "@/lib/utils";
import { AlertTriangle, ChevronRight, Plus } from "lucide-react";

interface Moa {
  id: string;
  status: "active" | "rejected";
  is_expired: boolean | null;
  effective_date: string;
  expiry_date: string;
  rejection_reason: string | null;
  university: { id: string; registered_name: string; logo_url: string | null };
}

function MoaRow({ moa }: { moa: Moa }) {
  return (
    <Link href={`/company/moas/${moa.id}`} className="block">
      <Card className="flex-row items-center justify-between gap-3 px-5 py-4 transition-colors hover:bg-gray-50">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-gray-900">
            {moa.university.registered_name}
          </p>
          <p className="text-muted-foreground mt-0.5 text-xs">
            {formatDateWithoutTime(moa.effective_date)} &ndash;{" "}
            {formatDateWithoutTime(moa.expiry_date)}
          </p>
          {moa.status === "rejected" && moa.rejection_reason && (
            <p className="text-destructive mt-1 text-xs">{moa.rejection_reason}</p>
          )}
        </div>
        <div className="flex flex-shrink-0 items-center gap-3">
          <MoaStatusBadge status={moa.status} isExpired={moa.is_expired} />
          <ChevronRight className="text-muted-foreground h-4 w-4" />
        </div>
      </Card>
    </Link>
  );
}

function MoaSection({ title, items }: { title: string; items: Moa[] }) {
  if (items.length === 0) return null;
  return (
    <section className="space-y-3">
      <h2 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
        {title} ({items.length})
      </h2>
      <div className="space-y-2.5">
        {items.map((m) => (
          <MoaRow key={m.id} moa={m} />
        ))}
      </div>
    </section>
  );
}

export default function CompanyDashboardPage() {
  const { company, isLoading } = useCompanyProfile();

  const { data: moasData, isLoading: moasLoading } = useQuery({
    queryKey: ["company-moas"],
    queryFn: () =>
      preconfiguredAxios.get("/api/company/moas?limit=100").then((r) => r.data),
    enabled: !!company,
  });

  if (isLoading) {
    return (
      <PageContainer className="space-y-8">
        <Skeleton className="h-8 w-56" />
        <div className="space-y-2.5">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      </PageContainer>
    );
  }
  if (!company) return null;

  const moas: Moa[] = moasData?.moas ?? [];
  const active = moas.filter((m) => m.status === "active" && !m.is_expired);
  const rejected = moas.filter((m) => m.status === "rejected");
  const expired = moas.filter((m) => m.is_expired);

  const profileComplete = !!(
    company.registered_name &&
    company.company_type &&
    company.registered_address &&
    company.rep_name &&
    company.rep_title
  );

  return (
    <PageContainer className="space-y-8">
      <PageHeader
        title={company.display_name}
        description="Your memoranda of agreement with partner universities."
      >
        <Button asChild>
          <Link href="/company/universities">
            <Plus /> Request MOA
          </Link>
        </Button>
      </PageHeader>

      {!profileComplete && (
        <div className="border-warning/30 bg-warning/10 flex items-start gap-3 rounded-[0.33em] border p-4 text-sm">
          <AlertTriangle className="text-warning mt-0.5 h-4 w-4 flex-shrink-0" />
          <p className="text-gray-700">
            Complete your profile and upload all four required documents before you
            can request MOAs.{" "}
            <Link href="/company/profile" className="text-primary font-medium">
              Complete profile
            </Link>
          </p>
        </div>
      )}

      {moasLoading ? (
        <div className="space-y-2.5">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : moas.length === 0 ? (
        <EmptyState
          title="No MOAs yet"
          description="Browse partner universities and request your first memorandum of agreement."
        >
          <Button asChild variant="outline" scheme="primary">
            <Link href="/company/universities">Browse universities</Link>
          </Button>
        </EmptyState>
      ) : (
        <div className="space-y-8">
          <MoaSection title="Active" items={active} />
          <MoaSection title="Rejected" items={rejected} />
          <MoaSection title="Expired" items={expired} />
        </div>
      )}
    </PageContainer>
  );
}
