"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useUniversityProfile } from "@/app/providers/university-profile.provider";
import { preconfiguredAxios } from "@/app/api/preconfig.axios";
import { PageContainer, PageHeader, EmptyState } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { FormError } from "@/components/auth-shell";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Loader2, Plus } from "lucide-react";

interface StaffAccount {
  id: string;
  email: string;
  display_name: string;
  role: "superadmin" | "staff";
  is_deactivated: boolean | null;
  created_at: string;
}

function InviteStaffDialog() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
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
      setEmail("");
      setName("");
      setError("");
      setOpen(false);
    },
    onError: (e: any) => setError(e.message),
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setError("");
      }}
    >
      <DialogTrigger asChild>
        <Button>
          <Plus /> Invite staff
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite staff member</DialogTitle>
          <DialogDescription>
            They&apos;ll receive an email to set their password and join your
            institution.
          </DialogDescription>
        </DialogHeader>
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
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
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
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function AccountsPage() {
  const { account, isLoading, isSuperadmin } = useUniversityProfile();
  const router = useRouter();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!isLoading && !isSuperadmin) router.replace("/university/dashboard");
  }, [isLoading, isSuperadmin, router]);

  const { data, isLoading: aLoading } = useQuery({
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
    onError: (e: any) => toast.error(e.message),
  });
  const reactivate = useMutation({
    mutationFn: (id: string) =>
      preconfiguredAxios.patch(`/api/university/accounts/${id}/reactivate`),
    onSuccess: invalidate,
    onError: (e: any) => toast.error(e.message),
  });
  const resendInvite = useMutation({
    mutationFn: (id: string) =>
      preconfiguredAxios.post(`/api/university/accounts/${id}/resend-invite`),
    onSuccess: () => toast.success("Invitation resent"),
    onError: (e: any) => toast.error(e.message),
  });

  if (isLoading || !account || !isSuperadmin) return null;

  const staff = (data?.accounts ?? []).filter((a) => a.role === "staff");

  return (
    <PageContainer className="space-y-6">
      <PageHeader
        title="Staff accounts"
        description="Invite and manage staff who can review MOAs for your institution."
      >
        <InviteStaffDialog />
      </PageHeader>

      {aLoading ? (
        <div className="space-y-2.5">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : staff.length === 0 ? (
        <EmptyState
          title="No staff accounts yet"
          description="Invite your first staff member to help review requests."
        />
      ) : (
        <div className="space-y-2.5">
          {staff.map((a) => (
            <Card
              key={a.id}
              className="flex-row items-center justify-between gap-4 px-5 py-4"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-medium text-gray-900">
                    {a.display_name}
                  </p>
                  {a.is_deactivated && (
                    <Badge type="destructive" strength="medium">
                      Deactivated
                    </Badge>
                  )}
                </div>
                <p className="text-muted-foreground mt-0.5 truncate text-xs">
                  {a.email}
                </p>
              </div>
              <div className="flex flex-shrink-0 items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => resendInvite.mutate(a.id)}
                  disabled={resendInvite.isPending}
                >
                  Resend invite
                </Button>
                {a.is_deactivated ? (
                  <Button
                    variant="outline"
                    scheme="supportive"
                    size="sm"
                    onClick={() => reactivate.mutate(a.id)}
                    disabled={reactivate.isPending}
                  >
                    Reactivate
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    scheme="destructive"
                    size="sm"
                    onClick={() => deactivate.mutate(a.id)}
                    disabled={deactivate.isPending}
                  >
                    Deactivate
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </PageContainer>
  );
}
