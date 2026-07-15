"use client";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { useUniversityProfile } from "@/app/providers/university-profile.provider";
import { preconfiguredAxios } from "@/app/api/preconfig.axios";
import { PageContainer, PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTable } from "@/components/ui/data-table";
import { useModal } from "@/app/providers/modal-provider";
import { useIomModalRegistry } from "@/components/modal-registry";
import { formatDateWithoutTime } from "@/lib/utils";
import Link from "next/link";
import { Plus } from "lucide-react";

interface CompanyInvite {
  id: string;
  invited_email: string;
  company_name: string | null;
  template_id: string | null;
  template_name: string | null;
  personal_message: string | null;
  status: "pending" | "accepted" | "expired" | "used_waiting";
  created_at: string;
  expires_at: string;
  registered_company: { registered_name: string } | null;
}

interface AvailableTemplate {
  id: string;
  template: { id: string; name: string };
  is_available: boolean;
}

function InviteStatusBadge({ status }: { status: CompanyInvite["status"] }) {
  if (status === "accepted") return <Badge type="supportive">Accepted</Badge>;
  if (status === "used_waiting") return <Badge type="warning">Registered — awaiting MOA</Badge>;
  if (status === "expired") return <Badge type="destructive">Expired</Badge>;
  return <Badge type="default">Pending</Badge>;
}

function resolveDisplayName(invite: CompanyInvite): string {
  const registeredName =
    (invite.status === "accepted" || invite.status === "used_waiting") &&
    invite.registered_company
      ? invite.registered_company.registered_name
      : null;
  if (registeredName) {
    return invite.company_name && invite.company_name !== registeredName
      ? `${registeredName} (${invite.company_name})`
      : registeredName;
  }
  return invite.company_name ?? invite.invited_email;
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
  const availableTemplates = (templatesData?.templates ?? []).filter((t) => t.is_available);

  const handleInviteClick = () => {
    if (availableTemplates.length === 0) {
      openModal("no-templates", <div className="space-y-4">
        <p className="text-sm text-muted-foreground">You need at least one active MOA template before you can invite companies. Go to your templates page to activate one.</p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => closeModal("no-templates")}>Cancel</Button>
          <Button asChild><Link href="/templates">Go to Templates</Link></Button>
        </div>
      </div>, { title: "No active templates", panelClassName: "!w-full sm:!max-w-sm" });
    } else {
      modal.inviteCompany.open({ onSent: () => refetch() });
    }
  };

  const invites = data?.invites ?? [];

  const columns = useMemo<ColumnDef<CompanyInvite>[]>(
    () => [
      {
        id: "company",
        header: "Company",
        accessorFn: resolveDisplayName,
        cell: ({ row }) => {
          const name = resolveDisplayName(row.original);
          const showEmail = name !== row.original.invited_email;
          return (
            <div className="min-w-0">
              <p className="truncate font-medium text-gray-900">{name}</p>
              {showEmail && (
                <p className="text-muted-foreground truncate text-xs">{row.original.invited_email}</p>
              )}
            </div>
          );
        },
      },
      {
        id: "template",
        header: "Template",
        accessorFn: (row) => row.template_name ?? "—",
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {row.original.template_name ?? "—"}
          </span>
        ),
      },
      {
        id: "validity",
        header: "Validity",
        accessorFn: (row) => `${formatDateWithoutTime(row.created_at)} – ${formatDateWithoutTime(row.expires_at)}`,
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {formatDateWithoutTime(row.original.created_at)} – {formatDateWithoutTime(row.original.expires_at)}
          </span>
        ),
      },
      {
        id: "status",
        header: "Status",
        accessorKey: "status",
        cell: ({ row }) => <InviteStatusBadge status={row.original.status} />,
      },
    ],
    [],
  );

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

      {isLoading ? (
        <div className="space-y-1">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : (
        <DataTable
          id="invites"
          columns={columns}
          data={invites}
          searchKey="company"
          searchPlaceholder="Search by company…"
          rowLabelSingular="invite"
          rowLabelPlural="invites"
        />
      )}

    </PageContainer>
  );
}
