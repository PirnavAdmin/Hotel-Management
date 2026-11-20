/**
 * Helper utilities for auto-detecting logo background and auto-fitting logos cleanly.
 */

export function detectImageBgColor(img) {
  try {
    if (!img) return null;
    const w = img.naturalWidth || img.width || 0;
    const h = img.naturalHeight || img.height || 0;
    if (w <= 0 || h <= 0) return null;

    const canvas = document.createElement("canvas");
    canvas.width = Math.min(w, 80);
    canvas.height = Math.min(h, 80);
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;

    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    const corners = [
      [2, 2],
      [canvas.width - 3, 2],
      [2, canvas.height - 3],
      [canvas.width - 3, canvas.height - 3],
    ];

    let hasAlpha = false;
    let rSum = 0, gSum = 0, bSum = 0, count = 0;

    for (const [cx, cy] of corners) {
      const p = ctx.getImageData(cx, cy, 1, 1).data;
      if (p[3] < 30) {
        hasAlpha = true;
      }
      rSum += p[0];
      gSum += p[1];
      bSum += p[2];
      count++;
    }

    if (hasAlpha) return "transparent";

    const r = Math.round(rSum / count);
    const g = Math.round(gSum / count);
    const b = Math.round(bSum / count);
    return `rgb(${r}, ${g}, ${b})`;
  } catch (err) {
    console.warn("[logoHelper] detectImageBgColor error:", err);
    return null;
  }
}

export function processLogoImage(file, callback) {
  const reader = new FileReader();
  reader.onload = (e) => {
    const rawDataUrl = e.target?.result;
    if (!rawDataUrl) return;

    if (file.type === "image/svg+xml") {
      callback({ dataUrl: rawDataUrl, bgColor: "transparent" });
      return;
    }

    const img = new Image();
    img.onload = () => {
      try {
        const origW = img.naturalWidth || img.width;
        const origH = img.naturalHeight || img.height;
        const canvas = document.createElement("canvas");
        canvas.width = origW;
        canvas.height = origH;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) {
          callback({ dataUrl: rawDataUrl, bgColor: "transparent" });
          return;
        }

        ctx.drawImage(img, 0, 0);
        const imgData = ctx.getImageData(0, 0, origW, origH);
        const data = imgData.data;

        // Sample corner pixels to detect background color
        const corners = [
          [2, 2],
          [origW - 3, 2],
          [2, origH - 3],
          [origW - 3, origH - 3],
        ];

        let hasAlpha = false;
        let rSum = 0, gSum = 0, bSum = 0;
        corners.forEach(([x, y]) => {
          const idx = (Math.max(0, Math.min(origH - 1, y)) * origW + Math.max(0, Math.min(origW - 1, x))) * 4;
          if (data[idx + 3] < 30) hasAlpha = true;
          rSum += data[idx];
          gSum += data[idx + 1];
          bSum += data[idx + 2];
        });

        const avgR = Math.round(rSum / corners.length);
        const avgG = Math.round(gSum / corners.length);
        const avgB = Math.round(bSum / corners.length);
        const detectedBg = hasAlpha ? "transparent" : `rgb(${avgR}, ${avgG}, ${avgB})`;

        // Scan pixels to find bounding box of the non-background logo graphic
        let minX = origW, minY = origH, maxX = 0, maxY = 0;
        const colorDiffThreshold = hasAlpha ? 35 : 20;

        for (let y = 0; y < origH; y += 2) {
          for (let x = 0; x < origW; x += 2) {
            const idx = (y * origW + x) * 4;
            const a = data[idx + 3];
            let isContent = false;
            if (hasAlpha) {
              if (a > 35) isContent = true;
            } else {
              const diff = Math.abs(data[idx] - avgR) + Math.abs(data[idx + 1] - avgG) + Math.abs(data[idx + 2] - avgB);
              if (diff > colorDiffThreshold && a > 50) isContent = true;
            }

            if (isContent) {
              if (x < minX) minX = x;
              if (x > maxX) maxX = x;
              if (y < minY) minY = y;
              if (y > maxY) maxY = y;
            }
          }
        }

        // If a meaningful graphic was found, crop and center it into a clean square canvas
        if (maxX > minX && maxY > minY) {
          const contentW = maxX - minX;
          const contentH = maxY - minY;
          // Add 6% padding around graphic so it fits nicely
          const pad = Math.round(Math.max(contentW, contentH) * 0.06);
          const cropX = Math.max(0, minX - pad);
          const cropY = Math.max(0, minY - pad);
          const cropW = Math.min(origW - cropX, contentW + pad * 2);
          const cropH = Math.min(origH - cropY, contentH + pad * 2);

          const targetDim = Math.min(480, Math.max(cropW, cropH, 128));
          const outCanvas = document.createElement("canvas");
          outCanvas.width = targetDim;
          outCanvas.height = targetDim;
          const outCtx = outCanvas.getContext("2d");

          if (!hasAlpha) {
            outCtx.fillStyle = detectedBg;
            outCtx.fillRect(0, 0, targetDim, targetDim);
          }

          const scale = Math.min(targetDim / cropW, targetDim / cropH);
          const drawW = cropW * scale;
          const drawH = cropH * scale;
          const drawX = (targetDim - drawW) / 2;
          const drawY = (targetDim - drawH) / 2;

          outCtx.drawImage(img, cropX, cropY, cropW, cropH, drawX, drawY, drawW, drawH);
          const finalDataUrl = outCanvas.toDataURL("image/png", 0.95);
          callback({ dataUrl: finalDataUrl, bgColor: detectedBg });
          return;
        }

        callback({ dataUrl: rawDataUrl, bgColor: detectedBg });
      } catch (err) {
        console.warn("[logoHelper] processLogoImage error:", err);
        callback({ dataUrl: rawDataUrl, bgColor: "transparent" });
      }
    };
    img.onerror = () => callback({ dataUrl: rawDataUrl, bgColor: "transparent" });
    img.src = rawDataUrl;
  };
  reader.readAsDataURL(file);
}
