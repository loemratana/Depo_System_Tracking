import * as React from "react";
import { motion } from "framer-motion";
import { AppSidebar } from "./app-sidebar";
import { AppHeader } from "./app-header";

import { useAuth } from "@/lib/auth";
import { useLocation } from "@tanstack/react-router";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = React.useState(false);
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  const authRoutes = ["/login", "/register", "/forgot-password", "/reset-password", "/verify-email"];
  const isAuthPage = authRoutes.includes(location.pathname);

  if (!isAuthenticated || isAuthPage) {
    return <div className="min-h-screen w-full bg-background">{children}</div>;
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background text-foreground">
      <AppSidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <AppHeader />
        <main className="flex-1 overflow-y-auto overflow-x-hidden scroll-smooth p-4">
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="w-full h-full flex flex-col"
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  );
}
