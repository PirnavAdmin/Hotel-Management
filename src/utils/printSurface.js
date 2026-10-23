export async function printSurface(elementId, options = {}) {
  if (typeof document === "undefined" || typeof window === "undefined") return false;

  const source = document.getElementById(elementId);
  if (!source || !String(source.textContent || "").trim()) {
    window.alert(options.emptyMessage || "There is no printable content available.");
    return false;
  }

  const isThermal = options.format === "thermal";
  const docTitle = options.title || "Print Document";

  try {
    // Remove any previous print frame if present
    const prevFrame = document.getElementById("__pos_print_frame__");
    if (prevFrame) prevFrame.remove();

    const iframe = document.createElement("iframe");
    iframe.id = "__pos_print_frame__";
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    iframe.style.visibility = "hidden";
    document.body.appendChild(iframe);

    const win = iframe.contentWindow;
    if (!win) throw new Error("Iframe window not accessible");
    const doc = win.document;

    // Collect active stylesheet rules
    let stylesheetText = "";
    try {
      document.querySelectorAll("style").forEach((style) => {
        stylesheetText += (style.textContent || "") + "\n";
      });
      for (const sheet of Array.from(document.styleSheets)) {
        try {
          for (const rule of Array.from(sheet.cssRules || [])) {
            stylesheetText += rule.cssText + "\n";
          }
        } catch {}
      }
    } catch {}

    doc.open();
    doc.write(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${docTitle}</title>
  <style>
    ${stylesheetText}

    :root {
      --text-main: #0f172a;
      --text-muted: #475569;
      --text-dim: #64748b;
      --bg-primary: #ffffff;
      --bg-secondary: #f8fafc;
      --bg-tertiary: #f1f5f9;
      --bg-card: #f8fafc;
      --border-card: #cbd5e1;
      --border-subtle: #e2e8f0;
      --accent-amber: #b45309;
      --status-vacant: #10b981;
    }

    *, *::before, *::after {
      box-sizing: border-box !important;
    }

    @page {
      size: ${isThermal ? "80mm auto" : "A4 portrait"};
      margin: ${isThermal ? "0mm" : "8mm"};
    }

    html, body {
      margin: 0 !important;
      padding: 0 !important;
      background: #ffffff !important;
      color: #000000 !important;
      width: 100% !important;
      height: auto !important;
      min-height: 0 !important;
      overflow: visible !important;
      font-family: system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    /* Force the target print surface to be fully visible and rendered */
    #printable-receipt,
    #printable-report {
      display: block !important;
      visibility: visible !important;
      opacity: 1 !important;
      position: relative !important;
      margin: 0 auto !important;
      padding: ${isThermal ? "2mm 3mm" : "0"} !important;
      width: ${isThermal ? "76mm" : "194mm"} !important;
      max-width: ${isThermal ? "76mm" : "194mm"} !important;
      background: #ffffff !important;
      color: #000000 !important;
      border: none !important;
      box-shadow: none !important;
      overflow: visible !important;
    }

    #printable-receipt *,
    #printable-report * {
      visibility: visible !important;
      opacity: 1 !important;
      color: #000000 !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    .no-print,
    .no-print * {
      display: none !important;
      visibility: hidden !important;
      height: 0 !important;
      margin: 0 !important;
      padding: 0 !important;
      border: none !important;
    }

    table {
      border-collapse: collapse !important;
      width: 100% !important;
      page-break-inside: auto !important;
    }

    tr {
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }

    th, td {
      border-color: #cbd5e1 !important;
    }

    img {
      max-width: 100% !important;
      height: auto !important;
    }
  </style>
</head>
<body>
  ${source.outerHTML}
</body>
</html>`);
    doc.close();

    // Wait for fonts & images
    try {
      await (doc.fonts?.ready || Promise.resolve());
    } catch {}

    const images = Array.from(doc.images || []);
    if (images.length > 0) {
      await Promise.all(
        images.map((img) => {
          if (img.complete) return Promise.resolve();
          return new Promise((res) => {
            img.onload = res;
            img.onerror = res;
          });
        })
      );
    }

    await new Promise((resolve) => setTimeout(resolve, 150));

    win.focus();
    win.print();

    // Clean up iframe after printing
    setTimeout(() => {
      try {
        iframe.remove();
      } catch {}
    }, 2000);

    return true;
  } catch (err) {
    console.warn("Iframe print failed, falling back to direct window.print():", err);
    window.print();
    return true;
  }
}
