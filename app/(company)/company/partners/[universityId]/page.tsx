"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { useCompanyControllerListMoas } from "@/app/api";
import { useCompanyProfile } from "@/app/providers/company-profile.provider";
import { PageContainer } from "@/components/page-header";
import { DataTable } from "@/components/ui/data-table";
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

const moaHistoryColumns: ColumnDef<Moa>[] = [
  {
    id: "status",
    header: "Status",
    enableSorting: false,
    cell: ({ row }) => (
      <MoaLink moa={row.original}>
        <div className="whitespace-normal">
          <MoaStatusBadge
            status={row.original.status}
            isExpired={row.original.is_expired}
          />
          {row.original.status === "rejected" &&
            row.original.rejection_reason && (
              <p className="text-muted-foreground mt-0.5 text-xs">
                {row.original.rejection_reason}
              </p>
            )}
        </div>
      </MoaLink>
    ),
  },
  {
    id: "period",
    header: "Period",
    accessorFn: (row) => row.effective_date,
    cell: ({ row }) => (
      <MoaLink moa={row.original}>
        <span className="text-muted-foreground">
          {formatDateWithoutTime(row.original.effective_date)} - {""}
          {row.original.expiry_date
            ? formatDateWithoutTime(row.original.expiry_date)
            : "Perpetual"}
        </span>
      </MoaLink>
    ),
  },
  {
    id: "requested",
    header: "Requested",
    accessorFn: (row) => row.created_at,
    cell: ({ row }) => (
      <MoaLink moa={row.original}>
        <span className="text-muted-foreground">
          {formatDateWithoutTime(row.original.created_at)}
        </span>
      </MoaLink>
    ),
  },
];

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

  const moas = (data?.moas ?? []) as unknown as Moa[];
  const partnerMoas = moas
    .filter((moa) => moa.university?.id === universityId)
    .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
  const university = partnerMoas[0]?.university;
  const activeCount = partnerMoas.filter(
    (moa) => moa.status === "active" && !moa.is_expired,
  ).length;

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

      <DataTable
        id={`company-uni-moas-${university.id}`}
        columns={moaHistoryColumns}
        data={partnerMoas}
        rowLabelSingular="MOA"
        rowLabelPlural="MOAs"
        onRowClick={(moa) => router.push(`/moas/${moa.id}`)}
      />
    </PageContainer>
  );
}
