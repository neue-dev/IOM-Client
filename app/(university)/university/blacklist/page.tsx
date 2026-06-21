"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useUniversityProfile } from "@/app/providers/university-profile.provider";
import { preconfiguredAxios } from "@/app/api/preconfig.axios";
import { PageContainer, PageHeader, EmptyState } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { formatDateWithoutTime } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface Partner {
  company: { id: string; display_name: string; registered_name: string | null };
  latestMoaId: string;
  detailsChanged: boolean;
}

interface BlacklistEntry {
  id: string;
  company_id: string;
  reason: string | null;
  created_at: string;
  actor_email: string | null;
  company: { id: string; display_name: string; registered_name: string | null };
}

export default function BlacklistPage() {
  const { account, isLoading } = useUniversityProfile();
  const queryClient = useQueryClient();

  const [blacklistTarget, setBlacklistTarget] = useState<Partner | null>(null);
  const [reason, setReason] = useState("");
  const [unblacklistTarget, setUnblacklistTarget] =
    useState<BlacklistEntry | null>(null);

  const { data: partnersData } = useQuery({
    queryKey: ["university-partners"],
    queryFn: () =>
      preconfiguredAxios
        .get("/api/university/partners")
        .then((r) => r.data as { partners: Partner[] }),
    enabled: !!account,
  });

  const { data: blacklistData, isLoading: blLoading } = useQuery({
    queryKey: ["university-blacklist"],
    queryFn: () =>
      preconfiguredAxios
        .get("/api/university/blacklist")
        .then((r) => r.data as { blacklist: BlacklistEntry[] }),
    enabled: !!account,
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["university-partners"] });
    queryClient.invalidateQueries({ queryKey: ["university-blacklist"] });
    queryClient.invalidateQueries({ queryKey: ["university-review-queue"] });
    queryClient.invalidateQueries({ queryKey: ["university-audit"] });
  };

  const blacklistMutation = useMutation({
    mutationFn: ({ companyId, reason }: { companyId: string; reason: string }) =>
      preconfiguredAxios.post("/api/university/blacklist", {
        companyId,
        reason: reason || undefined,
      }),
    onSuccess: () => {
      refresh();
      setBlacklistTarget(null);
      setReason("");
    },
  });

  const unblacklistMutation = useMutation({
    mutationFn: (companyId: string) =>
      preconfiguredAxios.delete(`/api/university/blacklist/${companyId}`),
    onSuccess: () => {
      refresh();
      setUnblacklistTarget(null);
    },
  });

  if (isLoading) return null;
  if (!account) return null;

  const partners = partnersData?.partners ?? [];
  const blacklist = blacklistData?.blacklist ?? [];
  const blacklistedIds = new Set(blacklist.map((b) => b.company_id));
  const eligiblePartners = partners.filter(
    (p) => !blacklistedIds.has(p.company.id)
  );

  return (
    <PageContainer className="space-y-8">
      <PageHeader
        title="Blacklist"
        description="Block companies from requesting MOAs. Blacklisting revokes their active MOAs immediately."
      />

      {eligiblePartners.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
            Current partners
          </h2>
          <div className="space-y-2.5">
            {eligiblePartners.map(({ company }) => (
              <Card
                key={company.id}
                className="flex-row items-center justify-between gap-4 px-5 py-4"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-gray-900">
                    {company.display_name}
                  </p>
                  {company.registered_name && (
                    <p className="text-muted-foreground mt-0.5 truncate text-xs">
                      {company.registered_name}
                    </p>
                  )}
                </div>
                <Button
                  variant="outline"
                  scheme="destructive"
                  size="sm"
                  className="flex-shrink-0"
                  onClick={() =>
                    setBlacklistTarget({
                      company,
                      latestMoaId: "",
                      detailsChanged: false,
                    })
                  }
                >
                  Blacklist
                </Button>
              </Card>
            ))}
          </div>
        </section>
      )}

      {blLoading && <Skeleton className="h-20 w-full" />}

      {!blLoading && blacklist.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
            Blacklisted ({blacklist.length})
          </h2>
          <div className="space-y-2.5">
            {blacklist.map((entry) => (
              <Card
                key={entry.id}
                className="border-destructive/20 bg-destructive/5 flex-row items-start justify-between gap-4 px-5 py-4"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-gray-900">
                    {entry.company.display_name}
                  </p>
                  {entry.reason && (
                    <p className="text-muted-foreground mt-0.5 text-xs">
                      Reason: {entry.reason}
                    </p>
                  )}
                  {entry.actor_email && (
                    <p className="text-muted-foreground mt-0.5 text-xs">
                      By {entry.actor_email} &middot;{" "}
                      {formatDateWithoutTime(entry.created_at)}
                    </p>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-shrink-0"
                  onClick={() => setUnblacklistTarget(entry)}
                >
                  Un-blacklist
                </Button>
              </Card>
            ))}
          </div>
        </section>
      )}

      {!blLoading && blacklist.length === 0 && eligiblePartners.length === 0 && (
        <EmptyState title="No companies to manage here yet" />
      )}

      {/* Blacklist confirmation */}
      <Dialog
        open={!!blacklistTarget}
        onOpenChange={(o) => {
          if (!o) {
            setBlacklistTarget(null);
            setReason("");
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Blacklist company</DialogTitle>
            <DialogDescription>
              {blacklistTarget?.company.display_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="border-destructive/30 bg-destructive/5 text-destructive space-y-1 rounded-[0.33em] border p-3 text-sm">
              <p>
                This immediately <strong>revokes all active MOAs</strong> with this
                company and blocks new requests.
              </p>
              <p className="text-destructive/80 text-xs">
                Revoked MOAs cannot be restored. The company is not notified. This
                action is logged under your name.
              </p>
            </div>
            <Textarea
              rows={2}
              placeholder="Internal reason (optional — never shown to the company)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setBlacklistTarget(null);
                setReason("");
              }}
            >
              Cancel
            </Button>
            <Button
              scheme="destructive"
              disabled={blacklistMutation.isPending}
              onClick={() =>
                blacklistTarget &&
                blacklistMutation.mutate({
                  companyId: blacklistTarget.company.id,
                  reason,
                })
              }
            >
              {blacklistMutation.isPending && <Loader2 className="animate-spin" />}
              {blacklistMutation.isPending ? "Blacklisting…" : "Blacklist company"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Un-blacklist confirmation */}
      <AlertDialog
        open={!!unblacklistTarget}
        onOpenChange={(o) => !o && setUnblacklistTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Remove {unblacklistTarget?.company.display_name} from the blacklist?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This re-enables future requests from this company. Previously revoked
              MOAs will not be restored.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                unblacklistTarget &&
                unblacklistMutation.mutate(unblacklistTarget.company_id)
              }
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageContainer>
  );
}
