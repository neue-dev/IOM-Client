"use client";
import { useQuery } from "@tanstack/react-query";
import { useUniversityProfile } from "@/app/providers/university-profile.provider";
import { preconfiguredAxios } from "@/app/api/preconfig.axios";
import { PageContainer, PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { useIomModalRegistry } from "@/components/modal-registry";
import {
  UniversityInvitesTable,
  type CompanyInvite,
} from "@/components/university/university-invites-table";
import { Plus } from "lucide-react";

export default function InvitesPage() {
  const { account } = useUniversityProfile();
  const modal = useIomModalRegistry();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["university-invites"],
    queryFn: () =>
      preconfiguredAxios
        .get("/api/university/invites")
        .then((r) => r.data as { invites: CompanyInvite[] }),
    enabled: !!account,
  });

  // The "no active templates" block now lives inside the modal itself (it
  // only applies to the moa kind — a listing invite needs no template at
  // all), so the dialog always opens here regardless of template state.
  const handleInviteClick = () => modal.inviteCompany.open({ onSent: () => refetch() });

  const invites = data?.invites ?? [];

  if (!account) return null;

  return (
    <PageContainer className="space-y-6">
      <PageHeader
        title="Company Invites"
        description="Track and manage invitations sent to companies."
      >
        <Button onClick={handleInviteClick}>
          <Plus /> Invite company
        </Button>
      </PageHeader>

      <UniversityInvitesTable invites={invites} isLoading={isLoading} />
    </PageContainer>
  );
}
