// src/utils/depotReport.ts
import { toCanvas } from "html-to-image";
import jsPDF from "jspdf";

export interface DepotForReport {
  id: number;
  name: string;
  code: string;
  status: string;
  city?: string;
  district?: string;
  fullAddress?: string;
  owner?: string;
  ownerPhone?: string;
  ownerImage?: string; // URL of employee image
  phone?: string;
  createdAt?: string;
  expiryDate?: string;
  brands?: string[];
}

/**
 * Generate a modern banner‑style report HTML (safe colours, no oklch)
 */
export const generateReportHTML = (depot: DepotForReport): string => {
  const formatDate = (date?: string) => (date ? new Date(date).toLocaleDateString() : "—");

  const statusClass = (status: string) => {
    switch (status?.toLowerCase()) {
      case "active":
        return "badge-active";
      case "expiring_soon":
        return "badge-warning";
      case "expired":
        return "badge-expired";
      default:
        return "badge-default";
    }
  };

  // Fallback for missing employee image
  const employeeImage = depot.ownerImage && depot.ownerImage.trim() !== "" ? depot.ownerImage : "";

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Depot Report – ${depot.name}</title>
      <link href="https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,400;14..32,500;14..32,600;14..32,700&family=Noto+Sans+Khmer:wght@400;500;700&display=swap" rel="stylesheet">
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          background: #eef2f5;
          font-family: 'Inter', 'Noto Sans Khmer', sans-serif;
          padding: 0rem;
          color: #1e2a3a;
        }
        .report {
          max-width: 1100px;
          margin: 0 auto;
          background: white;
          border-radius: 0px;
          box-shadow: 0 20px 35px -8px rgba(0,0,0,0.1);
          overflow: hidden;
        }
        /* Banner header */
        .banner {
          background: linear-gradient(135deg, #1e3a5f 0%, #2c5f8a 100%);
          padding: 2rem 2rem 1.5rem;
          color: white;
        }
        .banner h1 {
          font-size: 2rem;
          font-weight: 700;
          letter-spacing: -0.02em;
          margin-bottom: 0.25rem;
        }
        .banner p {
          opacity: 0.85;
          font-size: 0.9rem;
        }
        .badge {
          display: inline-block;
          padding: 0.2rem 0.75rem;
          border-radius: 4px;
          font-size: 0.7rem;
          font-weight: 600;
          margin-left: 0.75rem;
        }
        .badge-active { background: #2e7d64; color: white; }
        .badge-warning { background: #b95e1a; color: white; }
        .badge-expired { background: #b91c1c; color: white; }
        .badge-default { background: #4b5563; color: white; }
        /* Two‑column content */
        .content {
          padding: 1rem;
          display: flex;
          gap: 2rem;
          flex-wrap: wrap;
        }
        .left-col {
          flex: 2;
          min-width: 240px;
        }
        .right-col {
          flex: 1.2;
          min-width: 240px;
        }
        /* Info cards */
        .info-card {
          background: #f9fafb;
          border-radius: 4px;
          padding: 1.2rem;
          margin-bottom: 1.5rem;
          border: 1px solid #e5e7eb;
        }
        .info-card h3 {
          font-size: 0.7rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: #2c5f8a;
          margin-bottom: 0.75rem;
        }
        .info-item {
          display: flex;
          margin-bottom: 0.6rem;
          font-size: 0.9rem;
        }
        .info-label {
          width: 100px;
          font-weight: 600;
          color: #4b5563;
        }
        .info-value {
          flex: 1;
          color: #1f2937;
        }
        /* Employee card with image */
        .employee-card {
          background: white;
          border-radius: 4px;
          padding: 1.5rem;
          text-align: center;
          border: 1px solid #e5e7eb;
        }
        .employee-image {
          width: 100px;
          height: 100px;
          border-radius: 50%;
          object-fit: cover;
          margin: 0 auto 1rem;
          display: block;
          border: 3px solid #2c5f8a;
        }
        .employee-initials {
          width: 100px;
          height: 100px;
          border-radius: 50%;
          background: #e5e7eb;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 1rem;
          font-size: 2rem;
          font-weight: bold;
          color: #2c5f8a;
        }
        .employee-name {
          font-size: 1.2rem;
          font-weight: 700;
          margin-bottom: 0.25rem;
        }
        .employee-role {
          font-size: 0.8rem;
          color: #2c5f8a;
          margin-bottom: 0.75rem;
        }
        .brands-section {
          margin-top: 0.5rem;
        }
        .brands-section h3 {
          font-size: 0.7rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: #2c5f8a;
          margin-bottom: 0.5rem;
        }
        .brand-list {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
        }
        .brand-tag {
          background: #eef2ff;
          padding: 0.25rem 0.75rem;
          border-radius: 3px;
          font-size: 0.8rem;
          color: #1e3a5f;
        }
        .footer {
          text-align: center;
          font-size: 0.7rem;
          color: #6b7280;
          border-top: 1px solid #e5e7eb;
          padding: 1rem;
          background: #f9fafb;
        }
        @media print {
          body { background: white; padding: 0; }
          .report { box-shadow: none; border-radius: 0; }
          .banner { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      </style>
    </head>
    <body>
      <div class="report">
        <div class="banner">
          <h1>Depot Operations Report</h1>
          <p>${depot.name} · ${depot.code || "—"} · Generated on ${new Date().toLocaleString()}</p>
        </div>

        <div class="content">
          <!-- Left column: Depot information -->
          <div class="left-col">
            <div class="info-card">
              <h3><img src="../../image/gb-logo-Photoroom.png" style="width: 50px;height: 50px;"> Depot Details</h3>
              <div class="info-item"><span class="info-label">Depot Name</span><span class="info-value">${depot.name || "—"}</span></div>
              <div class="info-item"><span class="info-label">Depot Code</span><span class="info-value">${depot.code || "—"}</span></div>
              <div class="info-item"><span class="info-label">Status</span><span class="info-value"><span class="badge ${statusClass(depot.status)}">${(depot.status || "ACTIVE").toUpperCase()}</span></span></div>
              <div class="info-item"><span class="info-label">Province</span><span class="info-value">${depot.city || "—"}</span></div>
              <div class="info-item"><span class="info-label">District</span><span class="info-value">${depot.district || "—"}</span></div>
              <div class="info-item"><span class="info-label">Full Address</span><span class="info-value">${depot.fullAddress || "Not provided"}</span></div>
              <div class="info-item"><span class="info-label">Contact Phone</span><span class="info-value">${depot.phone || "—"}</span></div>
              <div class="info-item"><span class="info-label">Created Date</span><span class="info-value">${formatDate(depot.createdAt)}</span></div>
              <div class="info-item"><span class="info-label">Expiry Date</span><span class="info-value">${formatDate(depot.expiryDate)}</span></div>
            </div>

            <div class="brands-section">
              <h3>Authorised Brands</h3>
              <div class="brand-list">
                ${
                  depot.brands?.length
                    ? depot.brands.map((b) => `<span class="brand-tag">${b}</span>`).join("")
                    : '<span class="brand-tag">No brands assigned</span>'
                }
              </div>
            </div>
          </div>

          <!-- Right column: Employee information with image -->
          <div class="right-col">
            <div class="employee-card">
              ${
                employeeImage
                  ? `<img class="employee-image" src="${employeeImage}" alt="Employee" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex'">`
                  : ""
              }
              <div class="employee-initials" ${employeeImage ? 'style="display:none"' : ""}>
                ${(depot.owner || "?").charAt(0).toUpperCase()}
              </div>
              <div class="employee-name">${depot.owner || "No owner assigned"}</div>
              <div class="employee-role">Depot Owner / Manager</div>
              <hr style="margin: 1rem 0; border: 0; border-top: 1px solid #e5e7eb;">
              <div class="info-item"><span class="info-label">Phone</span><span class="info-value">${depot.ownerPhone || "—"}</span></div>
              <div class="info-item"><span class="info-label">Email</span><span class="info-value">${depot.email || "—"}</span></div>
              <div class="info-item"><span class="info-label">Employee ID</span><span class="info-value">${depot.employeeCode || "—"}</span></div>
            </div>
          </div>
        </div>

        <div class="footer">
          Brand Depot Tracking System – Confidential Operational Report
        </div>
      </div>
    </body>
    </html>
  `;
};

/**
 * Helper: create an iframe with the report HTML, wait for load, capture with html-to-image, then clean up.
 */
const captureReport = async (depot: DepotForReport): Promise<HTMLCanvasElement> => {
  const html = generateReportHTML(depot);
  const iframe = document.createElement("iframe");
  iframe.style.position = "absolute";
  iframe.style.top = "-9999px";
  iframe.style.left = "-9999px";
  iframe.style.width = "1000px";
  iframe.style.border = "none";
  document.body.appendChild(iframe);

  const iframeDoc = iframe.contentWindow?.document;
  if (!iframeDoc) {
    document.body.removeChild(iframe);
    throw new Error("Cannot create iframe document");
  }

  iframeDoc.open();
  iframeDoc.write(html);
  iframeDoc.close();

  await new Promise((resolve) => setTimeout(resolve, 300));

  const targetElement = iframe.contentWindow?.document.body;
  if (!targetElement) throw new Error("Cannot access iframe body");

  const canvas = await toCanvas(targetElement, {
    scale: 2,
    backgroundColor: "#ffffff",
    cacheBust: true,
    pixelRatio: 2,
  });

  document.body.removeChild(iframe);
  return canvas;
};

/**
 * Export depot report as PNG or JPEG
 */
export const exportDepotReportAsImage = async (
  depot: DepotForReport,
  format: "png" | "jpeg",
): Promise<void> => {
  const canvas = await captureReport(depot);
  const link = document.createElement("a");
  link.download = `Depot_Report_${depot.id}_${new Date().toISOString().split("T")[0]}.${format}`;
  link.href = canvas.toDataURL(`image/${format}`);
  link.click();
};

/**
 * Export depot report as PDF
 */
export const exportDepotReportAsPDF = async (depot: DepotForReport): Promise<void> => {
  const canvas = await captureReport(depot);
  const imgData = canvas.toDataURL("image/png");
  const pdf = new jsPDF("p", "mm", "a4");
  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
  pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
  pdf.save(`Depot_Report_${depot.id}_${new Date().toISOString().split("T")[0]}.pdf`);
};

/**
 * Print the report directly (opens print dialog)
 */
export const printDepotReport = (depot: DepotForReport): void => {
  const html = generateReportHTML(depot);
  const iframe = document.createElement("iframe");
  iframe.style.position = "absolute";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "none";
  document.body.appendChild(iframe);

  const iframeDoc = iframe.contentWindow?.document;
  if (!iframeDoc) {
    alert("Could not open print preview.");
    document.body.removeChild(iframe);
    return;
  }

  iframeDoc.open();
  iframeDoc.write(html);
  iframeDoc.close();

  iframe.contentWindow?.focus();
  iframe.contentWindow?.print();

  setTimeout(() => {
    document.body.removeChild(iframe);
  }, 1000);
};
