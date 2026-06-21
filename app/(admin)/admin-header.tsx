"use client";

import { usePathname } from "next/navigation";
import { AppHeader } from "@/components/app-header";

export function AdminHeader() {
  const pathname = usePathname() ?? "";

  // Hide the app chrome on the login page.
  if (pathname.endsWith("/login")) return null;

  return (
    <AppHeader
      portal="Platform Admin"
      homeHref="/admin/universities"
      nav={[{ href: "/admin/universities", label: "Universities" }]}
      userPrimary="Administrator"
      logoutPath="/api/auth/admin/logout"
      postLogoutPath="/admin/login"
    />
  );
}
