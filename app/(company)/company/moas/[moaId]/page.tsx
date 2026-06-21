"use client";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import Link from "next/link";
import { preconfiguredAxios } from "@/app/api/preconfig.axios";
import { PageContainer } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { MoaStatusBadge } from "@/components/status-badge";
import { formatDateWithoutTime } from "@/lib/utils";
import { ArrowLeft, ExternalLink, FileText } from "lucide-react";

export default function CompanyMoaDetailPage() {
  const { moaId } = useParams<{ moaId: string }>();

  const { data, isLoading } = useQuery({
    queryKey: ["company-moa", moaId],
    queryFn: () =>
      preconfiguredAxios
        .get(`/api/company/moas/${moaId}`)
        .then((r) => r.data as { moa: any; pdfUrl: string | null }),
    enabled: !!moaId,
  });

  if (isLoading) {
    return (
      <PageContainer className="max-w-3xl space-y-6">
        <Skeleton className="h-5 w-28" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-[60vh] w-full" />
      </PageContainer>
    );
  }
  if (!data?.moa) {
    return (
      <PageContainer className="max-w-3xl">
        <Card>
          <CardContent className="text-destructive py-8 text-center text-sm">
            MOA not found.
          </CardContent>
        </Card>
      </PageContainer>
    );
  }

  const { moa, pdfUrl } = data;

  return (
    <PageContainer className="max-w-3xl space-y-6">
      <Link
        href="/company/dashboard"
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm"
      >
        <ArrowLeft className="h-4 w-4" /> Dashboard
      </Link>

      <Card>
        <CardContent className="space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="truncate text-xl font-semibold text-gray-900">
                {moa.university.registered_name}
              </h1>
              <p className="text-muted-foreground mt-1 text-sm">
                {formatDateWithoutTime(moa.effective_date)} &ndash;{" "}
                {formatDateWithoutTime(moa.expiry_date)}
              </p>
            </div>
            <MoaStatusBadge status={moa.status} isExpired={moa.is_expired} />
          </div>

          {moa.status === "rejected" && moa.rejection_reason && (
            <div className="border-destructive/30 bg-destructive/5 text-destructive rounded-[0.33em] border p-3 text-sm">
              <span className="font-medium">Rejection reason:</span>{" "}
              {moa.rejection_reason}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 border-t border-gray-100 pt-4 text-sm">
            <div>
              <p className="text-muted-foreground mb-1 text-xs">Template</p>
              <p className="text-gray-700">{moa.template?.name ?? "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground mb-1 text-xs">Requested</p>
              <p className="text-gray-700">
                {formatDateWithoutTime(moa.created_at)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {pdfUrl ? (
        <Card className="overflow-hidden p-0">
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
            <p className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <FileText className="text-muted-foreground h-4 w-4" /> MOA document
            </p>
            <Button asChild variant="ghost" size="sm">
              <a href={pdfUrl} target="_blank" rel="noreferrer">
                Open <ExternalLink />
              </a>
            </Button>
          </div>
          <iframe src={pdfUrl} className="h-[70vh] w-full" title="MOA PDF" />
        </Card>
      ) : (
        <Card>
          <CardContent className="text-muted-foreground py-10 text-center text-sm">
            PDF not available.
          </CardContent>
        </Card>
      )}
    </PageContainer>
  );
}
