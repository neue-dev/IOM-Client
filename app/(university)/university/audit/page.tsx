"use client";
import { useQuery } from "@tanstack/react-query";
import { useUniversityProfile } from "@/app/providers/university-profile.provider";
import { preconfiguredAxios } from "@/app/api/preconfig.axios";
import { PageContainer, PageHeader, EmptyState } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateTime } from "@/lib/utils";

interface AuditEvent {
  id: string;
  event_type: string;
  actor_email: string | null;
  detail: string | null;
  created_at: string;
  company?: { display_name: string } | null;
  moa?: { id: string } | null;
}

const EVENT_LABELS: Record<string, string> = {
  request_received: "MOA request received",
  moa_confirmed: "MOA confirmed",
  moa_rejected: "MOA rejected",
  partner_details_changed: "Partner details changed",
  moa_revoked: "MOA revoked",
  company_blacklisted: "Company blacklisted",
  company_unblacklisted: "Company removed from blacklist",
};

const EVENT_TYPES: Record<string, BadgeProps["type"]> = {
  request_received: "primary",
  moa_confirmed: "supportive",
  moa_rejected: "destructive",
  partner_details_changed: "warning",
  moa_revoked: "destructive",
  company_blacklisted: "destructive",
  company_unblacklisted: "default",
};

export default function AuditPage() {
  const { account, isLoading } = useUniversityProfile();

  const { data, isLoading: aLoading } = useQuery({
    queryKey: ["university-audit"],
    queryFn: () =>
      preconfiguredAxios
        .get("/api/university/audit?limit=100")
        .then((r) => r.data as { logs: AuditEvent[] }),
    enabled: !!account,
  });

  if (isLoading) return null;
  if (!account) return null;

  const events = data?.logs ?? [];

  return (
    <PageContainer className="space-y-6">
      <PageHeader
        title="Audit log"
        description="A record of MOA and partner activity for your institution."
      />

      {aLoading ? (
        <div className="space-y-2.5">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : events.length === 0 ? (
        <EmptyState title="No audit events yet" />
      ) : (
        <div className="space-y-2.5">
          {events.map((ev) => (
            <Card key={ev.id} className="gap-1.5 px-5 py-4">
              <div className="flex items-center justify-between gap-3">
                <Badge type={EVENT_TYPES[ev.event_type] ?? "default"}>
                  {EVENT_LABELS[ev.event_type] ?? ev.event_type}
                </Badge>
                <span className="text-muted-foreground text-xs">
                  {formatDateTime(ev.created_at)}
                </span>
              </div>
              {ev.company && (
                <p className="text-sm text-gray-800">{ev.company.display_name}</p>
              )}
              {ev.detail && (
                <p className="text-muted-foreground text-xs">{ev.detail}</p>
              )}
              {ev.actor_email && (
                <p className="text-muted-foreground text-xs">By {ev.actor_email}</p>
              )}
            </Card>
          ))}
        </div>
      )}
    </PageContainer>
  );
}
