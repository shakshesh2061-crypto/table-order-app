import { Navigate, Outlet } from "react-router-dom";
import type { Role } from "@table-order/shared";
import { useAuth } from "./AuthContext";

export function RequireRole({ roles }: { roles: Role[] }) {
  const { user, loading } = useAuth();

  if (loading) return <div className="p-8 text-center text-neutral-500">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (!roles.includes(user.role)) return <Navigate to="/" replace />;

  return <Outlet />;
}
