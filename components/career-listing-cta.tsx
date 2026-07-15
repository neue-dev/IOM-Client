"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowUpRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useCompanyControllerCareerListingLink } from "@/app/api";
import type { ApiError } from "@/app/api/preconfig.axios";

// Mirrors preconfig.axios.ts's getAPIBase() — hostname-based, no env var,
// so dev/prod resolve without extra config per environment.
function getCareerHireUrl(): string {
  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    if (host.startsWith("dev.")) return "https://dev.hire.betterinternship.com";
    if (host.endsWith(".betterinternship.com")) return "https://hire.betterinternship.com";
  }
  return "http://hire.localhost:3000";
}

/**
 * "Post listings on BetterInternship" CTA (plan §4.2) — only ever rendered
 * by the caller when the company's verification status is 'verified'.
 * Handles both account-creation and returning-user cases identically: the
 * user never sees which one happened, they just land on a magic link.
 */
export function CareerListingCta() {
  const [conflictCode, setConflictCode] = useState<string | null>(null);
  const linkMutation = useCompanyControllerCareerListingLink({
    mutation: {
      onSuccess: (data) => {
        if (data.magicLink) window.location.href = data.magicLink;
      },
      onError: (e: Error) => {
        const error = e as ApiError;
        if (error.code === "EMAIL_MANAGES_OTHER_EMPLOYER" || error.code === "NO_EMAIL") {
          setConflictCode(error.code);
        } else {
          toast.error(error.message || "Could not start BetterInternship listing setup.");
        }
      },
    },
  });

  const handleClick = () => {
    setConflictCode(null);
    linkMutation.mutate();
  };

  return (
    <Card className="flex-row items-start gap-3 border-primary/30 bg-primary/5 px-5 py-4">
      <ArrowUpRight className="text-primary mt-0.5 h-5 w-5 flex-shrink-0" />
      <div className="min-w-0 flex-1 space-y-1.5">
        <p className="text-sm font-medium text-gray-900">
          Post internship listings on BetterInternship
        </p>
        <p className="text-muted-foreground text-sm">
          You&apos;re verified — post internship openings straight to
          BetterInternship&apos;s career site. No separate signup needed.
        </p>

        {conflictCode === "EMAIL_MANAGES_OTHER_EMPLOYER" && (
          <p className="text-destructive text-sm">
            Your email already manages a BetterInternship employer —{" "}
            <a
              href={`${getCareerHireUrl()}/company-profile`}
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              link it from the BetterInternship dashboard
            </a>{" "}
            instead.
          </p>
        )}
        {conflictCode === "NO_EMAIL" && (
          <p className="text-destructive text-sm">
            Set an account email on your{" "}
            <Link href="/profile" className="underline">
              company profile
            </Link>{" "}
            first.
          </p>
        )}

        <div className="pt-1">
          <Button size="sm" onClick={handleClick} disabled={linkMutation.isPending}>
            {linkMutation.isPending ? "Setting up…" : "Post a listing"}
          </Button>
        </div>
      </div>
    </Card>
  );
}
