"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useUniversityProfile } from "@/app/providers/university-profile.provider";
import { preconfiguredAxios } from "@/app/api/preconfig.axios";
import { PageContainer, PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormError } from "@/components/auth-shell";
import { useModal } from "@/app/providers/modal-provider";
import { Loader2, Plus } from "lucide-react";
import {
  StaffAccountsTable,
  type StaffAccount,
} from "@/components/university/staff-accounts-table";

function InviteStaffForm({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  const createStaff = useMutation({
    mutationFn: () =>
      preconfiguredAxios.post("/api/university/accounts", {
        email,
        display_name: name,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["university-accounts"] });
      toast.success("Invitation sent");
      onClose();
    },
    onError: (e: Error) => setError(e.message),
  });

  return (
    <form
      id="invite-staff"
      onSubmit={(e) => {
        e.preventDefault();
        setError("");
        createStaff.mutate();
      }}
      className="space-y-4"
    >
      <FormError>{error}</FormError>
      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="staff@university.edu"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="name">Display name</Label>
        <Input
          id="name"
          placeholder="Juan Dela Cruz"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button
          type="submit"
          form="invite-staff"
          disabled={!email || !name || createStaff.isPending}
        >
          {createStaff.isPending && <Loader2 className="animate-spin" />}
          {createStaff.isPending ? "Sending…" : "Send invite"}
        </Button>
      </div>
    </form>
  );
}

export default function AccountsPage() {
  const { account, isLoading, isSuperadmin } = useUniversityProfile();
  const queryClient = useQueryClient();
  const { openModal, closeModal } = useModal();

  const { data, isLoading: accountsLoading } = useQuery({
    queryKey: ["university-accounts"],
    queryFn: () =>
      preconfiguredAxios
        .get("/api/university/accounts")
        .then((r) => r.data as { accounts: StaffAccount[] }),
    enabled: !!account && isSuperadmin,
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["university-accounts"] });

  const deactivate = useMutation({
    mutationFn: (id: string) =>
      preconfiguredAxios.patch(`/api/university/accounts/${id}/deactivate`),
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });
  const reactivate = useMutation({
    mutationFn: (id: string) =>
      preconfiguredAxios.patch(`/api/university/accounts/${id}/reactivate`),
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });
  const resendInvite = useMutation({
    mutationFn: (id: string) =>
      preconfiguredAxios.post(`/api/university/accounts/${id}/resend-invite`),
    onSuccess: () => toast.success("Invitation resent"),
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading || !account) return null;
  if (!isSuperadmin) return null;

  const staff = (data?.accounts ?? []).filter((a) => a.role === "staff");

  return (
    <PageContainer className="space-y-6">
      <PageHeader
        title="Accounts"
        description="Manage staff accounts for your institution."
      />
      <StaffAccountsTable
        accounts={staff}
        isLoading={accountsLoading}
        isDeactivating={deactivate.isPending}
        isReactivating={reactivate.isPending}
        isResendingInvite={resendInvite.isPending}
        onDeactivate={(id) => deactivate.mutate(id)}
        onReactivate={(id) => reactivate.mutate(id)}
        onResendInvite={(id) => resendInvite.mutate(id)}
        toolbarActions={
          <Button
            onClick={() =>
              openModal(
                "invite-staff",
                <InviteStaffForm onClose={() => closeModal("invite-staff")} />,
                {
                  title: "Invite staff member",
                  description:
                    "They'll receive an email to set their password and join your institution.",
                  panelClassName: "!w-full sm:!max-w-md",
                },
              )
            }
          >
            <Plus /> Invite staff
          </Button>
        }
      />
    </PageContainer>
  );
}
