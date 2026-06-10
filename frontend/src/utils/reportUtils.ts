// src/utils/reportUtils.ts
export const generateDepotReport = (depot: any) => {
  const formatDate = (date?: string) => (date ? new Date(date).toLocaleDateString() : "—");

  const statusClass = (status: string) => {
    switch (status?.toLowerCase()) {
      case "active":
        return "status-active";
      case "expiring_soon":
        return "status-warning";
      case "expired":
        return "status-expired";
      default:
        return "status-default";
    }
  };

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Depot Report – ${depot.name || "Depot"}</title>
      <link href="https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,400;14..32,500;14..32,600;14..32,700&family=Noto+Sans+Khmer:wght@400;500;700&display=swap" rel="stylesheet">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          background: #f0f2f5;
          font-family: 'Inter', 'Noto Sans Khmer', sans-serif;
          padding: 2rem;
          color: #1e2a3a;
        }
        .report {
          max-width: 1000px;
          margin: 0 auto;
          background: white;
          border-radius: 24px;
          box-shadow: 0 25px 40px -12px rgba(0,0,0,0.2);
          overflow: hidden;
        }
        .header {
          background: #1e3a5f;
          padding: 1.8rem 2rem;
          color: white;
        }
        .header h1 { font-size: 1.8rem; font-weight: 700; margin-bottom: 0.25rem; }
        .header .sub { font-size: 0.8rem; opacity: 0.8; }
        .content { padding: 2rem; }
        .kv-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 2rem;
          border-radius: 4px;
          border: 1px solid #ddd;
          overflow: hidden;
          box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        }
        .kv-table th {
          background: #f9fafb;
          text-align: left;
          padding: 0.9rem 1rem;
          font-weight: 600;
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: #2c5f8a;
          width: 160px;
          border-bottom: 1px solid #e5e7eb;
        }
        .kv-table td {
          padding: 0.9rem 1rem;
          border-bottom: 1px solid #f3f4f6;
          font-size: 0.9rem;
        }
        .badge {
          display: inline-block;
          padding: 0.25rem 0.75rem;
          border-radius: 40px;
          font-size: 0.7rem;
          font-weight: 600;
        }
        .status-active { background: #d1fae5; color: #0b5e42; }
        .status-warning { background: #fef3c7; color: #92400e; }
        .status-expired { background: #fee2e2; color: #b91c1c; }
        .status-default { background: #e5e7eb; color: #1f2937; }
        .brands-title {
          font-size: 1rem;
          font-weight: 600;
          margin: 1.5rem 0 0.75rem 0;
          color: #1e3a5f;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .brand-table {
          width: 100%;
          border-collapse: collapse;
          border-radius: 4px;
          overflow: hidden;
          box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        }
        .brand-table th {
          background: #f9fafb;
          padding: 0.6rem 1rem;
          text-align: left;
          font-weight: 600;
          font-size: 0.75rem;
          text-transform: uppercase;
          color: #2c5f8a;
        }
        .brand-table td {
          padding: 0.6rem 1rem;
          border-bottom: 2px solid #f3f4f6;
        }
        .footer {
          margin-top: 2rem;
          text-align: center;
          font-size: 0.7rem;
          color: #6c757d;
          border-top: 1px solid #e5e7eb;
          padding-top: 1.2rem;
        }
        @media print {
          body { background: white; padding: 0; }
          .report { box-shadow: none; border-radius: 0; }
          .header { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      </style>
    </head>
    <body>
      <div class="report">
        <div class="header">
          <h1> <img src="../../image/gb-logo-Photoroom.png" style="width: 100px;height: 100px;"> Depot Report</h1>
          <div class="sub">${depot.name || "Depot"} · ${depot.code || "—"}</div>
          <div class="sub">Generated on ${new Date().toLocaleString()}</div>
        </div>
        <div class="content">
          <table class="kv-table">
            <tbody>
              <tr><th>DEPOT NAME</th><td>${depot.name || "—"}</td></tr>
              <tr><th>DEPOT CODE</th><td>${depot.code || "—"}</td></tr>
              <tr><th>STATUS</th><td><span class="badge ${statusClass(depot.reportStatus || depot.status)}">${(depot.reportStatus || depot.status || "ACTIVE").toUpperCase()}</span></td></tr>
              <tr><th>PROVINCE</th><td>${depot.city || "—"}</td></tr>
              <tr><th>DISTRICT</th><td>${depot.district || "—"}</td></tr>
              <tr><th>FULL ADDRESS</th><td>${depot.fullAddress || "Not provided"}</td></tr>
              <tr><th>OWNER</th><td>${depot.owner || "No owner assigned"}</td></tr>
              <tr><th>OWNER PHONE</th><td>${depot.ownerPhone || depot.phone || "—"}</td></tr>
              <tr><th>CREATED DATE</th><td>${formatDate(depot.createdAt)}</td></tr>
              <tr><th>EXPIRY DATE</th><td>${formatDate(depot.expiryDate)}</td></tr>
            </tbody>
          </table>
          <div class="brands-title">📦 Assigned Brands</div>
          <table class="brand-table">
            <thead><tr><th>Brand Name</th></tr></thead>
            <tbody>
              ${depot.brands?.length ? depot.brands.map((b: string) => `<tr><td>${b}</td></tr>`).join("") : "<tr><td>No brands assigned</td></tr>"}
            </tbody>
          </table>
          <div class="footer">Brand Depot Tracking System – Confidential Operational Report</div>
        </div>
      </div>
      <script>
        // Automatically open print dialog after styles load
        setTimeout(() => window.print(), 300);
      </script>
    </body>
    </html>
  `;

  // Create a hidden iframe, write the HTML, and trigger print
  const iframe = document.createElement("iframe");
  iframe.style.position = "absolute";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "none";
  document.body.appendChild(iframe);

  const iframeDoc = iframe.contentWindow?.document;
  if (!iframeDoc) {
    alert("Could not create report. Please try again.");
    document.body.removeChild(iframe);
    return;
  }

  iframeDoc.open();
  iframeDoc.write(html);
  iframeDoc.close();

  // Wait for fonts and layout to render, then print
  iframe.contentWindow?.focus();
  setTimeout(() => {
    iframe.contentWindow?.print();
    // Remove iframe after print dialog is closed (optional)
    setTimeout(() => {
      document.body.removeChild(iframe);
    }, 1000);
  }, 500);
};
