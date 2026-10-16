# IIS Deployment — GUI-only walkthrough (no PowerShell)

Same result as [`IIS_DEPLOYMENT.md`](./IIS_DEPLOYMENT.md) — IIS's **Default
Web Site** serves the React build and reverse-proxies `/api/*` and
`/uploads/*` to the Node backend on `127.0.0.1:5000` — but every step here is
a click-through, using **Server Manager**, **IIS Manager**, **NSSM's own
installer window**, and **Windows Defender Firewall**'s dialogs. No command
typed anywhere except two file paths you'll paste into text boxes.

This assumes the Node backend, PostgreSQL and Redis are already installed and
configured per [`WINDOWS_SERVER_DEPLOYMENT.md`](./WINDOWS_SERVER_DEPLOYMENT.md)
steps 1–5 (those three are each a single downloaded installer you double-click
and click Next through — genuinely GUI already, so not repeated here) and the
frontend has been built (`pnpm build`, producing a `dist` folder). This
document covers: running the backend as a Windows Service, and configuring
IIS.

## 1. Run the Node backend as a Windows Service (NSSM's GUI)

1. Download NSSM from https://nssm.cc/download, extract it, and find
   `win64\nssm.exe`. Copy it somewhere permanent, e.g. `C:\tools\nssm.exe`.
2. Press **Win+R**, type `cmd`, press Enter to open a plain Command Prompt
   — you're not typing any real commands here, just launching NSSM's window.
3. Type `C:\tools\nssm.exe install DepotBackend` and press Enter. A
   **NSSM service installer** window opens — this is a full GUI dialog with
   tabs.
4. On the **Application** tab:
   - **Path**: click the `...` button, browse to
     `C:\Program Files\nodejs\node.exe`, select it.
   - **Startup directory**: click into this field and it auto-fills based on
     Path — change it to `D:\apps\backend-src\Backend` (this is important:
     it's what makes the app find its `.env` file and create its `uploads`/
     `logs` folders in the right place).
   - **Arguments**: type `src\server.js`.
5. On the **Details** tab: set **Display name** to `Depot Backend`, and
   **Startup type** to `Automatic` (should already be the default).
6. On the **I/O** tab: set **Output (stdout)** to
   `D:\apps\backend-src\Backend\logs\service-out.log`, and **Error
   (stderr)** to `D:\apps\backend-src\Backend\logs\service-err.log`.
7. On the **Exit actions** tab: set the action to **Restart application**,
   so the service comes back up automatically if it ever crashes.
8. Click **Install service**. You'll see a confirmation.
9. Press **Win+R**, type `services.msc`, press Enter. Find **Depot Backend**
   in the list, right-click → **Start**.
10. Open a browser and go to `http://localhost:5000/health/live` — you
    should see `{"status":"UP"}`.

## 2. Install IIS (Server Manager)

1. Open **Server Manager** (it usually opens automatically at logon; if not,
   search the Start menu for it).
2. Click **Manage** (top right) → **Add Roles and Features**.
3. Click **Next** through *Before You Begin*, choose **Role-based or
   feature-based installation**, click **Next**, leave the local server
   selected, click **Next**.
4. On **Server Roles**, check **Web Server (IIS)**. A popup appears asking
   to add required management tools/features — click **Add Features**.
5. Click **Next** through *Features*.
6. On **Role Services** (under Web Server (IIS)), make sure these are
   checked (most are checked by default):
   - Under **Common HTTP Features**: Default Document, HTTP Errors, Static
     Content, HTTP Redirection.
   - Under **Performance**: Static Content Compression.
   - Under **Management Tools**: IIS Management Console.
7. Click **Next**, then **Install**. Wait for it to finish, then **Close**.

## 3. Install URL Rewrite and Application Request Routing

Plain IIS can't reverse-proxy to another port — these two free Microsoft
downloads add that ability.

1. Open a browser, go to
   https://www.iis.net/downloads/microsoft/url-rewrite — download and run
   the installer. Click **Next** → accept the license → **Install** →
   **Finish**.
2. Go to
   https://www.iis.net/downloads/microsoft/application-request-routing —
   download and run it the same way (**Next** → accept → **Install** →
   **Finish**). Install this one *after* URL Rewrite.

## 4. Turn on ARR's proxy function

Installing ARR does not enable proxying by itself — this is a separate
switch.

1. Open **IIS Manager** (search the Start menu for "Internet Information
   Services (IIS) Manager").
2. In the left-hand tree, click the **top node** — your server's computer
   name (not "Sites", not "Default Web Site").
3. In the middle pane, double-click **Application Request Routing Cache**.
4. In the right-hand **Actions** pane, click **Server Proxy Settings...**.
5. Check the box **Enable proxy**.
6. Click **Apply** (top right of the Actions pane).

## 5. Point Default Web Site at the built frontend

1. In the left tree, expand **Sites** → click **Default Web Site**.
2. In the right **Actions** pane, click **Basic Settings...**.
3. Next to **Physical path**, click the `...` button, browse to
   `D:\apps\frontend-src\dist`, click **OK**.
4. Click **OK** to close Basic Settings.

## 6. Add the three URL Rewrite rules (wizard, no XML typing)

1. With **Default Web Site** still selected in the left tree, double-click
   **URL Rewrite** in the middle pane.
2. In the right Actions pane, click **Add Rule(s)...**.
3. Under **Inbound rules**, select **Blank rule**, click **OK**.

**Rule 1 — proxy the API:**

- **Name**: `Proxy to backend API`
- **Match URL** section:
  - Requested URL: `Matches the Pattern`
  - Using: `Regular Expressions`
  - Pattern: `^api/(.*)`
- **Conditions** section: leave empty.
- **Action** section:
  - Action type: `Rewrite`
  - Rewrite URL: `http://127.0.0.1:5000/api/{R:1}`
  - Check **Stop processing of subsequent rules**.
- Click **Apply** (top right).

**Rule 2 — proxy uploaded images:** back in the URL Rewrite list, click **Add
Rule(s)...** → **Blank rule** → **OK**, then:

- **Name**: `Proxy to backend uploads`
- Match URL: Requested URL = `Matches the Pattern`, Using =
  `Regular Expressions`, Pattern = `^uploads/(.*)`
- Action: Action type = `Rewrite`, Rewrite URL =
  `http://127.0.0.1:5000/uploads/{R:1}`, check **Stop processing of
  subsequent rules**.
- Click **Apply**.

**Rule 3 — SPA fallback** (so refreshing a page like `/depots/123` doesn't
404): **Add Rule(s)...** → **Blank rule** → **OK**, then:

- **Name**: `SPA fallback`
- Match URL: Requested URL = `Matches the Pattern`, Using =
  `Regular Expressions`, Pattern = `.*`
- **Conditions** section: **Logical grouping**: `Match All`, then click
  **Add...** twice to add:
  1. Condition input: `{REQUEST_FILENAME}`, Check if input string:
     `Is Not a File`
  2. Condition input: `{REQUEST_FILENAME}`, Check if input string:
     `Is Not a Directory`
- Action: Action type = `Rewrite`, Rewrite URL = `/index.html`, check **Stop
  processing of subsequent rules**.
- Click **Apply**.

**Check the order.** Back in the URL Rewrite rule list, you should see all
three rules, in this order: *Proxy to backend API*, *Proxy to backend
uploads*, *SPA fallback*. If `SPA fallback` is not last, click it, then click
**Move Down** in the Actions pane until it is — otherwise every `/api/*`
request gets swallowed by the fallback rule and returns the React app
instead of reaching the backend.

## 7. HTTPS certificate

**Option A — free trusted certificate (win-acme), a few clicks + one typed
number:**

1. Download win-acme from https://www.win-acme.com/ and extract it, e.g. to
   `C:\tools\win-acme`.
2. Double-click `wacs.exe`. A console window opens with a numbered menu —
   this needs your domain's DNS already pointed at this server, and port 80
   reachable from the internet.
3. Press `N` then Enter (create certificate, default settings).
4. When it lists your IIS sites, choose **Default Web Site**.
5. Let it finish — it creates the HTTPS binding on Default Web Site and sets
   up its own renewal, automatically.

**Option B — you already have a certificate file (.pfx), fully GUI:**

1. In IIS Manager, click your **server name** node → double-click **Server
   Certificates** → in the Actions pane click **Import...** → browse to your
   `.pfx` file, enter its password, **OK**.
2. Click **Default Web Site** → in the Actions pane click **Bindings...** →
   **Add...** → Type: `https`, Port: `443`, SSL certificate: pick the one you
   just imported → **OK** → **Close**.

If you have no domain or certificate yet, skip this for now — the site
still works over plain `http://` on port 80.

## 8. Firewall rules (Windows Defender Firewall GUI)

1. Press **Win+R**, type `wf.msc`, press Enter.
2. Click **Inbound Rules** (left pane) → **New Rule...** (right pane).
3. Rule Type: **Port** → **Next**.
4. **TCP**, **Specific local ports**: type `80` → **Next**.
5. **Allow the connection** → **Next** → leave all profiles checked →
   **Next**.
6. **Name**: `HTTP` → **Finish**.
7. Repeat steps 2–6 for port `443`, naming it `HTTPS`.

Nothing needs a rule for port 5000 (the backend) — it's only reachable from
this same machine, which Windows Firewall already allows by default.

## 9. Verify — in a browser, no command line at all

1. Go to `http://your-server-ip/health/live` (or `https://your-domain` if
   you did step 7) — you should see `{"status":"UP"}`.
2. Go to the site's root URL — you should see the sign-in page.
3. Sign in, then try refreshing the page on a nested route (e.g. after
   navigating to Depots) — it should reload correctly instead of showing a
   404, confirming the SPA fallback rule works.

## Later: deploying an update

- **Backend changed**: pull the new code into `D:\apps\backend-src`, open
  `services.msc`, find **Depot Backend**, right-click → **Restart**.
- **Frontend changed**: pull the new code into `D:\apps\frontend-src`,
  rebuild it (`pnpm build`) — IIS serves the new files immediately, no
  service restart needed.
