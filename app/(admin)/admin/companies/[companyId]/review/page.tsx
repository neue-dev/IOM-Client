"use client";
import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { ColumnDef } from "@tanstack/react-table";
import { preconfiguredAxios } from "@/app/api/preconfig.axios";
import { PageContainer } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTable } from "@/components/ui/data-table";
import * as AccordionPrimitive from "@radix-ui/react-accordion";
import {
  Accordion,
  AccordionItem,
  AccordionContent,
} from "@/components/ui/accordion";
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
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { formatDateWithoutTime } from "@/lib/utils";
import { ArrowLeft, Check, Loader2, Plus, Trash2, X } from "lucide-react";

interface ReviewDoc {
  type: string;
  filename: string;
  url: string | null;
}

interface HistoryEntry {
  id: string;
  status: "approved" | "rejected" | "superseded" | null;
  created_at: string;
  reviewed_at: string | null;
  reviewer_email: string | null;
  rejection_reason: string | null;
  document_review_details: Record<string, Record<string, string>>;
  material: Record<string, string | null> | null;
  documents: ReviewDoc[];
}

interface ReviewDetail {
  company: {
    id: string;
    display_name: string;
    registered_name: string | null;
    email: string;
    company_type: string | null;
  };
  history: HistoryEntry[];
  openReviewId: string | null;
}

const FIELD_LABELS: Record<string, string> = {
  registered_name: "Legal name",
  company_type: "Company type",
  registered_address: "Address",
};

const DOC_LABELS: Record<string, string> = {
  business_permit: "Business Permit",
  mayor_permit: "Mayor's Permit",
  or_registration: "OR Registration",
  sec_dti_registration: "SEC/DTI Registration",
};

function ReviewStatusBadge({ status }: { status: HistoryEntry["status"] }) {
  if (status === null) return <Badge type="warning">Pending</Badge>;
  if (status === "approved") return <Badge type="supportive">Approved</Badge>;
  if (status === "rejected") return <Badge type="destructive">Rejected</Badge>;
  return <Badge type="default">{status}</Badge>;
}

function MaterialFields({ entry }: { entry: HistoryEntry }) {
  return (
    <div className="divide-y divide-gray-100 rounded-[0.33em] border border-gray-200">
      {Object.entries(FIELD_LABELS).map(([key, label]) => (
        <div key={key} className="flex items-start gap-4 px-3 py-2">
          <p className="text-muted-foreground w-44 flex-shrink-0 text-xs">{label}</p>
          <p className="min-w-0 flex-1 text-sm font-medium text-gray-900">
            {entry.material?.[key]
              ? key === "company_type"
                ? entry.material[key]!.replace(/_/g, " ")
                : entry.material[key]
              : "—"}
          </p>
        </div>
      ))}
    </div>
  );
}

type DocDetails = Record<string, Record<string, string>>;

function docDetailsComplete(docs: ReviewDoc[], details: DocDetails): boolean {
  if (docs.length === 0) return false;
  return docs.every((doc) => {
    const pairs = details[doc.type];
    return (
      pairs &&
      Object.keys(pairs).length > 0 &&
      Object.entries(pairs).every(([k, v]) => k.trim() && v.trim())
    );
  });
}

function DocumentsEditor({
  entry,
  value,
  onChange,
}: {
  entry: HistoryEntry;
  value: DocDetails;
  onChange: (next: DocDetails) => void;
}) {
  if (entry.documents.length === 0) return null;

  const addRow = (docType: string) => {
    const existing = value[docType] ?? {};
    onChange({ ...value, [docType]: { ...existing, "": "" } });
  };

  const updateKey = (docType: string, oldKey: string, newKey: string) => {
    const pairs = { ...(value[docType] ?? {}) };
    const val = pairs[oldKey] ?? "";
    delete pairs[oldKey];
    pairs[newKey] = val;
    onChange({ ...value, [docType]: pairs });
  };

  const updateVal = (docType: string, key: string, newVal: string) => {
    onChange({ ...value, [docType]: { ...(value[docType] ?? {}), [key]: newVal } });
  };

  const removeRow = (docType: string, key: string) => {
    const pairs = { ...(value[docType] ?? {}) };
    delete pairs[key];
    onChange({ ...value, [docType]: pairs });
  };

  return (
    <div className="divide-y divide-gray-100 rounded-[0.33em] border border-gray-200">
      {entry.documents.map((doc) => {
        const pairs = Object.entries(value[doc.type] ?? {});
        return (
          <div key={doc.type} className="flex gap-0">
            {/* Left: label + open link */}
            <div className="flex w-44 flex-shrink-0 flex-col justify-start gap-1 py-2 pl-3 pr-3">
              <span className="text-muted-foreground text-xs">
                {DOC_LABELS[doc.type] ?? doc.type}
              </span>
              {doc.url ? (
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
            {/* Vertical divider */}
            <div className="w-px self-stretch bg-gray-100" />
            {/* Right: KV editor */}
            <div className="min-w-0 flex-1 space-y-1.5 py-2 pl-3 pr-3">
              {pairs.map(([key, val], i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <Input
                    className="h-7 text-xs"
                    placeholder="Field name"
                    value={key}
                    onChange={(e) => updateKey(doc.type, key, e.target.value)}
                  />
                  <Input
                    className="h-7 text-xs"
                    placeholder="Value"
                    value={val}
                    onChange={(e) => updateVal(doc.type, key, e.target.value)}
                  />
                  <Button
                    variant="ghost"
                    scheme="destructive"
                    size="xs"
                    className="h-6 w-6 flex-shrink-0 p-0"
                    onClick={() => removeRow(doc.type, key)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
              <Button
                variant="outline"
                size="xs"
                className="w-full border-dashed border-primary text-primary opacity-60 hover:opacity-100"
                onClick={() => addRow(doc.type)}
              >
                <Plus className="h-3 w-3" /> Add field
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DocumentsReadOnly({ entry, details }: { entry: HistoryEntry; details: DocDetails }) {
  if (entry.documents.length === 0) return null;
  return (
    <div className="divide-y divide-gray-100 rounded-[0.33em] border border-gray-200">
      {entry.documents.map((doc) => {
        const pairs = Object.entries(details[doc.type] ?? {}).filter(([k, v]) => k || v);
        return (
          <div key={doc.type} className="flex gap-0">
            {/* Left: label + open link */}
            <div className="flex w-44 flex-shrink-0 flex-col justify-start gap-1 py-2 pl-3 pr-3">
              <span className="text-muted-foreground text-xs">
                {DOC_LABELS[doc.type] ?? doc.type}
              </span>
              {doc.url ? (
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
            {/* Vertical divider */}
            <div className="w-px self-stretch bg-gray-100" />
            {/* Right: KV details */}
            <div className="min-w-0 flex-1 py-2 pl-3 pr-3">
              {pairs.length > 0 ? (
                <div className="space-y-0.5">
                  {pairs.map(([k, v]) => (
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
  );
}

const pastColumns: ColumnDef<HistoryEntry>[] = [
  {
    id: "status",
    header: "Status",
    enableSorting: false,
    cell: ({ row }) => <ReviewStatusBadge status={row.original.status} />,
  },
  {
    id: "requested",
    header: "Request date",
    accessorFn: (row) => row.created_at,
    cell: ({ row }) => (
      <span className="text-muted-foreground text-sm">
        {formatDateWithoutTime(row.original.created_at)}
      </span>
    ),
  },
  {
    id: "reviewer",
    header: "Reviewer",
    accessorFn: (row) => row.reviewer_email ?? "—",
    cell: ({ row }) => (
      <span className="text-sm">{row.original.reviewer_email ?? "—"}</span>
    ),
  },
];

export default function AdminCompanyReviewPage() {
  const { companyId } = useParams<{ companyId: string }>();
  const queryClient = useQueryClient();
  const [showReject, setShowReject] = useState(false);
  const [reason, setReason] = useState("");
  const [docDetails, setDocDetails] = useState<DocDetails>({});
  const [selectedPast, setSelectedPast] = useState<HistoryEntry | null>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin-company-review", companyId],
    queryFn: () =>
      preconfiguredAxios
        .get(`/api/admin/companies/${companyId}/review`)
        .then((r) => r.data as ReviewDetail),
    enabled: !!companyId,
  });

  const invalidate = () => {
    refetch();
    queryClient.invalidateQueries({ queryKey: ["admin-company-reviews"] });
  };

  const onConflict = (e: Error) => {
    const status = (e as { response?: { status?: number } }).response?.status;
    if (status === 409) {
      toast.message("This review changed — reloading");
      invalidate();
      return true;
    }
    return false;
  };

  const approve = useMutation({
    mutationFn: () =>
      preconfiguredAxios.post(`/api/admin/companies/${companyId}/approve`, {
        document_review_details: docDetails,
      }),
    onSuccess: () => {
      toast.success("Company verified");
      setDocDetails({});
      invalidate();
    },
    onError: (e: Error) => {
      if (!onConflict(e)) toast.error(e.message);
    },
  });

  const reject = useMutation({
    mutationFn: () =>
      preconfiguredAxios.post(`/api/admin/companies/${companyId}/reject`, {
        reason: reason || undefined,
      }),
    onSuccess: () => {
      toast.success("Company review rejected");
      setShowReject(false);
      setReason("");
      invalidate();
    },
    onError: (e: Error) => {
      if (!onConflict(e)) toast.error(e.message);
    },
  });

  const { openEntry, pastEntries } = useMemo(() => {
    const visible = (data?.history ?? []).filter((h) => h.status !== "superseded");
    const open = data?.openReviewId ? visible.find((h) => h.id === data.openReviewId) : undefined;
    const past = visible.filter((h) => h.id !== data?.openReviewId);
    return { openEntry: open ?? null, pastEntries: past };
  }, [data]);

  const canApprove = openEntry ? docDetailsComplete(openEntry.documents, docDetails) : false;

  if (isLoading) {
    return (
      <PageContainer className="max-w-3xl space-y-6">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-40 w-full" />
      </PageContainer>
    );
  }
  if (!data?.company) {
    return (
      <PageContainer className="max-w-3xl">
        <Card>
          <CardContent className="text-destructive py-8 text-center text-sm">
            Company not found.
          </CardContent>
        </Card>
      </PageContainer>
    );
  }

  const { company } = data;

  return (
    <PageContainer className="max-w-3xl space-y-6">
      <Link
        href="/reviews"
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm"
      >
        <ArrowLeft className="h-4 w-4" /> Company Reviews
      </Link>

      <div>
        <h1 className="text-xl font-semibold text-gray-900">{company.display_name}</h1>
        <p className="text-muted-foreground mt-0.5 text-sm">
          {company.email}
          {company.company_type && ` · ${company.company_type.replace(/_/g, " ")}`}
        </p>
      </div>

      {/* Pending review */}
      {openEntry ? (
        <Card className="overflow-hidden">
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <ReviewStatusBadge status={openEntry.status} />
              <span className="text-muted-foreground text-xs">
                Submitted {formatDateWithoutTime(openEntry.created_at)}
              </span>
            </div>
            <MaterialFields entry={openEntry} />
            <DocumentsEditor entry={openEntry} value={docDetails} onChange={setDocDetails} />
            <div className="flex gap-3 border-t border-gray-100 pt-4">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    scheme="supportive"
                    className="flex-1"
                    disabled={approve.isPending || !canApprove}
                  >
                    {approve.isPending ? <Loader2 className="animate-spin" /> : <Check />}
                    Approve
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Verify {company.display_name}?</AlertDialogTitle>
                    <AlertDialogDescription>
                      The company will be able to request MOAs from any university and is emailed a
                      confirmation.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-supportive text-supportive-foreground hover:bg-supportive/90"
                      onClick={() => approve.mutate()}
                    >
                      Approve
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <Button
                variant="outline"
                scheme="destructive"
                className="flex-1"
                onClick={() => setShowReject(true)}
              >
                <X /> Reject
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : !pastEntries.length ? (
        <Card>
          <CardContent className="text-muted-foreground py-8 text-center text-sm">
            No review history yet.
          </CardContent>
        </Card>
      ) : null}

      {/* Past requests table */}
      {pastEntries.length > 0 && (
        <Accordion type="single" collapsible>
          <AccordionItem value="past" className="border-none">
            <AccordionPrimitive.Header>
              <AccordionPrimitive.Trigger className="font-normal text-primary cursor-pointer py-1 text-sm outline-none underline">
                Previous requests
              </AccordionPrimitive.Trigger>
            </AccordionPrimitive.Header>
            <br />
            <AccordionContent className="pb-0">
              <DataTable
                id="past-reviews"
                columns={pastColumns}
                data={pastEntries}
                enableSearch={false}
                rowLabelSingular="request"
                rowLabelPlural="requests"
                onRowClick={(entry) => setSelectedPast(entry)}
              />
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      )}

      {/* Past request detail modal */}
      <Dialog open={!!selectedPast} onOpenChange={(o) => !o && setSelectedPast(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ReviewStatusBadge status={selectedPast?.status ?? null} />
              <span>
                Request — {selectedPast ? formatDateWithoutTime(selectedPast.created_at) : ""}
              </span>
            </DialogTitle>
            {selectedPast?.reviewed_at && (
              <DialogDescription>
                {selectedPast.status === "approved" ? "Approved" : "Reviewed"} by{" "}
                {selectedPast.reviewer_email ?? "—"} on{" "}
                {formatDateWithoutTime(selectedPast.reviewed_at)}
              </DialogDescription>
            )}
          </DialogHeader>
          {selectedPast && (
            <div className="space-y-4">
              {selectedPast.rejection_reason && (
                <p className="text-destructive text-xs">
                  Reason: {selectedPast.rejection_reason}
                </p>
              )}
              <MaterialFields entry={selectedPast} />
              <DocumentsReadOnly
                entry={selectedPast}
                details={selectedPast.document_review_details ?? {}}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Reject dialog */}
      <Dialog
        open={showReject}
        onOpenChange={(o) => {
          setShowReject(o);
          if (!o) setReason("");
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reject verification</DialogTitle>
            <DialogDescription>
              {company.display_name} will be asked to update their details. The reason is emailed to
              the company.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            rows={3}
            placeholder="Reason (optional — emailed to the company)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReject(false)}>
              Cancel
            </Button>
            <Button
              scheme="destructive"
              disabled={reject.isPending}
              onClick={() => reject.mutate()}
            >
              {reject.isPending && <Loader2 className="animate-spin" />}
              {reject.isPending ? "Rejecting…" : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
