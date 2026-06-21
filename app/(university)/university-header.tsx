"use client";

import { usePathname } from "next/navigation";
import { AppHeader, type NavItem } from "@/components/app-header";
import { useUniversityProfile } from "@/app/providers/university-profile.provider";

const AUTH_SUFFIXES = [
  "/login",
  "/accept-invite",
  "/forgot-password",
  "/reset-password",
];

export function UniversityHeader() {
  const pathname = usePathname() ?? "";
  const { account, isSuperadmin } = useUniversityProfile();

  if (AUTH_SUFFIXES.some((s) => pathname.endsWith(s))) return null;

  const nav: NavItem[] = [
    { href: "/university/dashboard", label: "Dashboard" },
    { href: "/university/review-queue", label: "Review Queue" },
    { href: "/university/partners", label: "Partners" },
    { href: "/university/blacklist", label: "Blacklist" },
    { href: "/university/audit", label: "Audit" },
    ...(isSuperadmin
      ? [
          { href: "/university/accounts", label: "Accounts" },
          { href: "/university/templates", label: "Templates" },
          { href: "/university/profile", label: "Profile" },
        ]
      : []),
  ];

  return (
    <AppHeader
      portal="University"
      homeHref="/university/dashboard"
      nav={nav}
      userPrimary={account?.display_name ?? account?.university.registered_name}
      userSecondary={account?.email}
      logoutPath="/api/auth/university/logout"
      postLogoutPath="/university/login"
    />
  );
}
