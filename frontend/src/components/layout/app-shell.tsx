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
        <main className="flex-1 overflow-y-auto overflow-x-hidden scroll-smooth">
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            // Example: px-6 (default), but on computer screens (lg) use px-2
            // This will feel much tighter and use more of your computer screen
            className="mx-auto w-full max-w-[1800px] px-6 py-6"

          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  );
}
