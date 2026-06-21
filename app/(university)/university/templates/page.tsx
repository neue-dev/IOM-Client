"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useUniversityProfile } from "@/app/providers/university-profile.provider";
import { preconfiguredAxios } from "@/app/api/preconfig.axios";
import { PageContainer, PageHeader, EmptyState } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";

interface TemplateOffer {
  id: string;
  is_available: boolean;
  template: {
    id: string;
    name: string;
    description: string | null;
    term_months: number;
    is_deleted: boolean | null;
  };
}

export default function UniversityTemplatesPage() {
  const { account, isLoading, isSuperadmin } = useUniversityProfile();
  const router = useRouter();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!isLoading && !isSuperadmin) router.replace("/university/dashboard");
  }, [isLoading, isSuperadmin, router]);

  const { data, isLoading: tLoading } = useQuery({
    queryKey: ["university-templates"],
    queryFn: () =>
      preconfiguredAxios
        .get("/api/university/templates")
        .then((r) => r.data as { templates: TemplateOffer[] }),
    enabled: !!account && isSuperadmin,
  });

  const toggle = useMutation({
    mutationFn: ({
      templateId,
      is_available,
    }: {
      templateId: string;
      is_available: boolean;
    }) =>
      preconfiguredAxios.put(`/api/university/templates/${templateId}`, {
        is_available,
      }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["university-templates"] }),
    onError: (e: any) => toast.error(e.message),
  });

  if (isLoading || !account || !isSuperadmin) return null;

  const offers = (data?.templates ?? []).filter((o) => !o.template.is_deleted);

  return (
    <PageContainer className="space-y-6">
      <PageHeader
        title="Offered templates"
        description="Choose which catalog templates your university offers to companies. Your institution signatory must be set on your profile first."
      />

      {tLoading ? (
        <div className="space-y-2.5">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : offers.length === 0 ? (
        <EmptyState title="No templates in the catalog yet" />
      ) : (
        <div className="space-y-2.5">
          {offers.map((offer) => (
            <Card
              key={offer.id}
              className="flex-row items-center justify-between gap-4 px-5 py-4"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900">
                  {offer.template.name}
                </p>
                {offer.template.description && (
                  <p className="text-muted-foreground mt-0.5 text-xs">
                    {offer.template.description}
                  </p>
                )}
                <p className="text-muted-foreground mt-0.5 text-xs">
                  Term: {offer.template.term_months} months
                </p>
              </div>
              <Switch
                checked={offer.is_available}
                disabled={toggle.isPending}
                onCheckedChange={(checked) =>
                  toggle.mutate({
                    templateId: offer.template.id,
                    is_available: checked,
                  })
                }
                aria-label={`Offer ${offer.template.name}`}
              />
            </Card>
          ))}
        </div>
      )}
    </PageContainer>
  );
}
