import * as React from "react";
import { useAuth } from "@/lib/auth";
import { useNavigate, useLocation } from "@tanstack/react-router";

interface RequireAuthProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

export function RequireAuth({ children, allowedRoles }: RequireAuthProps) {
  const { isAuthenticated, user, status } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  React.useEffect(() => {
    if (status === "unauthenticated") {
      navigate({
        to: "/login",
        search: { redirect: location.pathname },
      });
    }
  }, [status, isAuthenticated, navigate, location.pathname]);

  if (status === "loading" || status === "idle") {
    return null; // Handled by root loader
  }

  if (!isAuthenticated) {
    return null;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return (
      <div className="flex h-[80vh] flex-col items-center justify-center space-y-4 text-center">
        <div className="rounded-full bg-destructive/10 p-4">
          <svg
            className="h-8 w-8 text-destructive"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 15v2m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <div>
          <h3 className="text-lg font-semibold">Access Denied</h3>
          <p className="text-sm text-muted-foreground">
            You don't have permission to view this page.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
