"use client";

import { useUniversityProfile } from "@/app/providers/university-profile.provider";
import { useUniversityControllerGetAuditLog } from "@/app/api";
import { PageContainer, PageHeader } from "@/components/page-header";
import { ActivityLogTable } from "@/components/university/activity-log-table";

export default function ActivityLogPage() {
  const { account } = useUniversityProfile();

  const { data, isLoading } = useUniversityControllerGetAuditLog(
    { limit: 100 },
    { query: { enabled: !!account } },
  );

  const logs = data?.logs ?? [];

  return (
    <PageContainer className="space-y-6">
      <PageHeader
        title="Activity Log"
        description="Review your institution's activity."
      />
      <ActivityLogTable logs={logs} isLoading={isLoading} />
    </PageContainer>
  );
}
