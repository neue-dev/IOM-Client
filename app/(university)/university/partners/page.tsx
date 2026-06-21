"use client";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useUniversityProfile } from "@/app/providers/university-profile.provider";
import { preconfiguredAxios } from "@/app/api/preconfig.axios";
import { PageContainer, PageHeader, EmptyState } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2, ChevronRight } from "lucide-react";

interface Partner {
  company: {
    id: string;
    display_name: string;
    registered_name: string | null;
    company_type: string | null;
  };
  latestMoaId: string;
  detailsChanged: boolean;
}

export default function PartnersPage() {
  const { account, isLoading } = useUniversityProfile();

  const { data, isLoading: pLoading } = useQuery({
    queryKey: ["university-partners"],
    queryFn: () =>
      preconfiguredAxios
        .get("/api/university/partners")
        .then((r) => r.data as { partners: Partner[] }),
    enabled: !!account,
  });

  if (isLoading) return null;
  if (!account) return null;

  const partners = data?.partners ?? [];

  return (
    <PageContainer className="space-y-6">
      <PageHeader
        title="Partner companies"
        description="Companies with active memoranda of agreement."
      />

      {pLoading ? (
        <div className="space-y-2.5">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : partners.length === 0 ? (
        <EmptyState
          title="No active partners yet"
          description="Confirmed MOAs will list the partner company here."
        />
      ) : (
        <div className="space-y-2.5">
          {partners.map(({ company, latestMoaId, detailsChanged }) => (
            <Link
              key={company.id}
              href={`/university/moas/${latestMoaId}`}
              className="block"
            >
              <Card className="flex-row items-center justify-between gap-3 px-5 py-4 transition-colors hover:bg-gray-50">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="bg-muted text-muted-foreground flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[0.33em]">
                    <Building2 className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium text-gray-900">
                        {company.display_name}
                      </p>
                      {detailsChanged && (
                        <Badge type="warning" strength="medium">
                          Details changed
                        </Badge>
                      )}
                    </div>
                    <p className="text-muted-foreground mt-0.5 truncate text-xs">
                      {company.registered_name}
                      {company.company_type &&
                        ` · ${company.company_type.replace(/_/g, " ")}`}
                    </p>
                  </div>
                </div>
                <ChevronRight className="text-muted-foreground h-4 w-4 flex-shrink-0" />
              </Card>
            </Link>
          ))}
        </div>
      )}
    </PageContainer>
  );
}
