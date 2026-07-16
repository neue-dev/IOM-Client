"use client";
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAdminProfile } from "@/app/providers/admin-profile.provider";

export default function AdminRootPage() {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, isLoading } = useAdminProfile();

  useEffect(() => {
    if (isLoading) return;
    const prefix = pathname.startsWith("/admin") ? "/admin" : "";
    router.replace(
      isAuthenticated ? `${prefix}/universities` : `${prefix}/login`,
    );
  }, [isAuthenticated, isLoading, pathname, router]);

  return null;
}
