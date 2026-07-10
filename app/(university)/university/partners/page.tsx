"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { useUniversityProfile } from "@/app/providers/university-profile.provider";
import { preconfiguredAxios } from "@/app/api/preconfig.axios";
import { PageContainer, PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import { useModal } from "@/app/providers/modal-provider";
import { useIomModalRegistry } from "@/components/modal-registry";
import { Card } from "@/components/ui/card";
import { MoaStatusBadge } from "@/components/status-badge";
import { LegacyCompaniesPanel, LegacyCompanyDetail, formatLegacyLabel, formatLegacyFieldLabel, formatLegacyMoaPeriod, isFilledValue, isLegacyMoaExpired, UploadDialog, CsvUploadDialog, ZipUploadDialog } from "@/components/legacy-companies/legacy-companies-panel";
import { formatDateWithoutTime, cn } from "@/lib/utils";
import { toast } from "sonner";
import { toastPresets } from "@/components/sonner-toaster";
import { ArrowLeft, Ban, ChevronDown, ChevronRight, CircleAlert, CircleCheck, Clock, Eye, Loader2, Minus, Plus, ShieldCheck, Upload, UserPlus } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

interface Partner {
  company: {
    id: string;
    registered_name: string;
    company_type: string | null;
  } | null;
  latestMoaId: string | null;
  latestMoaStatus: string;
  effective_date: string | null;
  expiry_date: string | null;
  is_expired: boolean | null;
  hasActiveMoa: boolean;
}

interface BlacklistEntry {
  id: string;
  company_id: string;
  reason: string | null;
  created_at: string;
  actor_email: string | null;
  company: { id: string; registered_name: string };
}

interface LegacyCompanySummary {
  id: string;
  company_name: string;
  company_details: Record<string, unknown>;
  moaCount: number;
  documentCount: number;
  valid_until: string | null;
  hasMoa: boolean;
  hasPerpetualMoa: boolean;
  latestMoaEffectiveDate: string | null;
  latestMoaExpiryDate: string | null;
  latestMoaIsPerpetual: boolean;
}

interface PartnerMoaEntry {
  id: string;
  status: string;
  created_at: string;
  effective_date: string;
  expiry_date: string | null;
  is_expired: boolean | null;
  template: { name: string } | null;
}

type DocReviewDetails = Record<string, { type?: string; document?: string; value: string }>;

interface CompanyDoc {
  type: string;
  filename: string;
  url: string | null;
}

const DOC_LABELS: Record<string, string> = {
  business_permit: "Business Permit",
  mayor_permit: "Mayor's Permit",
  sec_dti_registration: "SEC/DTI Registration",
};

const DOC_TYPES_LIST = Object.entries(DOC_LABELS);

function PartnerStatusBadge({ status }: { status: string }) {
  if (status === "Active")
    return <Badge className="border-transparent bg-supportive gap-1 text-white"><CircleCheck className="h-3.5 w-3.5" />Active</Badge>;
  if (status === "Expired")
    return <Badge className="border-transparent bg-destructive gap-1 text-white"><Clock className="h-3.5 w-3.5" />Expired</Badge>;
  if (status === "Blacklisted")
    return <Badge className="border-transparent bg-destructive gap-1 text-white"><Ban className="h-3.5 w-3.5" />Blacklisted</Badge>;
  if (status === "Revoked")
    return <Badge className="border-transparent bg-destructive gap-1 text-white"><Ban className="h-3.5 w-3.5" />Revoked</Badge>;
  if (status === "None")
    return <Badge className="border-transparent bg-gray-500 gap-1 text-white"><Minus className="h-3.5 w-3.5" />None</Badge>;
  return <Badge className="border-transparent bg-primary gap-1 text-white">{status}</Badge>;
}

function VerifiedDocumentDetails({ details }: { details: DocReviewDetails }) {
  const entries = Object.entries(details).filter(([, v]) => v.value);
  if (entries.length === 0) return null;
  return (
    <div className="space-y-0 rounded-[0.33em] border border-gray-200">
      <div className="flex items-center gap-1.5 border-b border-gray-100 px-3 py-2 text-xs font-medium text-gray-700">
        <ShieldCheck className="h-3.5 w-3.5 text-supportive" />
        Verified details
      </div>
      <div className="divide-y divide-gray-100">
        {entries.map(([key, field]) => (
          <div key={key} className="flex items-center gap-4 px-3 py-2">
            <p className="text-muted-foreground w-44 flex-shrink-0 text-xs">{key}</p>
            <p className="text-sm font-medium text-gray-900">{field.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function DocumentsSection({ documents }: { documents: CompanyDoc[] }) {
  const { openModal } = useModal();
  return (
    <Card className="gap-4 py-5">
      <p className="px-5 text-sm font-semibold text-gray-900">Documents</p>
      <div className="space-y-1">
        {DOC_TYPES_LIST.map(([type, label]) => {
          const doc = documents.find((d) => d.type === type);
          return (
            <div
              key={type}
              className="flex flex-row items-center px-5 duration-200 hover:cursor-pointer hover:bg-gray-50"
              onClick={() => {
                if (!doc?.url) return;
                openModal("preview-doc", doc.url ? (
                  <iframe
                    src={doc.url}
                    className="h-full w-full border-none"
                    title={doc.filename}
                  />
                ) : (
                  <div className="text-muted-foreground flex h-full items-center justify-center text-sm">
                    Couldn&apos;t load that document.
                  </div>
                ), {
                  title: DOC_LABELS[doc.type] ?? doc.type.replace(/_/g, " "),
                  panelClassName: "!w-full sm:!max-w-4xl",
                  contentClassName: "min-h-0 flex-1 overflow-hidden p-0 sm:p-0",
                  showHeaderDivider: true,
                });
              }}
            >
              {doc
                ? <CircleCheck className="text-supportive flex-shrink-0" />
                : <CircleAlert className="text-warning flex-shrink-0" />
              }
              <div className="flex flex-1 items-center gap-3 rounded-[0.16em] p-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-800">{label}</p>
                  {doc && (
                    <p className="text-muted-foreground mt-0.5 truncate text-xs">{doc.filename}</p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

interface PartnerTableRow {
  id: string;
  displayName: string;

  // Registered partner data
  partnerCompany: { id: string; registered_name: string; company_type: string | null } | null;
  latestMoaId: string | null;
  latestMoaStatus: string | null;
  hasActiveMoa: boolean;
  effectiveDate: string | null;
  expiryDate: string | null;
  isPartnerExpired: boolean | null;

  // Blacklist
  isBlacklisted: boolean;
  blacklistEntry: BlacklistEntry | null;

  // Legacy
  legacyEntry: LegacyCompanySummary | null;
  isImported: boolean;

  // Computed for invite
  contactEmail: string | null;
}

// "list" and "detail" are stable states; "to-detail" / "to-list" are mid-transition.
type Phase = "list" | "to-detail" | "detail" | "to-list";

const ANIM_DURATION = 200;

function ReadOnlyLegacyDetail({
  company,
  onPreviewDoc,
}: {
  company: LegacyCompanyDetail;
  onPreviewDoc: (url: string, title: string) => void;
}) {
  const details = company.company_details as Record<string, unknown>;
  const companyType = typeof details.company_type === "string" ? details.company_type : null;
  const standardDetailKeys = [
    "company_type",
    "tin",
    "registered_address",
    "contact_person",
    "contact_email",
    "contact_phone",
  ];
  const detailEntries = [
    ...standardDetailKeys.map((key) => [formatLegacyFieldLabel(key), details[key]] as const),
    ...Object.entries(details)
      .filter(([key, value]) => !standardDetailKeys.includes(key) && isFilledValue(value))
      .map(([key, value]) => [formatLegacyFieldLabel(key), value] as const),
  ];

  return (
    <>
      <div>
        <p className="text-sm font-semibold text-gray-900">{company.company_name}</p>
        {companyType && (
          <p className="text-muted-foreground mt-0.5 text-xs">
            {formatLegacyLabel(companyType)}
          </p>
        )}
      </div>

      <div className="space-y-0 rounded-[0.33em] border border-gray-200">
        <div className="flex items-center gap-1.5 border-b border-gray-100 px-3 py-2 text-xs font-medium text-gray-700">
          Company details
        </div>
        <div className="divide-y divide-gray-100">
          {detailEntries.map(([label, value]) => (
            <div key={label} className="flex items-center gap-4 px-3 py-2">
              <p className="text-muted-foreground w-44 flex-shrink-0 text-xs">{label}</p>
              <p className="text-sm font-medium text-gray-900">
                {isFilledValue(value) ? String(value) : "—"}
              </p>
            </div>
          ))}
        </div>
      </div>

      <Card className="gap-4 py-5">
        <p className="px-5 text-sm font-semibold text-gray-900">Documents</p>
        <div className="space-y-1">
          {company.company_documents.length === 0 ? (
            <p className="px-5 text-sm text-muted-foreground">No documents.</p>
          ) : (
            company.company_documents.map((doc) => (
              <div
                key={doc.id}
                className={cn(
                  "flex flex-row items-center px-5 duration-200",
                  doc.url && "hover:cursor-pointer hover:bg-gray-50",
                )}
                onClick={() => doc.url && onPreviewDoc(doc.url, doc.filename)}
              >
                <CircleCheck className="text-supportive flex-shrink-0" />
                <div className="flex flex-1 items-center gap-3 rounded-[0.16em] p-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800">
                      {doc.type === "other" ? "Company document" : formatLegacyLabel(doc.type)}
                    </p>
                    <p className="text-muted-foreground mt-0.5 truncate text-xs">{doc.filename}</p>
                    {doc.expiry_date && (
                      <p className="text-muted-foreground mt-0.5 text-xs">
                        Expires {formatDateWithoutTime(doc.expiry_date)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      {company.moas.length > 0 ? (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left">
              <th className="pb-2 pr-4 font-medium text-gray-500">Status</th>
              <th className="pb-2 pr-4 font-medium text-gray-500">Document</th>
              <th className="pb-2 pr-4 font-medium text-gray-500">Created</th>
              <th className="pb-2 font-medium text-gray-500">Period</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {company.moas.map((moa) => (
              <tr
                key={moa.id}
                className={cn("align-top", moa.document_url && "cursor-pointer hover:bg-gray-50")}
                onClick={() => moa.document_url && onPreviewDoc(moa.document_url, moa.filename ?? "MOA Document")}
              >
                <td className="py-2.5 pr-4 text-gray-600">
                  <MoaStatusBadge status="active" isExpired={isLegacyMoaExpired(moa.expiry_date, moa.is_perpetual)} />
                </td>
                <td className="py-2.5 pr-4 text-gray-600">
                  {moa.document_url ? (
                    <span className="inline-flex items-center gap-1.5 text-primary">
                      <Eye className="h-3.5 w-3.5" /> {moa.filename ?? "MOA Document"}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                <td className="py-2.5 pr-4 text-gray-600">
                  {formatDateWithoutTime(moa.created_at)}
                </td>
                <td className="py-2.5 text-gray-600">
                  {formatLegacyMoaPeriod(moa)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="text-sm text-muted-foreground">No MOA history.</p>
      )}
    </>
  );
}

function LegacyRecordsSection({ currentCompanyId: companyId }: { currentCompanyId: string | null }) {
  const [open, setOpen] = useState(false);
  const { openModal } = useModal();

  const { data, isLoading } = useQuery({
    queryKey: ["partner-legacy-company", companyId],
    queryFn: () =>
      preconfiguredAxios
        .get(`/api/university/partners/${companyId}/legacy-companies`)
        .then((r) => r.data as { legacyCompany: LegacyCompanyDetail | null }),
    enabled: open && !!companyId,
  });

  const company = data?.legacyCompany;

  return (
    <div className="rounded-[0.33em] border border-gray-200">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-gray-900 hover:bg-gray-50"
      >
        <span>Legacy records</span>
        {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      </button>

      {open && (
        <div className="space-y-4 border-t border-gray-200 p-4">
          {isLoading ? (
            <>
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-16 w-full" />
            </>
          ) : !company ? (
            <p className="text-sm text-muted-foreground">No legacy records matched.</p>
          ) : (
            <ReadOnlyLegacyDetail
              company={company}
              onPreviewDoc={(url, title) =>
                openModal("preview-doc", (
                  <iframe
                    src={url}
                    className="h-full w-full border-none"
                    title={title}
                  />
                ), {
                  title,
                  panelClassName: "!w-full sm:!max-w-4xl",
                  contentClassName: "min-h-0 flex-1 overflow-hidden p-0 sm:p-0",
                  showHeaderDivider: true,
                })
              }
            />
          )}
        </div>
      )}
    </div>
  );
}

export default function PartnersPage() {
  const { account, isLoading: profileLoading } = useUniversityProfile();
  const router = useRouter();
  const queryClient = useQueryClient();


  const [phase, setPhase] = useState<Phase>("list");
  const [detailType, setDetailType] = useState<"partner" | "legacy" | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const { openModal, closeModal } = useModal();
  const modal = useIomModalRegistry();

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

  const { data: legacyData, isLoading: isLegacyLoading } = useQuery({
    queryKey: ["university-legacy-companies"],
    queryFn: () =>
      preconfiguredAxios
        .get("/api/university/legacy-companies")
        .then((r) => r.data as { legacyCompanies: LegacyCompanySummary[] }),
    enabled: !!account,
  });

  const { data: partnerMoasData, isLoading: isMoasLoading } = useQuery({
    queryKey: ["university-partner-moas", detailId],
    queryFn: () =>
      preconfiguredAxios
        .get(`/api/university/partners/${detailId}/moas`)
        .then((r) => r.data as { company: Partner["company"] & { document_review_details?: DocReviewDetails }; moas: PartnerMoaEntry[]; companyDocuments: CompanyDoc[] }),
    enabled: detailType === "partner" && !!detailId,
    refetchInterval: 25 * 60 * 1000,
  });

  const { data: legacyDetailData, isLoading: isLegacyDetailLoading } = useQuery({
    queryKey: ["university-legacy-company-detail", detailId],
    queryFn: () =>
      preconfiguredAxios
        .get(`/api/university/legacy-companies/${detailId}`)
        .then((r) => r.data as { legacyCompany: LegacyCompanyDetail }),
    enabled: detailType === "legacy" && !!detailId,
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["university-partners"] });
    queryClient.invalidateQueries({ queryKey: ["university-blacklist"] });
    queryClient.invalidateQueries({ queryKey: ["university-legacy-companies"] });
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
    },
  });

  const unblacklistMutation = useMutation({
    mutationFn: (companyId: string) =>
      preconfiguredAxios.delete(`/api/university/blacklist/${companyId}`),
    onSuccess: () => {
      refresh();
    },
  });

  const inviteMutation = useMutation({
    mutationFn: (payload: { invitedEmail: string; companyName?: string; personalMessage?: string }) =>
      preconfiguredAxios.post("/api/university/invites", payload),
    onSuccess: () => {
      toast("Invite sent.", toastPresets.success);
      refresh();
    },
    onError: (e: Error) => {
      toast(e.message, toastPresets.destructive);
    },
  });

  const rows = useMemo<PartnerTableRow[]>(() => {
    const map = new Map<string, PartnerTableRow>();

    for (const p of partnersData?.partners ?? []) {
      if (!p.company) continue;
      map.set(`registered:${p.company.id}`, {
        id: `registered:${p.company.id}`,
        displayName: p.company.registered_name,
        partnerCompany: p.company,
        latestMoaId: p.latestMoaId,
        latestMoaStatus: p.latestMoaStatus,
        hasActiveMoa: p.hasActiveMoa,
        effectiveDate: p.effective_date,
        expiryDate: p.expiry_date,
        isPartnerExpired: p.is_expired,
        isBlacklisted: false,
        blacklistEntry: null,
        legacyEntry: null,
        isImported: false,
        contactEmail: null,
      });
    }

    for (const b of blacklistData?.blacklist ?? []) {
      const key = `registered:${b.company_id}`;
      const existing = map.get(key);
      if (existing) {
        existing.isBlacklisted = true;
        existing.blacklistEntry = b;
      } else {
        map.set(key, {
          id: key,
          displayName: b.company.registered_name,
          partnerCompany: { ...b.company, company_type: null },
          latestMoaId: null,
          latestMoaStatus: null,
          hasActiveMoa: false,
          effectiveDate: null,
          expiryDate: null,
          isPartnerExpired: null,
          isBlacklisted: true,
          blacklistEntry: b,
          legacyEntry: null,
          isImported: false,
          contactEmail: null,
        });
      }
    }

    for (const l of legacyData?.legacyCompanies ?? []) {
      const details = l.company_details as Record<string, unknown>;
      const contactEmail = typeof details.contact_email === "string" && details.contact_email.trim()
        ? details.contact_email
        : null;
      map.set(`legacy:${l.id}`, {
        id: `legacy:${l.id}`,
        displayName: l.company_name,
        partnerCompany: null,
        latestMoaId: null,
        latestMoaStatus: null,
        hasActiveMoa: false,
        effectiveDate: null,
        expiryDate: null,
        isPartnerExpired: null,
        isBlacklisted: false,
        blacklistEntry: null,
        legacyEntry: l,
        isImported: true,
        contactEmail,
      });
    }

    return [...map.values()];
  }, [partnersData, blacklistData, legacyData]);

  const listColumns = useMemo<ColumnDef<PartnerTableRow>[]>(
    () => [
      {
        id: "status",
        header: "Status",
        minSize: 130,
        size: 140,
        accessorFn: (row) => {
          if (row.isBlacklisted) return "Blacklisted";
          if (row.isImported && row.legacyEntry) {
            if (!row.legacyEntry.hasMoa) return "None";
            if (row.legacyEntry.hasPerpetualMoa) return "Active";
            if (row.legacyEntry.valid_until && row.legacyEntry.valid_until < new Date().toISOString()) return "Expired";
            return "Active";
          }
          if (row.hasActiveMoa) return "Active";
          if (row.isPartnerExpired) return "Expired";
          if (row.latestMoaStatus === "revoked") return "Revoked";
          return row.latestMoaStatus ?? "None";
        },
        cell: ({ getValue }) => <PartnerStatusBadge status={getValue() as string} />,
      },
      {
        id: "company",
        header: "Company",
        minSize: 280,
        size: 360,
        accessorFn: (row) => row.displayName,
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <p className="font-medium text-gray-900">{row.original.displayName}</p>
            {row.original.isBlacklisted && (
              <span className="inline-flex shrink-0 items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                Blacklisted
              </span>
            )}
          </div>
        ),
      },
      {
        id: "period",
        header: "Period",
        minSize: 220,
        size: 260,
        accessorFn: (row) => {
          if (row.isImported && row.legacyEntry) {
            if (row.legacyEntry.latestMoaIsPerpetual) return "Perpetual";
            if (row.legacyEntry.latestMoaEffectiveDate || row.legacyEntry.latestMoaExpiryDate) {
              const from = row.legacyEntry.latestMoaEffectiveDate
                ? formatDateWithoutTime(row.legacyEntry.latestMoaEffectiveDate)
                : "—";
              const to = row.legacyEntry.latestMoaExpiryDate
                ? formatDateWithoutTime(row.legacyEntry.latestMoaExpiryDate)
                : "—";
              return `${from} – ${to}`;
            }
            return "—";
          }
          if (row.effectiveDate) {
            const from = formatDateWithoutTime(row.effectiveDate);
            const to = row.expiryDate ? formatDateWithoutTime(row.expiryDate) : "Perpetual";
            return `${from} – ${to}`;
          }
          return "—";
        },
      },
      {
        id: "imported",
        header: "Imported",
        minSize: 120,
        size: 130,
        accessorFn: (row) => (row.isImported ? "Yes" : "—"),
        cell: ({ row }) => row.original.isImported ? <Badge className="border-transparent bg-primary gap-1 text-white"><Upload className="h-3.5 w-3.5" />Imported</Badge> : <span className="text-muted-foreground">—</span>,
      },
      {
        id: "actions",
        header: "Actions",
        minSize: 120,
        size: 140,
        cell: ({ row }) => {
          if (row.original.isBlacklisted) return null;
          if (row.original.hasActiveMoa) return null;
          const handleInvite = () => {
            const email = row.original.isImported
              ? (row.original.contactEmail ?? "")
              : "";
            modal.invitePartner.open({
              companyName: row.original.displayName,
              email,
              onInvite: (invitedEmail, companyName) => {
                inviteMutation.mutate({ invitedEmail, companyName: companyName || undefined });
              },
              isPending: inviteMutation.isPending,
            });
          };
          return (
            <Button size="xs" variant="outline" onClick={handleInvite}>
              <UserPlus className="mr-1 h-3.5 w-3.5" /> Invite
            </Button>
          );
        },
      },
    ],
    [],
  );

  const navigateToDetail = (row: PartnerTableRow) => {
    clearTimeout(timerRef.current);
    if (row.isImported && row.legacyEntry) {
      setDetailType("legacy");
      setDetailId(row.legacyEntry.id);
    } else {
      setDetailType("partner");
      setDetailId(row.id.replace("registered:", ""));
    }
    setPhase("to-detail");
    window.history.replaceState(null, "", "#" + row.id);
    timerRef.current = setTimeout(() => setPhase("detail"), ANIM_DURATION + 10);
  };

  const navigateToList = () => {
    clearTimeout(timerRef.current);
    setPhase("to-list");
    window.history.replaceState(null, "", window.location.pathname + window.location.search);
    timerRef.current = setTimeout(() => {
      setPhase("list");
      setDetailType(null);
      setDetailId(null);
    }, ANIM_DURATION + 10);
  };

  if (profileLoading || !account) return null;

  const isLoading = isPartnersLoading || isBlacklistLoading || isLegacyLoading;
  const partnerEntry = detailType === "partner" && detailId
    ? rows.find((r) => r.id === `registered:${detailId}`)
    : null;
  const company = partnerMoasData?.company ?? partnerEntry?.partnerCompany;
  const moas = partnerMoasData?.moas ?? [];
  const legacyCompany = legacyDetailData?.legacyCompany;

  // During "to-detail": list is in-flow (exiting left), detail is absolute (entering from right).
  // During "to-list":  detail is in-flow (exiting right), list is absolute (entering from left).
  const showList = phase !== "detail";
  const showDetailPanel = phase !== "list";

  const getCompanyIdForBlacklist = (row: PartnerTableRow) =>
    row.partnerCompany?.id ?? row.blacklistEntry?.company_id ?? "";

  return (
    <PageContainer className="max-w-7xl">
      <PageHeader
        title="Partners"
        description="Manage your partners."
      />
      {/* overflow-hidden clips the sliding panels; relative enables absolute children */}
      <div className="relative overflow-hidden mt-6">

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
            {isLoading ? (
              <div className="space-y-1">
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : (
              <DataTable
                id="partners-merged-v2"
                columns={listColumns}
                data={rows}
                showRowNumbers={false}
                searchKey="company"
                searchPlaceholder="Search by company..."
                rowLabelSingular="partner"
                rowLabelPlural="partners"
                onRowClick={navigateToDetail}
                getRowClassName={(row) => (row.isBlacklisted ? "bg-red-50" : undefined)}
                toolbarActions={
                  <div className="flex">
                    <Button
                      onClick={() =>
                        openModal("legacy-upload", (
                          <UploadDialog
                            uploadEndpoint="/api/university/legacy-companies"
                            queryKeyPrefix="university-legacy-companies"
                            onClose={() => {
                              closeModal("legacy-upload");
                              queryClient.invalidateQueries({ queryKey: ["university-partners"] });
                              queryClient.invalidateQueries({ queryKey: ["university-legacy-companies"] });
                            }}
                          />
                        ), {
                          title: "Add Legacy Company",
                          description: "Create a legacy company record. You can add MOAs now or later from the company detail view.",
                          panelClassName: "!w-full sm:!max-w-2xl",
                        })
                      }
                      className="rounded-r-none"
                    >
                      <Plus /> Import Partner
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button className="rounded-l-none border-l-0 px-2">
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() =>
                          openModal("csv-upload", (
                            <CsvUploadDialog
                              csvEndpoint="/api/university/legacy-companies/bulk/csv"
                              queryKeyPrefix="university-legacy-companies"
                              onClose={() => {
                                closeModal("csv-upload");
                                queryClient.invalidateQueries({ queryKey: ["university-partners"] });
                                queryClient.invalidateQueries({ queryKey: ["university-legacy-companies"] });
                              }}
                            />
                          ), {
                            title: "Bulk Upload Legacy MOAs",
                            description: "Upload a CSV file to create or append multiple legacy MOAs at once. Each row represents one legacy MOA. Rows with the same company name append MOAs to the same legacy partner.",
                            panelClassName: "!w-full sm:!max-w-5xl",
                          })
                        }>
                          <Upload className="h-4 w-4" />
                          Bulk upload via CSV
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() =>
                          openModal("zip-upload", (
                            <ZipUploadDialog
                              zipEndpoint="/api/university/legacy-companies/bulk/zip"
                              queryKeyPrefix="university-legacy-companies"
                              onClose={() => {
                                closeModal("zip-upload");
                                queryClient.invalidateQueries({ queryKey: ["university-partners"] });
                                queryClient.invalidateQueries({ queryKey: ["university-legacy-companies"] });
                              }}
                            />
                          ), {
                            title: "Bulk Upload Legacy MOAs via ZIP",
                            description: "Upload a ZIP file containing a legacy-import.csv manifest and referenced PDF files. Each CSV row creates or updates one legacy company, and can also add an MOA.",
                            panelClassName: "!w-full sm:!max-w-5xl",
                          })
                        }>
                          <Upload className="h-4 w-4" />
                          Bulk upload via ZIP
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                }
              />
            )}

          </div>
        )}

        {/* ── Detail panel ─────────────────────────────────────────────────── */}
        {showDetailPanel && (
          <div
            className={cn(
              "space-y-4",
              phase === "to-detail" &&
                `absolute inset-x-0 top-0 animate-in slide-in-from-right fade-in duration-${ANIM_DURATION}`,
              phase === "to-list" &&
                `animate-out slide-out-to-right fade-out duration-${ANIM_DURATION}`,
            )}
          >
            {/* Partner detail */}
            {detailType === "partner" && (
              <>
                <div className="flex items-center justify-between gap-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={navigateToList}
                    className="text-muted-foreground hover:text-foreground gap-1.5 px-0"
                  >
                    <ArrowLeft className="h-4 w-4" /> Partners
                  </Button>
                  {partnerEntry &&
                    (partnerEntry.isBlacklisted ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          modal.confirmAction.open({
                            title: `Remove ${partnerEntry.displayName} from the blacklist?`,
                            description: "This re-enables future requests from this company. Previously revoked MOAs will not be restored.",
                            confirmLabel: "Remove",
                            onConfirm: () => unblacklistMutation.mutate(getCompanyIdForBlacklist(partnerEntry)),
                          })
                        }
                      >
                        Un-blacklist
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        scheme="destructive"
                        size="sm"
                        onClick={() =>
                          modal.blacklistPartner.open({
                            companyName: partnerEntry.displayName,
                            onBlacklist: (reason) =>
                              blacklistMutation.mutate({
                                companyId: getCompanyIdForBlacklist(partnerEntry),
                                reason,
                              }),
                            isPending: blacklistMutation.isPending,
                          })
                        }
                      >
                        Blacklist
                      </Button>
                    ))}
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900">{company?.registered_name ?? "—"}</h3>
                  {company?.company_type && (
                    <p className="text-muted-foreground mt-0.5 text-xs">
                      {company.company_type.replace(/_/g, " ")}
                    </p>
                  )}
                </div>

                {partnerEntry?.isBlacklisted && partnerEntry.blacklistEntry && (
                  <div className="border-destructive/30 bg-destructive/5 text-destructive space-y-1 rounded-[0.33em] border p-3 text-sm">
                    <p>
                      This company is <strong>blacklisted</strong> — all active MOAs are revoked and
                      new requests are blocked.
                    </p>
                    {partnerEntry.blacklistEntry.reason && (
                      <p className="text-destructive/80 text-xs">
                        Reason: {partnerEntry.blacklistEntry.reason}
                      </p>
                    )}
                    <p className="text-destructive/60 text-xs">
                      Blacklisted on {formatDateWithoutTime(partnerEntry.blacklistEntry.created_at)}
                      {partnerEntry.blacklistEntry.actor_email && ` by ${partnerEntry.blacklistEntry.actor_email}`}
                    </p>
                  </div>
                )}

                {partnerMoasData?.company?.document_review_details && (
                  <VerifiedDocumentDetails
                    details={partnerMoasData.company.document_review_details}
                  />
                )}
                {partnerMoasData?.companyDocuments && (
                  <DocumentsSection documents={partnerMoasData.companyDocuments} />
                )}

                {isMoasLoading ? (
                  <div className="space-y-1">
                    {[0, 1, 2].map((i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : moas.length > 0 ? (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 text-left">
                        <th className="pb-2 pr-4 font-medium text-gray-500">Status</th>
                        <th className="pb-2 pr-4 font-medium text-gray-500">Template</th>
                        <th className="pb-2 pr-4 font-medium text-gray-500">Requested</th>
                        <th className="pb-2 font-medium text-gray-500">Period</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {moas.map((moa) => (
                        <tr
                          key={moa.id}
                          className="cursor-pointer align-top hover:bg-gray-50"
                          onClick={() => router.push(`/university/moas/${moa.id}`)}
                        >
                          <td className="py-2.5 pr-4">
                            <MoaStatusBadge status={moa.status} isExpired={moa.is_expired} />
                          </td>
                          <td className="py-2.5 pr-4 text-gray-600">{moa.template?.name ?? "—"}</td>
                          <td className="py-2.5 pr-4 text-gray-600">
                            {formatDateWithoutTime(moa.created_at)}
                          </td>
                          <td className="py-2.5 text-gray-600">
                            {moa.effective_date
                              ? `${formatDateWithoutTime(moa.effective_date)} – ${moa.expiry_date ? formatDateWithoutTime(moa.expiry_date) : "Perpetual"}`
                              : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="text-muted-foreground text-sm">No MOA history.</p>
                )}

                <LegacyRecordsSection currentCompanyId={detailId} />
              </>
            )}

            {/* Legacy detail */}
            {detailType === "legacy" && (
              <>
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={navigateToList}
                    className="text-muted-foreground hover:text-foreground gap-1.5 px-0"
                  >
                    <ArrowLeft className="h-4 w-4" /> Partners
                  </Button>
                </div>
                {isLegacyDetailLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-8 w-64" />
                    <Skeleton className="h-32 w-full" />
                    <Skeleton className="h-16 w-full" />
                  </div>
                ) : legacyCompany ? (
                  <ReadOnlyLegacyDetail
                    company={legacyCompany}
                    onPreviewDoc={(url, title) => modal.previewDocument.open(url, title)}
                  />
                ) : (
                  <p className="text-muted-foreground text-sm">Legacy company not found.</p>
                )}
              </>
            )}
          </div>
        )}
      </div>

    </PageContainer>
  );
}
