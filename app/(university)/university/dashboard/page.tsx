"use client";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useUniversityProfile } from "@/app/providers/university-profile.provider";
import { preconfiguredAxios } from "@/app/api/preconfig.axios";
import { PageContainer } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ClipboardCheck,
  Users2,
  Ban,
  ScrollText,
  FileStack,
  Building2,
  ChevronRight,
  type LucideIcon,
} from "lucide-react";

function HubCard({
  href,
  icon: Icon,
  title,
  description,
  badge,
}: {
  href: string;
  icon: LucideIcon;
  title: string;
  description: string;
  badge?: number;
}) {
  return (
    <Link href={href} className="block">
      <Card className="h-full gap-0 px-5 py-5 transition-colors hover:bg-gray-50">
        <div className="flex items-start justify-between">
          <span className="bg-primary/10 text-primary flex h-9 w-9 items-center justify-center rounded-[0.33em]">
            <Icon className="h-4 w-4" />
          </span>
          <div className="flex items-center gap-2">
            {badge ? (
              <Badge type="warning" strength="medium">
                {badge}
              </Badge>
            ) : null}
            <ChevronRight className="text-muted-foreground h-4 w-4" />
          </div>
        </div>
        <p className="mt-3 text-sm font-medium text-gray-900">{title}</p>
        <p className="text-muted-foreground mt-0.5 text-xs">{description}</p>
      </Card>
    </Link>
  );
}

export default function UniversityDashboardPage() {
  const { account, isLoading, isSuperadmin } = useUniversityProfile();

  const { data: queueData } = useQuery({
    queryKey: ["university-review-queue"],
    queryFn: () =>
      preconfiguredAxios
        .get("/api/university/review-queue?limit=5")
        .then((r) => r.data),
    enabled: !!account,
  });

  if (isLoading) {
    return (
      <PageContainer className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
      </PageContainer>
    );
  }
  if (!account) return null;

  const pendingCount = queueData?.moas?.length ?? 0;

  return (
    <PageContainer className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
          {account.university.registered_name}
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Signed in as {account.display_name} &middot;{" "}
          <span className="capitalize">{account.role}</span>
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <HubCard
          href="/university/review-queue"
          icon={ClipboardCheck}
          title="Review queue"
          description="Unreviewed MOA requests"
          badge={pendingCount}
        />
        <HubCard
          href="/university/partners"
          icon={Users2}
          title="Partners"
          description="Companies with active MOAs"
        />
        <HubCard
          href="/university/blacklist"
          icon={Ban}
          title="Blacklist"
          description="Manage blocked companies"
        />
        <HubCard
          href="/university/audit"
          icon={ScrollText}
          title="Audit log"
          description="Activity history"
        />
        {isSuperadmin && (
          <HubCard
            href="/university/templates"
            icon={FileStack}
            title="Offered templates"
            description="Manage available MOA templates"
          />
        )}
        {isSuperadmin && (
          <HubCard
            href="/university/profile"
            icon={Building2}
            title="University profile"
            description="Signatory & institution info"
          />
        )}
      </div>
    </PageContainer>
  );
}
