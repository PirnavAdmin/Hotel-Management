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
        // Cap maximum dimension to 200px for optimal speed and zero storage quota issues
        const maxTargetDim = 200;

        const canvas = document.createElement("canvas");
        const scaleInitial = Math.min(1, maxTargetDim / Math.max(origW, origH));
        const sampleW = Math.max(1, Math.round(origW * scaleInitial));
        const sampleH = Math.max(1, Math.round(origH * scaleInitial));
        canvas.width = sampleW;
        canvas.height = sampleH;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) {
          callback({ dataUrl: rawDataUrl, bgColor: "transparent" });
          return;
        }

        ctx.drawImage(img, 0, 0, sampleW, sampleH);
        const imgData = ctx.getImageData(0, 0, sampleW, sampleH);
        const data = imgData.data;

        // Sample corner pixels to detect background color
        const corners = [
          [2, 2],
          [sampleW - 3, 2],
          [2, sampleH - 3],
          [sampleW - 3, sampleH - 3],
        ];

        let hasAlpha = false;
        let rSum = 0, gSum = 0, bSum = 0;
        corners.forEach(([x, y]) => {
          const idx = (Math.max(0, Math.min(sampleH - 1, y)) * sampleW + Math.max(0, Math.min(sampleW - 1, x))) * 4;
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
        let minX = sampleW, minY = sampleH, maxX = 0, maxY = 0;
        const colorDiffThreshold = hasAlpha ? 35 : 20;

        for (let y = 0; y < sampleH; y += 2) {
          for (let x = 0; x < sampleW; x += 2) {
            const idx = (y * sampleW + x) * 4;
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

        const outCanvas = document.createElement("canvas");
        const targetDim = Math.min(maxTargetDim, Math.max(maxX - minX, maxY - minY, 120));
        outCanvas.width = targetDim;
        outCanvas.height = targetDim;
        const outCtx = outCanvas.getContext("2d");

        if (!hasAlpha) {
          outCtx.fillStyle = detectedBg;
          outCtx.fillRect(0, 0, targetDim, targetDim);
        }

        if (maxX > minX && maxY > minY) {
          const contentW = maxX - minX;
          const contentH = maxY - minY;
          const pad = Math.round(Math.max(contentW, contentH) * 0.05);
          const cropX = Math.max(0, minX - pad);
          const cropY = Math.max(0, minY - pad);
          const cropW = Math.min(sampleW - cropX, contentW + pad * 2);
          const cropH = Math.min(sampleH - cropY, contentH + pad * 2);

          const scale = Math.min(targetDim / cropW, targetDim / cropH);
          const drawW = cropW * scale;
          const drawH = cropH * scale;
          const drawX = (targetDim - drawW) / 2;
          const drawY = (targetDim - drawH) / 2;

          outCtx.drawImage(canvas, cropX, cropY, cropW, cropH, drawX, drawY, drawW, drawH);
        } else {
          const scale = Math.min(targetDim / sampleW, targetDim / sampleH);
          const drawW = sampleW * scale;
          const drawH = sampleH * scale;
          const drawX = (targetDim - drawW) / 2;
          const drawY = (targetDim - drawH) / 2;
          outCtx.drawImage(canvas, 0, 0, sampleW, sampleH, drawX, drawY, drawW, drawH);
        }

        const finalDataUrl = outCanvas.toDataURL("image/png", 0.85);
        callback({ dataUrl: finalDataUrl, bgColor: detectedBg });
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
