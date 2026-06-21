"use client";
import { useState, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useCompanyProfile } from "@/app/providers/company-profile.provider";
import { preconfiguredAxios } from "@/app/api/preconfig.axios";
import { PageContainer, PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { CheckCircle2, Loader2, Upload } from "lucide-react";

const COMPANY_TYPES = [
  { value: "corporation", label: "Corporation" },
  { value: "partnership", label: "Partnership" },
  { value: "sole_proprietorship", label: "Sole Proprietorship" },
  { value: "government_agency", label: "Government Agency" },
];

const DOC_TYPES = [
  { value: "business_permit", label: "Business Permit" },
  { value: "sec_dti_registration", label: "SEC/DTI Registration" },
  { value: "mayor_permit", label: "Mayor's Permit" },
  { value: "or_registration", label: "Official Receipt (OR)" },
];

export default function CompanyProfilePage() {
  const { company, isLoading } = useCompanyProfile();
  const queryClient = useQueryClient();
  const sigRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<Record<string, string>>({});

  const { data: docsData, refetch: refetchDocs } = useQuery({
    queryKey: ["company-docs"],
    queryFn: () =>
      preconfiguredAxios.get("/api/company/documents").then((r) => r.data),
    enabled: !!company,
  });

  const patchProfile = useMutation({
    mutationFn: () =>
      preconfiguredAxios.patch("/api/company/profile", {
        registered_name: get("registered_name"),
        company_type: get("company_type") || undefined,
        registered_address: get("registered_address"),
        rep_name: get("rep_name"),
        rep_title: get("rep_title"),
        description: get("description"),
        website: get("website"),
        phone: get("phone"),
        industry: get("industry"),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company-me"] });
      toast.success("Profile saved");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const uploadSig = useMutation({
    mutationFn: (file: File) => {
      const fd = new FormData();
      fd.append("file", file);
      return preconfiguredAxios.post("/api/company/profile/signature", fd);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company-me"] });
      toast.success("Signature uploaded");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const uploadDoc = useMutation({
    mutationFn: ({ file, type }: { file: File; type: string }) => {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("type", type);
      return preconfiguredAxios.post("/api/company/documents", fd);
    },
    onSuccess: () => {
      refetchDocs();
      toast.success("Document uploaded");
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (isLoading) return null;
  if (!company) return null;

  function get(key: string): string {
    return key in form
      ? form[key]
      : ((company as any)?.[key] ?? (company?.cosmetic as any)?.[key] ?? "");
  }
  function set(key: string, val: string) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  const docs = (docsData?.documents ?? []) as Array<{
    id: string;
    type: string;
    filename: string;
    uploaded_at: string;
  }>;
  const latestDoc = (type: string) => docs.find((d) => d.type === type);

  return (
    <PageContainer className="max-w-2xl space-y-6">
      <PageHeader
        title="Company profile"
        description="Keep your details current — these appear on your MOAs."
      />

      <Card>
        <CardContent className="text-sm">
          <p className="text-muted-foreground mb-1 text-xs">
            Representative email (managed by platform admin)
          </p>
          <p className="text-gray-800">{company.rep_email}</p>
        </CardContent>
      </Card>

      {/* Material fields */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Material fields</CardTitle>
          <p className="text-warning text-xs">
            Editing these notifies your active MOA partners.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            { key: "registered_name", label: "Legal / registered name" },
            { key: "registered_address", label: "Registered address" },
            { key: "rep_name", label: "Representative name" },
            { key: "rep_title", label: "Representative title" },
          ].map(({ key, label }) => (
            <div key={key} className="space-y-1.5">
              <Label htmlFor={key}>{label}</Label>
              <Input
                id={key}
                value={get(key)}
                onChange={(e) => set(key, e.target.value)}
              />
            </div>
          ))}
          <div className="space-y-1.5">
            <Label>Company type</Label>
            <Select
              value={get("company_type") || undefined}
              onValueChange={(v) => set("company_type", v)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a type" />
              </SelectTrigger>
              <SelectContent>
                {COMPANY_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Cosmetic fields */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Other info</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            { key: "description", label: "Description" },
            { key: "website", label: "Website" },
            { key: "phone", label: "Phone" },
            { key: "industry", label: "Industry" },
          ].map(({ key, label }) => (
            <div key={key} className="space-y-1.5">
              <Label htmlFor={key}>{label}</Label>
              <Input
                id={key}
                value={get(key)}
                onChange={(e) => set(key, e.target.value)}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <div>
        <Button
          onClick={() => patchProfile.mutate()}
          disabled={patchProfile.isPending}
        >
          {patchProfile.isPending && <Loader2 className="animate-spin" />}
          {patchProfile.isPending ? "Saving…" : "Save profile"}
        </Button>
      </div>

      {/* Signature */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Representative signature</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {company.rep_signature_url && (
            <p className="text-supportive flex items-center gap-1.5 text-xs">
              <CheckCircle2 className="h-3.5 w-3.5" /> Signature uploaded
            </p>
          )}
          <input
            ref={sigRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) uploadSig.mutate(f);
            }}
          />
          <Button
            variant="outline"
            onClick={() => sigRef.current?.click()}
            disabled={uploadSig.isPending}
          >
            {uploadSig.isPending ? (
              <Loader2 className="animate-spin" />
            ) : (
              <Upload />
            )}
            {company.rep_signature_url ? "Replace signature" : "Upload signature"}
          </Button>
        </CardContent>
      </Card>

      {/* Required documents */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Required documents</CardTitle>
          <p className="text-muted-foreground text-xs">
            All four are required before you can request MOAs.
          </p>
        </CardHeader>
        <CardContent className="space-y-2.5">
          {DOC_TYPES.map(({ value, label }) => {
            const existing = latestDoc(value);
            return (
              <div
                key={value}
                className="flex items-center justify-between gap-3 rounded-[0.33em] border border-gray-200 p-3"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-gray-800">{label}</p>
                    {existing ? (
                      <Badge type="supportive" strength="medium">
                        Uploaded
                      </Badge>
                    ) : (
                      <Badge type="default" strength="light">
                        Missing
                      </Badge>
                    )}
                  </div>
                  {existing && (
                    <p className="text-muted-foreground mt-0.5 truncate text-xs">
                      {existing.filename}
                    </p>
                  )}
                </div>
                <label
                  className={cn(
                    buttonVariants({ variant: "outline", size: "sm" }),
                    "flex-shrink-0 cursor-pointer"
                  )}
                >
                  {existing ? "Replace" : "Upload"}
                  <input
                    type="file"
                    accept="application/pdf"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) uploadDoc.mutate({ file: f, type: value });
                    }}
                  />
                </label>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </PageContainer>
  );
}
