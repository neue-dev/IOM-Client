"use client";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { preconfiguredAxios } from "@/app/api/preconfig.axios";
import { PageContainer } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTable } from "@/components/ui/data-table";
import { LegacyCompaniesPanel } from "@/components/legacy-companies/legacy-companies-panel";
import { ArrowLeft, CircleAlert, CircleCheck, ShieldCheck } from "lucide-react";
import { formatDateWithoutTime } from "@/lib/utils";
import { MoaStatusBadge } from "@/components/status-badge";

interface University {
  id: string;
  registered_name: string;
  is_deactivated: boolean | null;
}

interface PartnerCompany {
  id: string;
  registered_name: string;
  company_type: string | null;
}

interface Partner {
  company: PartnerCompany | null;
  latestMoaId: string;
}

interface BlacklistEntry {
  id: string;
  company_id: string;
  reason: string | null;
  created_at: string;
  actor_email: string | null;
  company: { id: string; registered_name: string } | null;
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

type DocReviewDetails = Record<string, { type?: string; document?: string; value: string }>;

interface CompanyDoc {
  type: string;
  filename: string;
  url: string | null;
}

interface PartnerMoasData {
  company: PartnerCompany & { document_review_details?: DocReviewDetails };
  moas: PartnerMoaEntry[];
  companyDocuments: CompanyDoc[];
}

interface CombinedEntry {
  company: PartnerCompany;
  latestMoaId: string;
  isBlacklisted: boolean;
  blacklistEntry: BlacklistEntry | null;
}

const DOC_LABELS: Record<string, string> = {
  business_permit: "Business Permit",
  mayor_permit: "Mayor's Permit",
  sec_dti_registration: "SEC/DTI Registration",
};

const DOC_TYPES_LIST = Object.entries(DOC_LABELS);

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

export default function AdminUniversityPartnersPage() {
  const { universityId } = useParams<{ universityId: string }>();
  const router = useRouter();

  const [currentCompanyId, setCurrentCompanyId] = useState<string | null>(null);
  const [currentLegacyCompanyId, setCurrentLegacyCompanyId] = useState<string | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [activeTab, setActiveTab] = useState("iom-partners");

  const { data: uniData, isLoading: uniLoading } = useQuery({
    queryKey: ["admin-university", universityId],
    queryFn: () =>
      preconfiguredAxios
        .get(`/api/admin/universities/${universityId}`)
        .then((r) => r.data.university as University),
    enabled: !!universityId,
  });

  const { data: partnersData, isLoading: partnersLoading } = useQuery({
    queryKey: ["admin-university-partners", universityId],
    queryFn: () =>
      preconfiguredAxios
        .get(`/api/admin/universities/${universityId}/partners`)
        .then((r) => r.data as { university: University; partners: Partner[]; blacklist: BlacklistEntry[] }),
    enabled: !!universityId,
  });

  const { data: partnerMoasData, isLoading: moasLoading } = useQuery({
    queryKey: ["admin-university-partner-moas", universityId, currentCompanyId],
    queryFn: () =>
      preconfiguredAxios
        .get(`/api/admin/universities/${universityId}/partners/${currentCompanyId}/moas`)
        .then((r) => r.data as PartnerMoasData),
    enabled: !!currentCompanyId,
  });

  const combined = useMemo<CombinedEntry[]>(() => {
    if (!partnersData) return [];
    const map = new Map<string, CombinedEntry>();
    for (const p of partnersData.partners) {
      if (!p.company) continue;
      map.set(p.company.id, {
        company: p.company,
        latestMoaId: p.latestMoaId,
        isBlacklisted: false,
        blacklistEntry: null,
      });
    }
    for (const b of partnersData.blacklist) {
      const existing = map.get(b.company_id);
      if (existing) {
        existing.isBlacklisted = true;
        existing.blacklistEntry = b;
      } else if (b.company) {
        map.set(b.company_id, {
          company: { ...b.company, company_type: null },
          latestMoaId: "",
          isBlacklisted: true,
          blacklistEntry: b,
        });
      }
    }
    return [...map.values()];
  }, [partnersData]);

  const listColumns = useMemo<ColumnDef<CombinedEntry>[]>(
    () => [
      {
        id: "company",
        header: "Company",
        accessorFn: (row) => row.company.registered_name,
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <p className="font-medium text-gray-900">{row.original.company.registered_name}</p>
            {row.original.isBlacklisted && (
              <span className="inline-flex shrink-0 items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                Blacklisted
              </span>
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

  const entry = currentCompanyId ? combined.find((e) => e.company.id === currentCompanyId) : null;
  const company = partnerMoasData?.company ?? entry?.company;
  const moas = partnerMoasData?.moas ?? [];
  const isIomDetail = activeTab === "iom-partners" && showDetail;
  const isLegacyDetail = activeTab === "legacy-companies" && !!currentLegacyCompanyId;
  const isPartnerDetail = isIomDetail || isLegacyDetail;

  if (!uniData && !uniLoading) {
    return (
      <PageContainer>
        <p className="text-destructive text-sm">University not found.</p>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <button
        onClick={() => {
          if (isIomDetail) {
            setShowDetail(false);
            setCurrentCompanyId(null);
          } else if (isLegacyDetail) {
            setCurrentLegacyCompanyId(null);
          } else {
            router.push("/admin/universities");
          }
        }}
        className="text-muted-foreground hover:text-foreground mb-4 inline-flex cursor-pointer items-center gap-1.5 text-sm"
      >
        <ArrowLeft className="h-4 w-4" /> {isPartnerDetail ? "Partners" : "Universities"}
      </button>

      {uniLoading ? (
        <div className="space-y-2 mb-6">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-4 w-32" />
        </div>
      ) : (
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900 mb-6">
          {uniData?.registered_name}
        </h1>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="iom-partners">IOM Partners</TabsTrigger>
          <TabsTrigger value="legacy-companies">Legacy Companies</TabsTrigger>
        </TabsList>

        <TabsContent value="iom-partners" className="mt-4">
          {!showDetail && (
            <>
              {partnersLoading ? (
                <div className="space-y-1">
                  {[0, 1, 2].map((i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : (
                <DataTable
                  id="admin-university-partners"
                  columns={listColumns}
                  data={combined}
                  searchKey="company"
                  searchPlaceholder="Search by company..."
                  rowLabelSingular="partner"
                  rowLabelPlural="partners"
                  onRowClick={(e) => {
                    setCurrentCompanyId(e.company.id);
                    setShowDetail(true);
                  }}
                  getRowClassName={(row) => (row.isBlacklisted ? "bg-red-50" : undefined)}
                />
              )}
            </>
          )}

          {showDetail && (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-gray-900">{company?.registered_name ?? "—"}</h3>
                {company?.company_type && (
                  <p className="text-muted-foreground mt-0.5 text-xs">
                    {company.company_type.replace(/_/g, " ")}
                  </p>
                )}
              </div>

              {entry?.isBlacklisted && entry.blacklistEntry && (
                <div className="border-destructive/30 bg-destructive/5 text-destructive space-y-1 rounded-[0.33em] border p-3 text-sm">
                  <p>
                    This company is <strong>blacklisted</strong>.
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
                <VerifiedDocumentDetails details={partnerMoasData.company.document_review_details} />
              )}

              {partnerMoasData?.companyDocuments && partnerMoasData.companyDocuments.length > 0 && (
                <Card className="gap-4 py-5">
                  <p className="px-5 text-sm font-semibold text-gray-900">Documents</p>
                  <div className="space-y-1">
                    {DOC_TYPES_LIST.map(([type, label]) => {
                      const doc = partnerMoasData.companyDocuments.find((d) => d.type === type);
                      return (
                        <div key={type} className="flex flex-row items-center px-5 duration-200">
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
              )}

              {moasLoading ? (
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
                        onClick={() => router.push(`/admin/universities/${universityId}/moas/${moa.id}`)}
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
                            ? `${formatDateWithoutTime(moa.effective_date)} – ${formatDateWithoutTime(moa.expiry_date)}`
                            : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-muted-foreground text-sm">No MOA history.</p>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="legacy-companies" className="mt-4">
          <LegacyCompaniesPanel
            listEndpoint={`/api/admin/universities/${universityId}/legacy-companies`}
            uploadEndpoint={`/api/admin/universities/${universityId}/legacy-companies`}
            detailEndpoint={(id) => `/api/admin/universities/${universityId}/legacy-companies/${id}`}
            addDocumentsEndpoint={(id) => `/api/admin/universities/${universityId}/legacy-companies/${id}/documents`}
            canUpload={true}
            queryKeyPrefix="admin-university-legacy-companies"
            selectedId={currentLegacyCompanyId}
            onSelectedIdChange={setCurrentLegacyCompanyId}
            showDetailBackButton={false}
          />
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
}
