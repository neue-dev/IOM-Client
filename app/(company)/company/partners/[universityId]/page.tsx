"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useParams, useRouter } from "next/navigation";
import { AlertCircle, ArrowLeft, ArrowRight, CheckCircle2 } from "lucide-react";

import { useCompanyControllerListMoas } from "@/app/api";
import { useCompanyProfile } from "@/app/providers/company-profile.provider";
import { PageContainer } from "@/components/page-header";
import {
  ResourceTable,
  type ResourceTableColumn,
} from "@/components/ui/resource-table";
import { useResourceTable } from "@/components/ui/use-resource-table";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { MoaStatusBadge } from "@/components/status-badge";
import { formatDateWithoutTime } from "@/lib/utils";

interface Moa {
  id: string;
  status: "active" | "rejected";
  is_expired: boolean | null;
  effective_date: string;
  expiry_date: string | null;
  created_at: string;
  rejection_reason: string | null;
  university: {
    id: string;
    registered_name: string;
    logo_url: string | null;
    address: string | null;
  };
}

function MoaLink({ moa, children }: { moa: Moa; children: ReactNode }) {
  return (
    <Link
      href={`/moas/${moa.id}`}
      onClick={(event) => event.stopPropagation()}
      className="block text-inherit"
    >
      {children}
    </Link>
  );
}

function MoaStatus({ moa }: { moa: Moa }) {
  if (moa.status === "active" && !moa.is_expired) {
    return (
      <span className="bg-supportive text-supportive-foreground inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-sm font-semibold">
        <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        Active
      </span>
    );
  }

  if (moa.is_expired) {
    return (
      <span className="bg-destructive text-destructive-foreground inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-sm font-semibold">
        <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        Expired
      </span>
    );
  }

  return (
    <div className="whitespace-normal">
      <MoaStatusBadge status={moa.status} isExpired={moa.is_expired} />
      {moa.status === "rejected" && moa.rejection_reason && (
        <p className="text-muted-foreground mt-0.5 text-xs">
          {moa.rejection_reason}
        </p>
      )}
    </div>
  );
}

function MoaStartDate({ moa }: { moa: Moa }) {
  return (
    <span className="text-muted-foreground text-sm">
      {formatDateWithoutTime(moa.effective_date)}
    </span>
  );
}

function MoaEndDate({ moa }: { moa: Moa }) {
  if (!moa.expiry_date) {
    return (
      <span className="bg-primary/20 text-primary inline-flex rounded-full px-2 py-1 text-sm">
        Perpetual
      </span>
    );
  }

  return (
    <span className="text-muted-foreground text-sm">
      {formatDateWithoutTime(moa.expiry_date)}
    </span>
  );
}

function MoaRequestedDate({ moa }: { moa: Moa }) {
  return (
    <span className="text-muted-foreground text-sm">
      {formatDateWithoutTime(moa.created_at)}
    </span>
  );
}

export default function CompanyPartnerDetailPage() {
  const { universityId } = useParams<{ universityId: string }>();
  const router = useRouter();
  const { company, isLoading: companyLoading } = useCompanyProfile();
  const { data, isLoading: moasLoading } = useCompanyControllerListMoas(
    { limit: 100 },
    { query: { enabled: !!company } },
  );

  const goBack = () => {
    if (window.history.length > 1) {
      router.back();
      return;
    }
    router.replace("/dashboard");
  };

  const moas = (data?.moas ?? []) as unknown as Moa[];
  const partnerMoas = moas
    .filter((moa) => moa.university?.id === universityId)
    .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
  const university = partnerMoas[0]?.university;
  const activeCount = partnerMoas.filter(
    (moa) => moa.status === "active" && !moa.is_expired,
  ).length;

  const columns: Array<ResourceTableColumn<Moa>> = [
    {
      id: "status",
      header: "Status",
      width: "w-[15%]",
      sortable: false,
      render: (moa) => (
        <MoaLink moa={moa}>
          <MoaStatus moa={moa} />
        </MoaLink>
      ),
    },
    {
      id: "start-date",
      header: "Start Date",
      width: "w-[15%]",
      getSortValue: (moa) => moa.effective_date,
      render: (moa) => (
        <MoaLink moa={moa}>
          <MoaStartDate moa={moa} />
        </MoaLink>
      ),
    },
    {
      id: "end-date",
      header: "End Date",
      width: "w-[15%]",
      getSortValue: (moa) => moa.expiry_date ?? "",
      render: (moa) => (
        <MoaLink moa={moa}>
          <MoaEndDate moa={moa} />
        </MoaLink>
      ),
    },
    {
      id: "requested",
      header: "Requested",
      width: "w-[15%]",
      defaultSortDirection: "desc",
      getSortValue: (moa) => moa.created_at,
      render: (moa) => (
        <MoaLink moa={moa}>
          <MoaRequestedDate moa={moa} />
        </MoaLink>
      ),
    },
    {
      id: "action",
      header: <span className="sr-only">Action</span>,
      width: "w-[40%]",
      align: "right",
      sortable: false,
      render: (moa) => (
        <MoaLink moa={moa}>
          <ArrowRight
            className="text-primary ml-auto h-4 w-4 transition-transform group-hover:translate-x-0.5"
            aria-hidden="true"
          />
        </MoaLink>
      ),
    },
  ];

  const table = useResourceTable({
    data: partnerMoas,
    getRowId: (moa) => moa.id,
    columns,
    sort: {
      initialColumn: "requested",
      initialDirection: "desc",
    },
    pagination: { pageSize: 20 },
  });

  if (companyLoading || moasLoading) {
    return (
      <PageContainer className="space-y-6">
        <Skeleton className="h-5 w-28" />
        <Skeleton className="h-12 w-72 max-w-full" />
        <Skeleton className="h-72 w-full" />
      </PageContainer>
    );
  }
  if (!company) return null;

  if (!university) {
    return (
      <PageContainer className="space-y-4">
        <button
          type="button"
          onClick={goBack}
          className="text-muted-foreground hover:text-foreground inline-flex cursor-pointer items-center gap-1.5 text-sm"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Partners
        </button>
        <Card>
          <CardContent className="text-destructive py-8 text-center text-sm">
            Partner university not found.
          </CardContent>
        </Card>
      </PageContainer>
    );
  }

  return (
    <PageContainer className="space-y-4">
      <button
        type="button"
        onClick={goBack}
        className="text-muted-foreground hover:text-foreground inline-flex cursor-pointer items-center gap-1.5 text-sm"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Partners
      </button>

      <div>
        <h1 className="font-semibold text-gray-900">
          {university.registered_name}
        </h1>
        <p className="text-muted-foreground mt-0.5 text-xs">
          {activeCount} active MOA{activeCount === 1 ? "" : "s"} - {""}
          {partnerMoas.length} total
        </p>
      </div>

      <ResourceTable
        table={table}
        className="[&_td]:py-2"
        onRowClick={(moa) => router.push(`/moas/${moa.id}`)}
        renderMobileRow={(moa) => (
          <Link
            href={`/moas/${moa.id}`}
            className="group block px-4 py-4 text-left transition-colors hover:bg-primary/[0.035] focus-visible:bg-primary/[0.035] focus-visible:outline-none"
          >
            <div className="flex items-start justify-between gap-3">
              <MoaStatus moa={moa} />
              <ArrowRight
                className="text-primary mt-1 h-4 w-4 shrink-0"
                aria-hidden="true"
              />
            </div>
            <div className="mt-3 space-y-1 text-sm">
              <p>
                <span className="font-medium text-gray-700">Start: </span>
                <MoaStartDate moa={moa} />
              </p>
              <p>
                <span className="font-medium text-gray-700">End: </span>
                <MoaEndDate moa={moa} />
              </p>
              <p>
                <span className="font-medium text-gray-700">Requested: </span>
                <MoaRequestedDate moa={moa} />
              </p>
            </div>
          </Link>
        )}
        emptyState={{
          title: "No MOAs found",
          description: "This partner does not have any MOA history yet.",
        }}
        rowLabelSingular="MOA"
        rowLabelPlural="MOAs"
      />
    </PageContainer>
  );
}
