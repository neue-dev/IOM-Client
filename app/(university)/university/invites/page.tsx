"use client";
import { useQuery } from "@tanstack/react-query";
import { useUniversityProfile } from "@/app/providers/university-profile.provider";
import { preconfiguredAxios } from "@/app/api/preconfig.axios";
import { PageContainer, PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { useModal } from "@/app/providers/modal-provider";
import { useIomModalRegistry } from "@/components/modal-registry";
import {
  UniversityInvitesTable,
  type CompanyInvite,
} from "@/components/university/university-invites-table";
import Link from "next/link";
import { Plus } from "lucide-react";

interface AvailableTemplate {
  id: string;
  template: { id: string; name: string };
  is_available: boolean;
}

export default function InvitesPage() {
  const { account } = useUniversityProfile();
  const { openModal, closeModal } = useModal();
  const modal = useIomModalRegistry();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["university-invites"],
    queryFn: () =>
      preconfiguredAxios
        .get("/api/university/invites")
        .then((r) => r.data as { invites: CompanyInvite[] }),
    enabled: !!account,
  });

  const { data: templatesData } = useQuery({
    queryKey: ["university-templates-for-invite"],
    queryFn: () =>
      preconfiguredAxios
        .get("/api/university/templates")
        .then((r) => r.data as { templates: AvailableTemplate[] }),
    enabled: !!account,
  });
  const availableTemplates = (templatesData?.templates ?? []).filter(
    (t) => t.is_available,
  );

  const handleInviteClick = () => {
    if (availableTemplates.length === 0) {
      openModal(
        "no-templates",
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            You need at least one active MOA template before you can invite
            companies. Go to your templates page to activate one.
          </p>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => closeModal("no-templates")}
            >
              Cancel
            </Button>
            <Button asChild>
              <Link href="/templates">Go to Templates</Link>
            </Button>
          </div>
        </div>,
        {
          title: "No active templates",
          panelClassName: "!w-full sm:!max-w-sm",
        },
      );
    } else {
      modal.inviteCompany.open({ onSent: () => refetch() });
    }
  };

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
