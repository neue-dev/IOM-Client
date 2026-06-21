import { Badge } from "@/components/ui/badge";

/** Renders an MOA's lifecycle state as a consistent badge. */
export function MoaStatusBadge({
  status,
  isExpired,
}: {
  status: string;
  isExpired?: boolean | null;
}) {
  if (isExpired) return <Badge type="default">Expired</Badge>;
  if (status === "active") return <Badge type="supportive">Active</Badge>;
  if (status === "rejected") return <Badge type="destructive">Rejected</Badge>;
  if (status === "pending") return <Badge type="warning">Pending</Badge>;
  return <Badge type="default">{status}</Badge>;
}
