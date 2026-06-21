"use client";
import { useState, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useUniversityProfile } from "@/app/providers/university-profile.provider";
import { preconfiguredAxios } from "@/app/api/preconfig.axios";
import { PageContainer, PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle, CheckCircle2, Loader2, Upload } from "lucide-react";

export default function UniversityProfilePage() {
  const { account, isLoading, isSuperadmin } = useUniversityProfile();
  const queryClient = useQueryClient();
  const sigRef = useRef<HTMLInputElement>(null);
  const logoRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<Record<string, string>>({});

  const { data } = useQuery({
    queryKey: ["university-profile"],
    queryFn: () =>
      preconfiguredAxios
        .get("/api/university/profile")
        .then((r) => r.data as { university: any }),
    enabled: !!account,
  });

  const uni = data?.university;

  const patchProfile = useMutation({
    mutationFn: () =>
      preconfiguredAxios.patch("/api/university/profile", {
        registered_name: get("registered_name"),
        address: get("address"),
        rep_name: get("rep_name"),
        rep_title: get("rep_title"),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["university-profile"] });
      queryClient.invalidateQueries({ queryKey: ["university-me"] });
      toast.success("Profile saved");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const uploadLogo = useMutation({
    mutationFn: (file: File) => {
      const fd = new FormData();
      fd.append("file", file);
      return preconfiguredAxios.post("/api/university/profile/logo", fd);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["university-profile"] });
      toast.success("Logo uploaded");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const uploadSig = useMutation({
    mutationFn: (file: File) => {
      const fd = new FormData();
      fd.append("file", file);
      return preconfiguredAxios.post("/api/university/profile/signature", fd);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["university-profile"] });
      toast.success("Signature uploaded");
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (isLoading || !account) return null;

  function get(key: string): string {
    return key in form ? form[key] : (uni?.[key] ?? "");
  }
  function set(key: string, val: string) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  const signatoryComplete =
    uni?.rep_name && uni?.rep_title && uni?.rep_signature_url;

  return (
    <PageContainer className="max-w-2xl space-y-6">
      <PageHeader
        title="University profile"
        description="Institution details and the signatory used on your MOA templates."
      />

      {!signatoryComplete && isSuperadmin && (
        <div className="border-warning/30 bg-warning/10 flex items-start gap-3 rounded-[0.33em] border p-4 text-sm">
          <AlertTriangle className="text-warning mt-0.5 h-4 w-4 flex-shrink-0" />
          <p className="text-gray-700">
            Complete the institution signatory (name, title, and signature image)
            before you can offer MOA templates to companies.
          </p>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Institution info</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            { key: "registered_name", label: "Registered name" },
            {
              key: "address",
              label: "Address (used as execution place in MOAs)",
            },
          ].map(({ key, label }) => (
            <div key={key} className="space-y-1.5">
              <Label htmlFor={key}>{label}</Label>
              <Input
                id={key}
                value={get(key)}
                onChange={(e) => set(key, e.target.value)}
                disabled={!isSuperadmin}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Institution signatory</CardTitle>
          <p className="text-muted-foreground text-xs">
            Signs all offered MOA templates.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            { key: "rep_name", label: "Signatory name" },
            { key: "rep_title", label: "Signatory title" },
          ].map(({ key, label }) => (
            <div key={key} className="space-y-1.5">
              <Label htmlFor={key}>{label}</Label>
              <Input
                id={key}
                value={get(key)}
                onChange={(e) => set(key, e.target.value)}
                disabled={!isSuperadmin}
              />
            </div>
          ))}

          <div className="space-y-2">
            <Label>Signature image</Label>
            {uni?.rep_signature_url && (
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
            {isSuperadmin && (
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
                {uni?.rep_signature_url ? "Replace signature" : "Upload signature"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {isSuperadmin && (
        <div>
          <Button
            onClick={() => patchProfile.mutate()}
            disabled={patchProfile.isPending}
          >
            {patchProfile.isPending && <Loader2 className="animate-spin" />}
            {patchProfile.isPending ? "Saving…" : "Save profile"}
          </Button>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Logo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {uni?.logo_url && (
            <p className="text-supportive flex items-center gap-1.5 text-xs">
              <CheckCircle2 className="h-3.5 w-3.5" /> Logo uploaded
            </p>
          )}
          <input
            ref={logoRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) uploadLogo.mutate(f);
            }}
          />
          {isSuperadmin && (
            <Button
              variant="outline"
              onClick={() => logoRef.current?.click()}
              disabled={uploadLogo.isPending}
            >
              {uploadLogo.isPending ? (
                <Loader2 className="animate-spin" />
              ) : (
                <Upload />
              )}
              {uni?.logo_url ? "Replace logo" : "Upload logo"}
            </Button>
          )}
        </CardContent>
      </Card>
    </PageContainer>
  );
}
