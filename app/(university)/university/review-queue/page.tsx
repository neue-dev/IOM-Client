"use client";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useUniversityProfile } from "@/app/providers/university-profile.provider";
import { preconfiguredAxios } from "@/app/api/preconfig.axios";
import { PageContainer, PageHeader, EmptyState } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateWithoutTime } from "@/lib/utils";
import { ChevronRight } from "lucide-react";

interface MoaSummary {
  id: string;
  created_at: string;
  effective_date: string;
  expiry_date: string;
  company: { id: string; display_name: string; registered_name: string | null };
  template: { name: string };
}

export default function ReviewQueuePage() {
  const { account, isLoading } = useUniversityProfile();

  const { data, isLoading: qLoading } = useQuery({
    queryKey: ["university-review-queue"],
    queryFn: () =>
      preconfiguredAxios
        .get("/api/university/review-queue")
        .then((r) => r.data as { moas: MoaSummary[] }),
    enabled: !!account,
    refetchInterval: 30_000,
  });

  if (isLoading) return null;
  if (!account) return null;

  const moas = data?.moas ?? [];

  return (
    <PageContainer className="space-y-6">
      <PageHeader
        title="Review queue"
        description="MOA requests from companies awaiting your decision."
      />

      {qLoading ? (
        <div className="space-y-2.5">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : moas.length === 0 ? (
        <EmptyState
          title="All caught up"
          description="There are no pending MOA requests to review."
        />
      ) : (
        <div className="space-y-2.5">
          {moas.map((moa) => (
            <Link
              key={moa.id}
              href={`/university/moas/${moa.id}`}
              className="block"
            >
              <Card className="flex-row items-center justify-between gap-3 px-5 py-4 transition-colors hover:bg-gray-50">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-gray-900">
                    {moa.company.display_name}
                    {moa.company.registered_name &&
                      moa.company.registered_name !== moa.company.display_name && (
                        <span className="text-muted-foreground ml-1 font-normal">
                          ({moa.company.registered_name})
                        </span>
                      )}
                  </p>
                  <p className="text-muted-foreground mt-0.5 text-xs">
                    {moa.template.name} &middot; requested{" "}
                    {formatDateWithoutTime(moa.created_at)}
                  </p>
                </div>
                <div className="flex flex-shrink-0 items-center gap-3">
                  <Badge type="warning">Pending</Badge>
                  <ChevronRight className="text-muted-foreground h-4 w-4" />
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </PageContainer>
  );
}
