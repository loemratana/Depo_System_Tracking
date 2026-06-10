import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Surface, SectionTitle } from "@/components/ui-kit";
import { useTheme } from "@/lib/theme";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Brand Depot" },
      { name: "description", content: "Workspace, account, and notification preferences." },
    ],
  }),
  component: SettingsPage,
});

const tabs = ["Workspace", "Account", "Notifications", "API & Integrations", "Billing"] as const;

function SettingsPage() {
  const [tab, setTab] = React.useState<(typeof tabs)[number]>("Workspace");
  const { theme, setTheme } = useTheme();

  return (
    <>
      <PageHeader title="Settings" description="Workspace configuration and personal preferences." />

      <div className="flex items-center gap-1 border-b border-border">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`relative px-3 py-2 text-[12.5px] transition-colors ${
              tab === t ? "text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t}
            {tab === t && <span className="absolute inset-x-3 -bottom-px h-px bg-foreground" />}
          </button>
        ))}
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3 lg:grid-cols-3">
        <Surface>
          <SectionTitle title="Workspace identity" />
          <div className="space-y-3">
            <label className="block">
              <span className="text-[11.5px] font-medium text-muted-foreground">Workspace name</span>
              <input defaultValue="Acme Corp" className="mt-1 h-8 w-full rounded-md border border-border bg-surface px-2.5 text-[12.5px] focus:border-border-strong focus:outline-none focus:ring-2 focus:ring-ring/20" />
            </label>
            <label className="block">
              <span className="text-[11.5px] font-medium text-muted-foreground">Workspace slug</span>
              <input defaultValue="acme-corp" className="mt-1 h-8 w-full rounded-md border border-border bg-surface px-2.5 font-mono text-[12px] focus:border-border-strong focus:outline-none focus:ring-2 focus:ring-ring/20" />
            </label>
            <label className="block">
              <span className="text-[11.5px] font-medium text-muted-foreground">Default region</span>
              <select className="mt-1 h-8 w-full rounded-md border border-border bg-surface px-2.5 text-[12.5px] focus:border-border-strong focus:outline-none focus:ring-2 focus:ring-ring/20">
                <option>Central</option><option>North</option><option>South</option><option>East</option><option>West</option>
              </select>
            </label>
          </div>
        </Surface>

        <Surface>
          <SectionTitle title="Appearance" />
          <div className="space-y-2">
            {(["dark", "light"] as const).map((t) => (
              <label key={t} className={`flex cursor-pointer items-center justify-between rounded-md border p-3 transition-colors ${
                theme === t ? "border-primary/40 bg-primary/5" : "border-border hover:border-border-strong"
              }`}>
                <div>
                  <div className="text-[12.5px] font-medium capitalize text-foreground">{t} mode</div>
                  <div className="text-[11px] text-muted-foreground">
                    {t === "dark" ? "Calm console palette for daily ops" : "High-contrast for daylight"}
                  </div>
                </div>
                <input
                  type="radio"
                  name="theme"
                  checked={theme === t}
                  onChange={() => setTheme(t)}
                  className="h-3.5 w-3.5 accent-primary"
                />
              </label>
            ))}
          </div>
        </Surface>

        <Surface>
          <SectionTitle title="Security" />
          <ul className="space-y-3 text-[12.5px]">
            <li className="flex items-center justify-between">
              <div>
                <div className="font-medium text-foreground">Two-factor auth</div>
                <div className="text-[11px] text-muted-foreground">Required for admin accounts</div>
              </div>
              <span className="text-success text-[11.5px] font-medium">Enabled</span>
            </li>
            <li className="flex items-center justify-between">
              <div>
                <div className="font-medium text-foreground">SSO (SAML)</div>
                <div className="text-[11px] text-muted-foreground">Okta · acme-corp.okta.com</div>
              </div>
              <span className="text-success text-[11.5px] font-medium">Active</span>
            </li>
            <li className="flex items-center justify-between">
              <div>
                <div className="font-medium text-foreground">Session timeout</div>
                <div className="text-[11px] text-muted-foreground">30 minutes idle</div>
              </div>
              <button className="rounded border border-border px-2 py-0.5 text-[11px] hover:border-border-strong">Edit</button>
            </li>
          </ul>
        </Surface>
      </div>

      <div className="mt-5 flex items-center justify-end gap-2">
        <button className="rounded-md border border-border bg-surface px-3 py-1.5 text-[12px] text-foreground hover:border-border-strong">
          Cancel
        </button>
        <button className="rounded-md bg-primary px-3 py-1.5 text-[12px] font-medium text-primary-foreground hover:opacity-90">
          Save changes
        </button>
      </div>
    </>
  );
}
