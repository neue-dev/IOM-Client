"use client";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { ColumnDef } from "@tanstack/react-table";
import {
  getAdminControllerListTemplatesQueryKey,
  useAdminControllerListTemplates,
  useAdminControllerDeleteTemplate,
  type AdminTemplateDto,
} from "@/app/api";
import { PageContainer, PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTable } from "@/components/ui/data-table";
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
import { Pencil, Plus, Trash2 } from "lucide-react";

function ActionsCell({ template }: { template: AdminTemplateDto }) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const remove = useAdminControllerDeleteTemplate({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getAdminControllerListTemplatesQueryKey() });
        toast.success("Template deleted");
      },
      onError: (e: Error) => toast.error(e.message),
    },
  });

  return (
    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
      <Button
        variant="outline"
        size="sm"
        onClick={() => router.push(`/templates/${template.id}`)}
      >
        <Pencil className="h-3.5 w-3.5" /> Edit
      </Button>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="outline" scheme="destructive" size="sm">
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {template.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              It will be removed from the catalog and universities can no longer offer it.
              Existing MOAs are unaffected (their PDFs are frozen). This can&apos;t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => remove.mutate({ templateId: template.id })}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

const columns: ColumnDef<AdminTemplateDto>[] = [
  {
    id: "name",
    header: "Template",
    accessorFn: (row) => row.name,
    cell: ({ row }) => (
      <div className="min-w-0">
        <p className="font-medium text-gray-900">{row.original.name}</p>
        {row.original.description && (
          <p className="text-muted-foreground truncate text-xs">{row.original.description}</p>
        )}
      </div>
    ),
  },
  {
    id: "term",
    header: "Term",
    accessorFn: (row) => row.term_months,
    cell: ({ row }) => (
      <Badge type="default" strength="medium">{row.original.term_months} mo</Badge>
    ),
  },
  {
    id: "actions",
    header: "",
    enableSorting: false,
    enableResizing: false,
    size: 140,
    minSize: 140,
    cell: ({ row }) => <ActionsCell template={row.original} />,
  },
];

export default function AdminTemplatesPage() {
  const router = useRouter();

  const { data, isLoading } = useAdminControllerListTemplates();

  return (
    <PageContainer className="space-y-6">
      <PageHeader
        title="MOA Templates"
        description="Author the shared catalog of MOA templates. Universities choose which to offer."
      >
        <Button onClick={() => router.push("/templates/new")}>
          <Plus /> New template
        </Button>
      </PageHeader>

      {isLoading ? (
        <div className="space-y-2.5">
          <Skeleton className="h-10 w-96" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : (
        <DataTable
          id="admin-templates"
          columns={columns}
          data={data?.templates ?? []}
          searchPlaceholder="Search templates..."
          rowLabelSingular="template"
          rowLabelPlural="templates"
          onRowClick={(t) => router.push(`/templates/${t.id}`)}
        />
      )}
    </PageContainer>
  );
}
