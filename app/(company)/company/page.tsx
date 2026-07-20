"use client";
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useCompanyProfile } from "@/app/providers/company-profile.provider";

export default function CompanyRootPage() {
  const router = useRouter();
  const pathname = usePathname();
  const { company, isLoading } = useCompanyProfile();

  useEffect(() => {
    if (isLoading) return;
    const prefix = pathname.startsWith("/company") ? "/company" : "";
    router.replace(company ? `${prefix}/dashboard` : `${prefix}/login`);
  }, [company, isLoading, pathname, router]);

  return null;
}
