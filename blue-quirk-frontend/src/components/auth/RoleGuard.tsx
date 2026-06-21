"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { getAuthUser } from "@/lib/auth";

type Props = {
  /** When set, only users with this role may stay; others are redirected. */
  requireRole?: "admin" | "user";
  /** Where to send users who fail the check. */
  redirectTo?: string;
  children: React.ReactNode;
};

/**
 * Client-side route guard. Auth here is convenience/UX only — the real
 * enforcement is the Keycloak JWT checked by the backend resource servers.
 */
export default function RoleGuard({ requireRole, redirectTo, children }: Props) {
  const router = useRouter();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    const user = getAuthUser();

    if (!user) {
      router.replace(redirectTo ?? "/login");
      return;
    }
    if (requireRole === "admin" && !user.isAdmin) {
      router.replace(redirectTo ?? "/account");
      return;
    }
    if (requireRole === "user" && user.isAdmin) {
      // Admins land on their dashboard instead of the customer account page.
      router.replace(redirectTo ?? "/admin-v2");
      return;
    }
    setAllowed(true);
  }, [requireRole, redirectTo, router]);

  if (!allowed) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
      </div>
    );
  }

  return <>{children}</>;
}
