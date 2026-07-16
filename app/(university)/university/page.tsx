"use client";
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useUniversityProfile } from "@/app/providers/university-profile.provider";

export default function UniversityRootPage() {
  const router = useRouter();
  const pathname = usePathname();
  const { account, isLoading } = useUniversityProfile();

  useEffect(() => {
    if (isLoading) return;
    const prefix = pathname.startsWith("/university") ? "/university" : "";
    router.replace(account ? `${prefix}/partners` : `${prefix}/login`);
  }, [account, isLoading, pathname, router]);

  return null;
}
