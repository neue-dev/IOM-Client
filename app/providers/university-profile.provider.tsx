"use client";
import { createContext, useContext } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useUniversityControllerMe } from "@/app/api";

interface UniversityAccount {
  id: string;
  university_id: string;
  email: string;
  display_name: string;
  role: "superadmin" | "staff";
  is_deactivated: boolean | null;
  university: {
    id: string;
    registered_name: string;
    logo_url: string | null;
    address: string | null;
    rep_name: string | null;
    rep_title: string | null;
    rep_signature_url: string | null;
  };
}

interface UniversityProfileCtx {
  account: UniversityAccount | null;
  isLoading: boolean;
  isSuperadmin: boolean;
  isSetupComplete: boolean;
}

const UniversityProfileContext = createContext<UniversityProfileCtx>({
  account: null,
  isLoading: true,
  isSuperadmin: false,
  isSetupComplete: false,
});

export function isUniversitySetupComplete(
  university: UniversityAccount["university"] | null | undefined,
) {
  return Boolean(
    university?.registered_name?.trim() &&
    university.address?.trim() &&
    university.rep_name?.trim() &&
    university.rep_title?.trim() &&
    university.rep_signature_url,
  );
}

export function useUniversityProfile() {
  return useContext(UniversityProfileContext);
}

export function UniversityProfileProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const { data, isLoading, isError } = useUniversityControllerMe({
    query: { retry: false, staleTime: Infinity },
  });

  // pathname is the browser URL path — on subdomain routing it won't carry the /university prefix.
  const onAuthPage =
    pathname.startsWith("/university/login") ||
    pathname.startsWith("/university/accept-invite") ||
    pathname === "/login" ||
    pathname === "/accept-invite";
  const onProfilePage =
    pathname.startsWith("/university/profile") || pathname === "/profile";
  const loginRedirect = pathname.startsWith("/university/")
    ? "/university/login"
    : "/login";
  const account = (data?.account as UniversityAccount) ?? null;
  const isSuperadmin = account?.role === "superadmin";
  const isSetupComplete = isUniversitySetupComplete(account?.university);
  if (isError && !onAuthPage) {
    router.replace(loginRedirect);
  }

  if (
    !onAuthPage &&
    !onProfilePage &&
    !isError &&
    !isLoading &&
    isSuperadmin &&
    !isSetupComplete
  ) {
    router.replace(
      pathname.startsWith("/university/") ? "/university/profile" : "/profile",
    );
  }

  return (
    <UniversityProfileContext.Provider
      value={{ account, isLoading, isSuperadmin, isSetupComplete }}
    >
      {children}
    </UniversityProfileContext.Provider>
  );
}
