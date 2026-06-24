"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { useUniversityProfile } from "@/app/providers/university-profile.provider";
import { preconfiguredAxios } from "@/app/api/preconfig.axios";
import { PageContainer, PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTable } from "@/components/ui/data-table";
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
import { MoaStatusBadge } from "@/components/status-badge";
import { formatDateWithoutTime, cn } from "@/lib/utils";
import { ArrowLeft, Loader2, ShieldCheck } from "lucide-react";

interface Partner {
  company: {
    id: string;
    display_name: string;
    registered_name: string | null;
    company_type: string | null;
  };
  latestMoaId: string;
}

interface BlacklistEntry {
  id: string;
  company_id: string;
  reason: string | null;
  created_at: string;
  actor_email: string | null;
  company: { id: string; display_name: string; registered_name: string | null };
}

interface PartnerMoaEntry {
  id: string;
  status: string;
  created_at: string;
  effective_date: string;
  expiry_date: string;
  is_expired: boolean | null;
  template: { name: string } | null;
}

type DocReviewDetails = Record<string, Record<string, string>>;

interface CompanyDoc {
  type: string;
  filename: string;
  url: string | null;
}

const DOC_LABELS: Record<string, string> = {
  business_permit: "Business Permit",
  mayor_permit: "Mayor's Permit",
  or_registration: "OR Registration",
  sec_dti_registration: "SEC/DTI Registration",
};

function VerifiedDocumentDetails({
  details,
  documents,
}: {
  details: DocReviewDetails;
  documents: CompanyDoc[];
}) {
  const entries = Object.entries(details).filter(([, pairs]) => Object.keys(pairs).length > 0);
  if (entries.length === 0) return null;
  const docByType = new Map(documents.map((d) => [d.type, d]));
  return (
    <div className="space-y-0 rounded-[0.33em] border border-gray-200">
      <div className="flex items-center gap-1.5 border-b border-gray-100 px-3 py-2 text-xs font-medium text-gray-700">
        <ShieldCheck className="h-3.5 w-3.5 text-supportive" />
        Verified document details
      </div>
      <div className="divide-y divide-gray-100">
        {entries.map(([docType, pairs]) => {
          const doc = docByType.get(docType);
          const kvPairs = Object.entries(pairs).filter(([k, v]) => k || v);
          return (
            <div key={docType} className="flex gap-0">
              <div className="flex w-44 flex-shrink-0 flex-col justify-start gap-1 py-2 pl-3 pr-3">
                <span className="text-muted-foreground text-xs">
                  {DOC_LABELS[docType] ?? docType.replace(/_/g, " ")}
                </span>
                {doc?.url ? (
                  <a
                    href={doc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary text-xs underline"
                  >
                    Open
                  </a>
                ) : (
                  <span className="text-muted-foreground text-xs">Unavailable</span>
                )}
              </div>
              <div className="w-px self-stretch bg-gray-100" />
              <div className="min-w-0 flex-1 py-2 pl-3 pr-3">
                {kvPairs.length > 0 ? (
                  <div className="space-y-0.5">
                    {kvPairs.map(([k, v]) => (
                      <p key={k} className="text-xs text-gray-700">
                        <span className="text-muted-foreground">{k}:</span>{" "}
                        <span className="font-medium">{v}</span>
                      </p>
                    ))}
                  </div>
                ) : (
                  <span className="text-muted-foreground text-xs">—</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface CombinedEntry {
  company: {
    id: string;
    display_name: string;
    registered_name: string | null;
    company_type: string | null;
  };
  latestMoaId: string | null;
  isBlacklisted: boolean;
  blacklistEntry: BlacklistEntry | null;
}

// "list" and "detail" are stable states; "to-detail" / "to-list" are mid-transition.
type Phase = "list" | "to-detail" | "detail" | "to-list";

const ANIM_DURATION = 200;

export default function PartnersPage() {
  const { account, isLoading: profileLoading } = useUniversityProfile();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [phase, setPhase] = useState<Phase>("list");
  const [currentCompanyId, setCurrentCompanyId] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const [blacklistTarget, setBlacklistTarget] = useState<CombinedEntry | null>(null);
  const [unblacklistTarget, setUnblacklistTarget] = useState<CombinedEntry | null>(null);
  const [reason, setReason] = useState("");

  // Clean up timer on unmount.
  useEffect(() => () => clearTimeout(timerRef.current), []);

  const { data: partnersData, isLoading: isPartnersLoading } = useQuery({
    queryKey: ["university-partners"],
    queryFn: () =>
      preconfiguredAxios
        .get("/api/university/partners")
        .then((r) => r.data as { partners: Partner[] }),
    enabled: !!account,
  });

  const { data: blacklistData, isLoading: isBlacklistLoading } = useQuery({
    queryKey: ["university-blacklist"],
    queryFn: () =>
      preconfiguredAxios
        .get("/api/university/blacklist")
        .then((r) => r.data as { blacklist: BlacklistEntry[] }),
    enabled: !!account,
  });

  const { data: partnerMoasData, isLoading: isMoasLoading } = useQuery({
    queryKey: ["university-partner-moas", currentCompanyId],
    queryFn: () =>
      preconfiguredAxios
        .get(`/api/university/partners/${currentCompanyId}/moas`)
        .then((r) => r.data as { company: Partner["company"] & { document_review_details?: DocReviewDetails }; moas: PartnerMoaEntry[]; companyDocuments: CompanyDoc[] }),
    enabled: !!currentCompanyId,
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["university-partners"] });
    queryClient.invalidateQueries({ queryKey: ["university-blacklist"] });
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

  const combined = useMemo<CombinedEntry[]>(() => {
    const map = new Map<string, CombinedEntry>();
    for (const p of partnersData?.partners ?? []) {
      map.set(p.company.id, {
        company: p.company,
        latestMoaId: p.latestMoaId,
        isBlacklisted: false,
        blacklistEntry: null,
      });
    }
    for (const b of blacklistData?.blacklist ?? []) {
      const existing = map.get(b.company_id);
      if (existing) {
        existing.isBlacklisted = true;
        existing.blacklistEntry = b;
      } else {
        map.set(b.company_id, {
          company: { ...b.company, company_type: null },
          latestMoaId: null,
          isBlacklisted: true,
          blacklistEntry: b,
        });
      }
    }
    return [...map.values()];
  }, [partnersData, blacklistData]);

  const listColumns = useMemo<ColumnDef<CombinedEntry>[]>(
    () => [
      {
        id: "company",
        header: "Company",
        accessorFn: (row) => row.company.display_name,
        cell: ({ row }) => (
          <div>
            <div className="flex items-center gap-2">
              <p className="font-medium text-gray-900">{row.original.company.display_name}</p>
              {row.original.isBlacklisted && (
                <span className="inline-flex shrink-0 items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                  Blacklisted
                </span>
              )}
            </div>
            {row.original.company.registered_name && (
              <p className="text-muted-foreground text-xs">
                {row.original.company.registered_name}
              </p>
            )}
          </div>
        ),
      },
      {
        id: "type",
        header: "Type",
        accessorFn: (row) => row.company.company_type?.replace(/_/g, " ") ?? "—",
      },
    ],
    [],
  );

  const moaHistoryColumns = useMemo<ColumnDef<PartnerMoaEntry>[]>(
    () => [
      {
        id: "template",
        header: "Template",
        accessorFn: (row) => row.template?.name ?? "—",
        cell: ({ row }) => (
          <span className="font-medium text-gray-900">{row.original.template?.name ?? "—"}</span>
        ),
      },
      {
        id: "status",
        header: "Status",
        enableSorting: false,
        cell: ({ row }) => (
          <MoaStatusBadge status={row.original.status} isExpired={row.original.is_expired} />
        ),
      },
      {
        id: "requested",
        header: "Requested",
        accessorFn: (row) => row.created_at,
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {formatDateWithoutTime(row.original.created_at)}
          </span>
        ),
      },
      {
        id: "period",
        header: "Period",
        accessorFn: (row) => row.effective_date ?? "",
        cell: ({ row }) =>
          row.original.effective_date ? (
            <span className="text-muted-foreground">
              {formatDateWithoutTime(row.original.effective_date)} –{" "}
              {formatDateWithoutTime(row.original.expiry_date)}
            </span>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
    ],
    [],
  );

  const navigateToDetail = (companyId: string) => {
    clearTimeout(timerRef.current);
    setCurrentCompanyId(companyId);
    setPhase("to-detail");
    timerRef.current = setTimeout(() => setPhase("detail"), ANIM_DURATION + 10);
  };

  const navigateToList = () => {
    clearTimeout(timerRef.current);
    setPhase("to-list");
    timerRef.current = setTimeout(() => {
      setPhase("list");
      setCurrentCompanyId(null);
    }, ANIM_DURATION + 10);
  };

  if (profileLoading || !account) return null;

  const isLoading = isPartnersLoading || isBlacklistLoading;
  const entry = combined.find((e) => e.company.id === currentCompanyId);
  const company = partnerMoasData?.company ?? entry?.company;
  const moas = partnerMoasData?.moas ?? [];

  // During "to-detail": list is in-flow (exiting left), detail is absolute (entering from right).
  // During "to-list":  detail is in-flow (exiting right), list is absolute (entering from left).
  const showList = phase !== "detail";
  const showDetail = phase !== "list";

  return (
    <PageContainer>
      {/* overflow-hidden clips the sliding panels; relative enables absolute children */}
      <div className="relative overflow-hidden">

        {/* ── List panel ───────────────────────────────────────────────────── */}
        {showList && (
          <div
            className={cn(
              "space-y-6",
              phase === "to-detail" &&
                `animate-out slide-out-to-left fade-out duration-${ANIM_DURATION}`,
              phase === "to-list" &&
                `absolute inset-x-0 top-0 animate-in slide-in-from-left fade-in duration-${ANIM_DURATION}`,
            )}
          >
            <PageHeader title="Partners" description="Manage your active partners and blacklist." />
            {isLoading ? (
              <div className="space-y-1">
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : (
              <DataTable
                id="partners"
                columns={listColumns}
                data={combined}
                searchKey="company"
                searchPlaceholder="Search by company..."
                rowLabelSingular="partner"
                rowLabelPlural="partners"
                onRowClick={(e) => navigateToDetail(e.company.id)}
                getRowClassName={(row) => (row.isBlacklisted ? "bg-red-50" : undefined)}
              />
            )}
          </div>
        )}

        {/* ── Detail panel ─────────────────────────────────────────────────── */}
        {showDetail && (
          <div
            className={cn(
              "space-y-4",
              phase === "to-detail" &&
                `absolute inset-x-0 top-0 animate-in slide-in-from-right fade-in duration-${ANIM_DURATION}`,
              phase === "to-list" &&
                `animate-out slide-out-to-right fade-out duration-${ANIM_DURATION}`,
            )}
          >
            <div className="flex items-center justify-between gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={navigateToList}
                className="text-muted-foreground hover:text-foreground gap-1.5 px-0"
              >
                <ArrowLeft className="h-4 w-4" /> Partners
              </Button>
              {entry &&
                (entry.isBlacklisted ? (
                  <Button variant="outline" size="sm" onClick={() => setUnblacklistTarget(entry)}>
                    Un-blacklist
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    scheme="destructive"
                    size="sm"
                    onClick={() => setBlacklistTarget(entry)}
                  >
                    Blacklist
                  </Button>
                ))}
            </div>

            <div>
              <h3 className="font-semibold text-gray-900">{company?.display_name ?? "—"}</h3>
              {(company?.registered_name || company?.company_type) && (
                <p className="text-muted-foreground mt-0.5 text-xs">
                  {company?.registered_name}
                  {company?.company_type && ` · ${company.company_type.replace(/_/g, " ")}`}
                </p>
              )}
            </div>

            {entry?.isBlacklisted && entry.blacklistEntry && (
              <div className="border-destructive/30 bg-destructive/5 text-destructive space-y-1 rounded-[0.33em] border p-3 text-sm">
                <p>
                  This company is <strong>blacklisted</strong> — all active MOAs are revoked and
                  new requests are blocked.
                </p>
                {entry.blacklistEntry.reason && (
                  <p className="text-destructive/80 text-xs">
                    Reason: {entry.blacklistEntry.reason}
                  </p>
                )}
                <p className="text-destructive/60 text-xs">
                  Blacklisted on {formatDateWithoutTime(entry.blacklistEntry.created_at)}
                  {entry.blacklistEntry.actor_email && ` by ${entry.blacklistEntry.actor_email}`}
                </p>
              </div>
            )}

            {partnerMoasData?.company?.document_review_details && (
              <VerifiedDocumentDetails
                details={partnerMoasData.company.document_review_details}
                documents={partnerMoasData.companyDocuments ?? []}
              />
            )}

            {isMoasLoading ? (
              <div className="space-y-1">
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : moas.length > 0 ? (
              <DataTable
                id={`partner-moas-${currentCompanyId}`}
                columns={moaHistoryColumns}
                data={moas}
                searchKey="template"
                searchPlaceholder="Search MOAs..."
                rowLabelSingular="MOA"
                rowLabelPlural="MOAs"
                onRowClick={(moa) => router.push(`/university/moas/${moa.id}`)}
              />
            ) : (
              <p className="text-muted-foreground text-sm">No MOA history.</p>
            )}
          </div>
        )}
      </div>

      {/* ── Blacklist dialog ─────────────────────────────────────────────── */}
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
            <DialogDescription>{blacklistTarget?.company.display_name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="border-destructive/30 bg-destructive/5 text-destructive space-y-1 rounded-[0.33em] border p-3 text-sm">
              <p>
                This immediately <strong>revokes all active MOAs</strong> with this company and
                blocks new requests.
              </p>
              <p className="text-destructive/80 text-xs">
                Revoked MOAs cannot be restored. The company is not notified. This action is logged
                under your name.
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
                blacklistMutation.mutate({ companyId: blacklistTarget.company.id, reason })
              }
            >
              {blacklistMutation.isPending && <Loader2 className="animate-spin" />}
              {blacklistMutation.isPending ? "Blacklisting…" : "Blacklist company"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Un-blacklist dialog ──────────────────────────────────────────── */}
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
              This re-enables future requests from this company. Previously revoked MOAs will not be
              restored.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                unblacklistTarget && unblacklistMutation.mutate(unblacklistTarget.company.id)
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
