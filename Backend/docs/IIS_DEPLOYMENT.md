# Deploying on IIS, using the Default Web Site

This replaces **only the reverse-proxy layer** of
[`WINDOWS_SERVER_DEPLOYMENT.md`](./WINDOWS_SERVER_DEPLOYMENT.md) — its step 8
(Caddy) — with IIS instead. Everything else in that guide is unchanged and
not repeated here:

- **Steps 0–3**: prerequisites, Node.js 22, PostgreSQL, Redis (Memurai).
- **Steps 4–6**: get the code, configure the backend's `.env`, run
  migrations/seed, and run the Node backend as a Windows service via NSSM,
  listening on `127.0.0.1:5000`.
- **Step 7**: build the frontend (`pnpm build` → `dist\`).
- **Steps 9–11**: verification, deploying updates, backups.

Do those first. This document only covers: configuring IIS's **Default Web
Site** to serve the built React app as static files, and reverse-proxying
`/api/*` and `/uploads/*` to the Node backend on the same domain — so the
browser only ever talks to one origin, exactly like the Caddy setup, just
with IIS's own modules.

```text
Internet (80/443)
   │
   ▼
IIS — Default Web Site
   ├── /               → static files (React build, physical path = dist\)
   ├── /api/*          → reverse-proxied (ARR + URL Rewrite) to 127.0.0.1:5000
   └── /uploads/*      → reverse-proxied (ARR + URL Rewrite) to 127.0.0.1:5000
```

## 1. Install IIS and the two extra modules it needs

Plain IIS cannot reverse-proxy to another port on its own — that needs
**Application Request Routing (ARR)**, which in turn needs **URL Rewrite**.
Both are official, free Microsoft downloads; neither is a Windows Feature you
can `Install-WindowsFeature` your way to.

```powershell
# IIS itself, with the management console
Install-WindowsFeature Web-Server, Web-Mgmt-Console, Web-Http-Redirect, Web-Stat-Compression
```

Then download and install, in this order (ARR depends on URL Rewrite being
present first):

1. **URL Rewrite 2.1**:
   https://www.iis.net/downloads/microsoft/url-rewrite
2. **Application Request Routing 3.0**:
   https://www.iis.net/downloads/microsoft/application-request-routing

Both are plain MSI installers — run them, accept the defaults, no reboot
needed.

## 2. Enable ARR's proxy function (off by default)

Installing ARR does not turn proxying on — that's a separate, server-wide
toggle. Either through IIS Manager: click the **server name** node (top of
the tree, not a site) → **Application Request Routing Cache** → **Server
Proxy Settings** (right-hand Actions pane) → check **Enable proxy** → Apply.

Or from PowerShell, equivalently:

```powershell
& "$env:windir\System32\inetsrv\appcmd.exe" set config -section:system.webServer/proxy /enabled:"True" /commit:apphost
```

## 3. Point Default Web Site at the built frontend

In IIS Manager, expand **Sites → Default Web Site** → **Basic Settings** (or
`Set-ItemProperty` below) → change **Physical path** to the frontend's build
output:

```powershell
Import-Module WebAdministration
Set-ItemProperty "IIS:\Sites\Default Web Site" -Name physicalPath -Value "D:\apps\frontend-src\dist"
```

This replaces whatever the IIS welcome page was serving there. Nothing needs
copying — `pnpm build` writes straight into `dist\`, and redeploying later
(step 10 in the main guide) is just rebuilding in place.

## 4. Add the reverse-proxy + SPA-fallback rules

Create `D:\apps\frontend-src\dist\web.config` (IIS reads this automatically
for any site whose physical path contains it — this is the IIS-native
equivalent of the Caddyfile from the other guide):

```xml
<?xml version="1.0" encoding="UTF-8"?>
<configuration>
  <system.webServer>
    <rewrite>
      <rules>
        <!-- Reverse proxy: backend API. Order matters — this must come
             BEFORE the SPA fallback rule below, and stopProcessing keeps a
             matched request from also being rewritten to index.html. -->
        <rule name="Proxy to backend API" stopProcessing="true">
          <match url="^api/(.*)" />
          <action type="Rewrite" url="http://127.0.0.1:5000/api/{R:1}" />
        </rule>

        <!-- Reverse proxy: uploaded profile/brand images served by the
             backend (src/config/multer.js), not part of the React build. -->
        <rule name="Proxy to backend uploads" stopProcessing="true">
          <match url="^uploads/(.*)" />
          <action type="Rewrite" url="http://127.0.0.1:5000/uploads/{R:1}" />
        </rule>

        <!-- SPA fallback: any other path that isn't a real file/folder in
             dist\ (e.g. /depots/123, a client-side route) serves index.html
             so TanStack Router's own routing can take over client-side. -->
        <rule name="SPA fallback" stopProcessing="true">
          <match url=".*" />
          <conditions logicalGrouping="MatchAll">
            <add input="{REQUEST_FILENAME}" matchType="IsFile" negate="true" />
            <add input="{REQUEST_FILENAME}" matchType="IsDirectory" negate="true" />
          </conditions>
          <action type="Rewrite" url="/index.html" />
        </rule>
      </rules>
    </rewrite>
  </system.webServer>
</configuration>
```

Both proxy rules reconstruct the full original path on the backend side
(`api/v1/auth/login` → `http://127.0.0.1:5000/api/v1/auth/login`), matching
exactly how `app.js` mounts its routes (`app.use('/api/v1/auth', authRoutes)`
and `app.use('/uploads', express.static(...))`) — nothing is stripped or
re-prefixed.

No change needed for upload size limits: IIS's default
`requestFiltering/requestLimits/maxAllowedContentLength` is ~28.6 MB, already
above this app's own multer limits (5 MB images, 10 MB Excel imports —
`src/config/multer.js`), so those requests are rejected by the app with a
clean error, not by IIS silently first.

## 5. HTTPS via win-acme

IIS has no Caddy-style built-in ACME client. **win-acme** (`wacs.exe`) is the
standard free tool for this — it detects Default Web Site's binding,
requests a Let's Encrypt certificate, binds it to port 443, and installs its
own scheduled task for renewal.

1. Download from https://www.win-acme.com/ and extract `wacs.exe` anywhere,
   e.g. `C:\tools\win-acme`.
2. Requires your domain's DNS A record pointing at this server, and port 80
   reachable from the internet (same prerequisite as Caddy's automatic
   HTTPS). Run:

   ```powershell
   cd C:\tools\win-acme
   .\wacs.exe
   ```

   Choose the default interactive option (`N` — create certificate, default
   settings), pick **Default Web Site** when it lists IIS bindings, and let
   it complete. It creates the HTTPS binding on Default Web Site
   automatically and schedules its own renewal task — nothing further to do.

If you don't have a domain yet, skip this step and use `http://<server-ip>`
for now; add HTTPS once a domain is pointed at the server.

## 6. Firewall

Same as the Caddy guide — only 80/443 need to be reachable from the
internet:

```powershell
New-NetFirewallRule -DisplayName "HTTP"  -Direction Inbound -Protocol TCP -LocalPort 80  -Action Allow
New-NetFirewallRule -DisplayName "HTTPS" -Direction Inbound -Protocol TCP -LocalPort 443 -Action Allow
```

Port 5000 (backend) never needs a rule — it isn't reachable from outside
`127.0.0.1` unless something explicitly opens it.

## 7. Verify

```powershell
curl https://your-domain.example/health/live
curl -Method POST -ContentType 'application/json' -Body '{}' https://your-domain.example/api/v1/auth/login
```

First returns `{"status":"UP"}`; second returns a `400` with validation
errors — confirms the ARR/URL-Rewrite proxy path reaches the backend
correctly. Then open the site in a browser and confirm the sign-in page and
routing (e.g. refreshing on a nested route like `/depots`) both work — that
exercises the SPA-fallback rule.

## Common IIS-specific gotchas

- **"Enable proxy" reverts after an IIS reset in some environments** — if
  `/api/*` suddenly starts returning IIS's own 404 instead of reaching the
  backend, re-check step 2 first.
- **Rule order**: if the SPA fallback rule is ever moved above the two proxy
  rules (e.g. by re-saving through the GUI editor), `/api/*` requests will
  incorrectly resolve to `index.html` instead of proxying. Keep the proxy
  rules first, as written above.
- **Directory browsing / default IIS pages**: if `dist\` ever ends up
  without an `index.html` at its root (a broken build), IIS's own default
  welcome page or a 403 may show through instead of a clear error — check
  `pnpm build`'s output in `dist\` if the site looks wrong after a deploy.
