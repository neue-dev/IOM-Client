"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { ColumnDef } from "@tanstack/react-table";
import {
  getAdminControllerListUniversitiesQueryKey,
  useAdminControllerListUniversities,
  useAdminControllerCreateUniversity,
  useAdminControllerDeactivateUniversity,
  type AdminUniversityListItemDto,
} from "@/app/api";
import { PageContainer, PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTable } from "@/components/ui/data-table";
import { FormError } from "@/components/auth-shell";
import {
  Dialog,
  DialogTrigger,
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
import { Loader2, Plus } from "lucide-react";

const EMPTY_FORM = {
  registered_name: "",
  superadmin_email: "",
  superadmin_display_name: "",
};

function CreateUniversityDialog() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState("");

  const create = useAdminControllerCreateUniversity({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getAdminControllerListUniversitiesQueryKey() });
        toast.success("University created");
        setForm(EMPTY_FORM);
        setError("");
        setOpen(false);
      },
      onError: (e: Error) => setError(e.message),
    },
  });

  const valid = form.registered_name && form.superadmin_email;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setError("");
      }}
    >
      <DialogTrigger asChild>
        <Button>
          <Plus /> Add university
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create university</DialogTitle>
          <DialogDescription>
            The superadmin is emailed an invitation to set their password.
          </DialogDescription>
        </DialogHeader>

        <form
          id="create-university"
          onSubmit={(e) => {
            e.preventDefault();
            setError("");
            create.mutate({ data: form });
          }}
          className="space-y-4"
        >
          <FormError>{error}</FormError>
          <div className="space-y-1.5">
            <Label htmlFor="registered_name">Registered name</Label>
            <Input
              id="registered_name"
              placeholder="De La Salle University"
              value={form.registered_name}
              onChange={(e) => setForm({ ...form, registered_name: e.target.value })}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="superadmin_email">Superadmin email</Label>
            <Input
              id="superadmin_email"
              type="email"
              placeholder="admin@university.edu"
              value={form.superadmin_email}
              onChange={(e) => setForm({ ...form, superadmin_email: e.target.value })}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="superadmin_display_name">Superadmin name</Label>
            <Input
              id="superadmin_display_name"
              placeholder="Juan Dela Cruz"
              value={form.superadmin_display_name}
              onChange={(e) =>
                setForm({ ...form, superadmin_display_name: e.target.value })
              }
            />
          </div>
        </form>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="create-university"
            disabled={!valid || create.isPending}
          >
            {create.isPending && <Loader2 className="animate-spin" />}
            {create.isPending ? "Creating…" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DeactivateCell({ uni }: { uni: AdminUniversityListItemDto }) {
  const queryClient = useQueryClient();

  const deactivate = useAdminControllerDeactivateUniversity({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getAdminControllerListUniversitiesQueryKey() });
        toast.success("University deactivated");
      },
      onError: (e: Error) => toast.error(e.message),
    },
  });

  if (uni.is_deactivated) return null;

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="outline"
          scheme="destructive"
          size="sm"
          onClick={(e) => e.stopPropagation()}
        >
          Deactivate
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Deactivate {uni.registered_name}?</AlertDialogTitle>
          <AlertDialogDescription>
            Staff will lose access and the institution can no longer receive new MOA
            requests. This can be reversed later.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={() => deactivate.mutate({ universityId: uni.id })}
          >
            Deactivate
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

const columns: ColumnDef<AdminUniversityListItemDto>[] = [
  {
    id: "name",
    header: "University",
    accessorFn: (row) => row.registered_name,
    cell: ({ row }) => (
      <span className="font-medium text-gray-900">{row.original.registered_name}</span>
    ),
  },
  {
    id: "superadmin",
    header: "Superadmin",
    accessorFn: (row) => row.university_accounts[0]?.email ?? "",
    cell: ({ row }) => (
      <span className="text-muted-foreground">
        {row.original.university_accounts[0]?.email ?? "—"}
      </span>
    ),
  },
  {
    id: "status",
    header: "Status",
    enableSorting: false,
    accessorFn: (row) => (row.is_deactivated ? "Deactivated" : "Active"),
    cell: ({ row }) =>
      row.original.is_deactivated ? (
        <Badge type="destructive" strength="medium">Deactivated</Badge>
      ) : (
        <Badge type="supportive" strength="medium">Active</Badge>
      ),
  },
  {
    id: "actions",
    header: "",
    enableSorting: false,
    enableResizing: false,
    size: 120,
    minSize: 120,
    cell: ({ row }) => <DeactivateCell uni={row.original} />,
  },
];

export default function AdminUniversitiesPage() {
  const router = useRouter();
  const { data, isLoading } = useAdminControllerListUniversities();

  return (
    <PageContainer className="space-y-6">
      <PageHeader
        title="Universities"
        description="Onboard institutions and manage their access to the platform."
      >
        <CreateUniversityDialog />
      </PageHeader>

      {isLoading ? (
        <div className="space-y-2.5">
          <Skeleton className="h-10 w-96" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : (
        <DataTable
          id="admin-universities"
          columns={columns}
          data={data?.universities ?? []}
          searchPlaceholder="Search universities..."
          rowLabelSingular="university"
          rowLabelPlural="universities"
          onRowClick={(uni) => router.push(`/admin/universities/${uni.id}`)}
        />
      )}
    </PageContainer>
  );
}
