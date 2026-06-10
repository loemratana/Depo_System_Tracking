import * as React from "react";
import { Link } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "@/lib/theme";
import { Moon, Sun, Package2 } from "lucide-react";

// ─── Animated gradient noise background (right panel) ─────────────────────────
function BrandPanel() {
  return (
    <div className="relative hidden lg:flex lg:w-[480px] xl:w-[520px] flex-col overflow-hidden bg-[oklch(0.13_0.012_260)] border-r border-border">
      {/* Subtle grid */}
      <div
        className="absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage:
            "linear-gradient(oklch(0.8 0 0) 1px, transparent 1px), linear-gradient(90deg, oklch(0.8 0 0) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />
      {/* Radial glow */}
      <div className="absolute inset-0">
        <div
          className="absolute"
          style={{
            width: 480,
            height: 480,
            top: -60,
            left: -120,
            background:
              "radial-gradient(ellipse, oklch(0.5 0.13 250 / 0.12) 0%, transparent 70%)",
          }}
        />
        <div
          className="absolute"
          style={{
            width: 360,
            height: 360,
            bottom: 80,
            right: -60,
            background:
              "radial-gradient(ellipse, oklch(0.55 0.1 210 / 0.1) 0%, transparent 70%)",
          }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col h-full px-10 py-10">
        {/* Logo */}
        

        <div className="flex justify-center">
          <div className="w-28 h-28 rounded-full bg-white/5 backdrop-blur-sm ring-1 ring-white/20 flex items-center justify-center p-3">
            <img
              src="../../image/gb-logo-Photoroom.png"
              alt="Brand Depot"
              className="w-full h-full object-contain"
            />
          </div>
        </div>
        {/* <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-[6px] bg-primary/15 ring-1 ring-primary/25">
                <img src="../image/gb-logo-Photoroom.png" alt="Logo" className="h-full w-full object-cover" />
          </div>
          <span className="text-[13px] font-semibold tracking-tight text-white/80">
            Brand Depot
          </span>
        </div> */}

        {/* Middle content */}
        <div className="mt-auto mb-auto pt-16 flex justify-center items-center">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            <p className="text-xs font-medium uppercase tracking-widest text-primary/60 mb-4 text-center">
              Field Operations Platform
            </p>
            <h1 className="text-[2rem] font-semibold leading-tight tracking-[-0.04em] text-white/90 text-center">
              Manage depots,
              <br />
              <span className="text-white/50 text-center">track every field visit.</span>
            </h1>
            <p className="mt-4 text-sm text-white/35 leading-relaxed max-w-[280px] text-center">
              Real-time operational visibility across your entire brand depot
              network and field agent activities.
            </p>
          </motion.div>

          {/* Stats row */}
          {/* <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
            className="mt-10 grid grid-cols-3 gap-4"
          >
            {[
              { label: "Depots", value: "120+" },
              { label: "Field Agents", value: "340+" },
              { label: "Visits / mo", value: "8k+" },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-[6px] border border-white/[0.07] bg-white/[0.03] px-3 py-3"
              >
                <p className="text-lg font-semibold tracking-tight text-white/80">
                  {stat.value}
                </p>
                <p className="text-[11px] text-white/30 mt-0.5">{stat.label}</p>
              </div>
            ))}
          </motion.div> */}
        </div>

        {/* Footer */}
        <div className="mt-auto">
          <p className="text-[11px] text-white/20">
            © {new Date().getFullYear()} Brand Depot Systems. All rights
            reserved.
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Page variants ─────────────────────────────────────────────────────────────
const pageVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -6 },
};

// ─── AuthLayout ────────────────────────────────────────────────────────────────
interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  /** Optional back link */
  backTo?: { href: string; label: string };
  showBrandPanel?: boolean;
}

export function AuthLayout({
  children,
  title,
  subtitle,
  backTo,
  showBrandPanel = true,
}: AuthLayoutProps) {
  const { theme, toggle } = useTheme();

  return (
    <div className="flex min-h-screen w-full bg-background">
      {showBrandPanel && <BrandPanel />}

      {/* Right / main column */}
      <div className="flex flex-1 flex-col">
        {/* Top bar */}
        <div className="flex items-center justify-between px-6 py-5 lg:px-10">
          {/* Mobile logo */}
          <Link to="/" className="flex items-center gap-2 lg:hidden">
            <div className="flex h-6 w-6 items-center justify-center rounded-[5px] bg-primary/10 ring-1 ring-primary/20">
              <Package2 className="h-3 w-3 text-primary" />
            </div>
            <span className="text-[12px] font-semibold tracking-tight text-foreground">
              Brand Depot
            </span>
          </Link>
          <div className="hidden lg:block" />

          {/* Theme toggle */}
          <button
            onClick={toggle}
            className="flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            title="Toggle theme"
          >
            {theme === "dark" ? (
              <Sun className="h-3.5 w-3.5" />
            ) : (
              <Moon className="h-3.5 w-3.5" />
            )}
          </button>
        </div>

        {/* Form area */}
        <div className="flex flex-1 items-center justify-center px-6 pb-16 pt-4">
          <div className="w-full max-w-[360px]">
            <AnimatePresence mode="wait">
              <motion.div
                key={title}
                variants={pageVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              >
                {/* Header */}
                <div className="mb-7">
                  {backTo && (
                    <Link
                      to={backTo.href as "/"}
                      className="mb-4 inline-flex items-center gap-1.5 text-[12px] text-muted-foreground transition-colors hover:text-foreground"
                    >
                      <svg
                        className="h-3 w-3"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M15 19l-7-7 7-7"
                        />
                      </svg>
                      {backTo.label}
                    </Link>
                  )}
                  <h2 className="text-[1.35rem] font-semibold tracking-[-0.03em] text-foreground">
                    {title}
                  </h2>
                  {subtitle && (
                    <p className="mt-1.5 text-[13px] text-muted-foreground">
                      {subtitle}
                    </p>
                  )}
                </div>

                {children}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
