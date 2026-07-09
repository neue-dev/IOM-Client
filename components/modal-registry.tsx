"use client";

import { useModal } from "@/app/providers/modal-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { useState } from "react";

export function useIomModalRegistry() {
  const { openModal, closeModal } = useModal();

  return {
    invitePartner: {
      open: (opts: {
        companyName: string;
        email: string;
        onInvite: (email: string, companyName: string) => void;
        isPending: boolean;
      }) =>
        openModal(
          "invite-partner",
          <InviteForm
            companyName={opts.companyName}
            email={opts.email}
            onInvite={opts.onInvite}
            isPending={opts.isPending}
            close={() => closeModal("invite-partner")}
          />,
          { title: "Invite company", showHeaderDivider: false }
        ),
      close: () => closeModal("invite-partner"),
    },
    blacklistPartner: {
      open: (opts: {
        companyName: string;
        onBlacklist: (reason: string) => void;
        isPending: boolean;
      }) =>
        openModal(
          "blacklist-partner",
          <BlacklistForm
            companyName={opts.companyName}
            onBlacklist={opts.onBlacklist}
            isPending={opts.isPending}
            close={() => closeModal("blacklist-partner")}
          />,
          { title: "Blacklist company", showHeaderDivider: false }
        ),
      close: () => closeModal("blacklist-partner"),
    },
    confirmAction: {
      open: (opts: {
        title: string;
        description: string;
        confirmLabel: string;
        onConfirm: () => void;
        isPending?: boolean;
      }) =>
        openModal(
          "confirm-action",
          <ConfirmForm
            title={opts.title}
            description={opts.description}
            confirmLabel={opts.confirmLabel}
            onConfirm={opts.onConfirm}
            isPending={opts.isPending}
            close={() => closeModal("confirm-action")}
          />,
          { title: null, hasClose: false, contentClassName: "px-4 pb-4 pt-2" }
        ),
      close: () => closeModal("confirm-action"),
    },
  };
}

function InviteForm({
  companyName,
  email: initialEmail,
  onInvite,
  isPending,
  close,
}: {
  companyName: string;
  email: string;
  onInvite: (email: string, companyName: string) => void;
  isPending: boolean;
  close: () => void;
}) {
  const [email, setEmail] = useState(initialEmail);
  const [name, setName] = useState(companyName);

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{companyName}</p>
      <div className="space-y-1.5">
        <Label htmlFor="invite-company-name">Company name</Label>
        <Input id="invite-company-name" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="invite-email">Company email</Label>
        <Input
          id="invite-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={close}>
          Cancel
        </Button>
        <Button
          disabled={!email.trim() || isPending}
          onClick={() => onInvite(email.trim(), name.trim())}
        >
          {isPending && <Loader2 className="animate-spin" />}
          {isPending ? "Sending…" : "Send invite"}
        </Button>
      </div>
    </div>
  );
}

function BlacklistForm({
  companyName,
  onBlacklist,
  isPending,
  close,
}: {
  companyName: string;
  onBlacklist: (reason: string) => void;
  isPending: boolean;
  close: () => void;
}) {
  const [reason, setReason] = useState("");

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">{companyName}</p>
      <div className="border-destructive/30 bg-destructive/5 text-destructive space-y-1 rounded-[0.33em] border p-3 text-sm">
        <p>
          This immediately <strong>revokes all active MOAs</strong> with this company and
          blocks new requests.
        </p>
        <p className="text-destructive/80 text-xs">
          Revoked MOAs cannot be restored. The company is not notified. This action is logged
          under your name.
        </p>
      </div>
      <Textarea
        rows={2}
        placeholder="Internal reason (optional — never shown to the company)"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
      />
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={close}>
          Cancel
        </Button>
        <Button
          scheme="destructive"
          disabled={isPending}
          onClick={() => onBlacklist(reason)}
        >
          {isPending && <Loader2 className="animate-spin" />}
          {isPending ? "Blacklisting…" : "Blacklist company"}
        </Button>
      </div>
    </div>
  );
}

function ConfirmForm({
  title,
  description,
  confirmLabel,
  onConfirm,
  isPending,
  close,
}: {
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void;
  isPending?: boolean;
  close: () => void;
}) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="text-sm text-muted-foreground">{description}</p>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={close}>
          Cancel
        </Button>
        <Button disabled={isPending} onClick={onConfirm}>
          {isPending && <Loader2 className="animate-spin" />}
          {confirmLabel}
        </Button>
      </div>
    </div>
  );
}
