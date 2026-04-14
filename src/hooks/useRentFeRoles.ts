"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { readRentFeRolesFromDocumentCookie } from "@/lib/rbac/read-rent-fe-roles-cookie";
import type { RentAppRole } from "@/lib/rbac/rent-roles";
import { hasRentManagerAccess } from "@/lib/rbac/rent-roles";

/**
 * Rol çerezi giriş/refresh sonrası güncellenir; rota değişiminde yeniden okunur.
 */
export function useRentFeRoles(): {
  roles: RentAppRole[];
  hasManagerAccess: boolean;
  refresh: () => void;
} {
  const pathname = usePathname();
  const [roles, setRoles] = useState<RentAppRole[]>([]);

  const refresh = useCallback(() => {
    setRoles(readRentFeRolesFromDocumentCookie());
  }, []);

  useEffect(() => {
    const id = requestAnimationFrame(() => refresh());
    return () => cancelAnimationFrame(id);
  }, [pathname, refresh]);

  return {
    roles,
    hasManagerAccess: hasRentManagerAccess(roles),
    refresh,
  };
}
