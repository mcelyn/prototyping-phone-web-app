export type BorderStyle = "concert" | "editorial" | "korean" | "party";

export type InstagramFilter =
  | "normal"
  | "clarendon"
  | "gingham"
  | "juno"
  | "lark"
  | "valencia"
  | "moon"
  | "slumber";

export interface PhotoStripOptions {
  border?: BorderStyle;
  filter?: InstagramFilter;
  dateText?: string;
}

export const BORDER_OPTIONS: { id: BorderStyle; name: string; icon: string; desc: string }[] = [
  {
    id: "concert",
    name: "Concert Strip",
    icon: "★",
    desc: "Heavy matte cardstock with black stars & concert stamp",
  },
  {
    id: "editorial",
    name: "Editorial Beauty",
    icon: "◆",
    desc: "Luxury event strip with brand sub-headers & clean footer",
  },
  {
    id: "korean",
    name: "Art Exhibition",
    icon: "✒️",
    desc: "Warm linen paper with cursive script & frame indices",
  },
  {
    id: "party",
    name: "2x2 Block Party",
    icon: "⚏",
    desc: "2x2 grid card with bold street festival banners",
  },
];

export const FILTER_OPTIONS: { id: InstagramFilter; name: string; previewColor: string }[] = [
  { id: "normal", name: "Original", previewColor: "#a3a3a3" },
  { id: "clarendon", name: "Clarendon", previewColor: "#38bdf8" },
  { id: "gingham", name: "Gingham", previewColor: "#fef08a" },
  { id: "juno", name: "Juno", previewColor: "#fb923c" },
  { id: "lark", name: "Lark", previewColor: "#86efac" },
  { id: "valencia", name: "Valencia", previewColor: "#fde047" },
  { id: "moon", name: "Moon (B&W)", previewColor: "#f5f5f5" },
  { id: "slumber", name: "Slumber", previewColor: "#f472b6" },
];

/**
 * Apply realistic paper fiber & micro-grain texture across the entire strip
 */
function applyRealisticPaperTexture(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  paperType: "matte" | "linen" | "cardstock" | "gloss"
) {
  ctx.save();
  // Create noise buffer for realistic tactile paper grain
  const noiseCanvas = document.createElement("canvas");
  noiseCanvas.width = 300;
  noiseCanvas.height = 300;
  const nCtx = noiseCanvas.getContext("2d");
  if (!nCtx) {
    ctx.restore();
    return;
  }

  const imgData = nCtx.createImageData(300, 300);
  const data = imgData.data;

  for (let i = 0; i < data.length; i += 4) {
    const val = Math.floor(Math.random() * 255);
    // Natural paper fiber variation
    const isFiber = Math.random() < 0.002;
    data[i] = isFiber ? 80 : val;
    data[i + 1] = isFiber ? 70 : val;
    data[i + 2] = isFiber ? 60 : val;
    data[i + 3] = isFiber ? 28 : Math.random() < 0.25 ? 12 : 6;
  }
  nCtx.putImageData(imgData, 0, 0);

  // Pattern overlay in soft-light mode for authentic physical feel
  ctx.globalCompositeOperation = "soft-light";
  const pattern = ctx.createPattern(noiseCanvas, "repeat");
  if (pattern) {
    ctx.fillStyle = pattern;
    ctx.fillRect(0, 0, width, height);
  }

  // Subtle natural paper perimeter shading
  ctx.globalCompositeOperation = "multiply";
  const vignette = ctx.createRadialGradient(
    width / 2,
    height / 2,
    Math.min(width, height) * 0.45,
    width / 2,
    height / 2,
    Math.max(width, height) * 0.75
  );
  vignette.addColorStop(0, "rgba(255, 255, 255, 0)");
  vignette.addColorStop(1, "rgba(40, 35, 30, 0.04)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, width, height);

  ctx.restore();
}

/**
 * Apply authentic Instagram filter curves & tone overlays
 */
function applyInstagramFilter(
  ctx: CanvasRenderingContext2D,
  filter: InstagramFilter
) {
  switch (filter) {
    case "clarendon":
      ctx.filter = "contrast(120%) saturate(125%) brightness(104%)";
      break;
    case "gingham":
      ctx.filter = "contrast(92%) saturate(85%) brightness(105%) sepia(8%)";
      break;
    case "juno":
      ctx.filter = "contrast(115%) saturate(132%) brightness(102%)";
      break;
    case "lark":
      ctx.filter = "contrast(106%) saturate(110%) brightness(108%) hue-rotate(-5deg)";
      break;
    case "valencia":
      ctx.filter = "sepia(26%) contrast(108%) brightness(105%) saturate(108%)";
      break;
    case "moon":
      ctx.filter = "grayscale(100%) contrast(124%) brightness(103%)";
      break;
    case "slumber":
      ctx.filter = "sepia(20%) saturate(86%) brightness(104%) contrast(96%)";
      break;
    default:
      ctx.filter = "none";
      break;
  }
}

/**
 * Filter blend overlays
 */
function applyFilterOverlay(
  ctx: CanvasRenderingContext2D,
  filter: InstagramFilter,
  x: number,
  y: number,
  w: number,
  h: number
) {
  if (filter === "clarendon") {
    ctx.save();
    ctx.globalCompositeOperation = "soft-light";
    const grad = ctx.createLinearGradient(x, y, x, y + h);
    grad.addColorStop(0, "rgba(255, 235, 200, 0.15)");
    grad.addColorStop(1, "rgba(0, 60, 160, 0.22)");
    ctx.fillStyle = grad;
    ctx.fillRect(x, y, w, h);
    ctx.restore();
  } else if (filter === "valencia") {
    ctx.save();
    ctx.globalCompositeOperation = "color";
    ctx.fillStyle = "rgba(255, 220, 160, 0.18)";
    ctx.fillRect(x, y, w, h);
    ctx.restore();
  } else if (filter === "gingham") {
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    ctx.fillStyle = "rgba(35, 45, 60, 0.12)";
    ctx.fillRect(x, y, w, h);
    ctx.restore();
  } else if (filter === "juno") {
    ctx.save();
    ctx.globalCompositeOperation = "overlay";
    ctx.fillStyle = "rgba(255, 120, 40, 0.08)";
    ctx.fillRect(x, y, w, h);
    ctx.restore();
  } else if (filter === "slumber") {
    ctx.save();
    ctx.globalCompositeOperation = "soft-light";
    ctx.fillStyle = "rgba(220, 160, 200, 0.15)";
    ctx.fillRect(x, y, w, h);
    ctx.restore();
  }
}

/**
 * Helper to draw image with aspect fill
 */
function drawAspectFill(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  dx: number,
  dy: number,
  dw: number,
  dh: number
) {
  const imgRatio = img.width / img.height;
  const targetRatio = dw / dh;

  let sx = 0,
    sy = 0,
    sWidth = img.width,
    sHeight = img.height;

  if (imgRatio > targetRatio) {
    sWidth = img.height * targetRatio;
    sx = (img.width - sWidth) / 2;
  } else {
    sHeight = img.width / targetRatio;
    sy = (img.height - sHeight) / 2;
  }

  ctx.drawImage(img, sx, sy, sWidth, sHeight, dx, dy, dw, dh);
}

/**
 * Helper to draw a solid 5-point star
 */
function drawStar(ctx: CanvasRenderingContext2D, cx: number, cy: number, spikes: number, outerRadius: number, innerRadius: number) {
  let rot = (Math.PI / 2) * 3;
  let x = cx;
  let y = cy;
  const step = Math.PI / spikes;

  ctx.beginPath();
  ctx.moveTo(cx, cy - outerRadius);
  for (let i = 0; i < spikes; i++) {
    x = cx + Math.cos(rot) * outerRadius;
    y = cy + Math.sin(rot) * outerRadius;
    ctx.lineTo(x, y);
    rot += step;

    x = cx + Math.cos(rot) * innerRadius;
    y = cy + Math.sin(rot) * innerRadius;
    ctx.lineTo(x, y);
    rot += step;
  }
  ctx.lineTo(cx, cy - outerRadius);
  ctx.closePath();
  ctx.fill();
}

/**
 * High-res Photo Strip Generator supporting the 4 exact realistic paper styles
 */
export async function generatePhotoStrip(
  photoDataUrls: string[],
  options: PhotoStripOptions = {}
): Promise<{ blob: Blob; dataUrl: string }> {
  const {
    border = "concert",
    filter = "normal",
    dateText = new Date().toLocaleDateString("en-US", {
      month: "2-digit",
      day: "2-digit",
      year: "2-digit",
    }),
  } = options;

  const images = await Promise.all(
    photoDataUrls.map(
      (src) =>
        new Promise<HTMLImageElement>((resolve, reject) => {
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.onload = () => resolve(img);
          img.onerror = reject;
          img.src = src;
        })
    )
  );

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not get canvas context");

  // =========================================================================
  // STYLE 1: STAR CONCERT STRIP (Image 1: Ye Live at Gelredome Reference)
  // =========================================================================
  if (border === "concert") {
    const width = 1100;
    const paddingX = 60;
    const paddingTop = 90;
    const gap = 34;
    const photoW = width - paddingX * 2; // 980
    const photoH = Math.round(photoW * 0.72); // ~706
    const footerH = 340;
    const height = paddingTop + 4 * photoH + 3 * gap + footerH;

    canvas.width = width;
    canvas.height = height;

    // Heavy matte white paper base with natural warmth
    ctx.fillStyle = "#F6F5F2";
    ctx.fillRect(0, 0, width, height);

    // Render photos with realistic print paper inset
    images.slice(0, 4).forEach((img, i) => {
      const y = paddingTop + i * (photoH + gap);

      ctx.save();
      applyInstagramFilter(ctx, filter);
      drawAspectFill(ctx, img, paddingX, y, photoW, photoH);
      ctx.filter = "none";
      applyFilterOverlay(ctx, filter, paddingX, y, photoW, photoH);
      ctx.restore();

      // Subtle printed photo edge
      ctx.strokeStyle = "rgba(0, 0, 0, 0.4)";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(paddingX, y, photoW, photoH);
    });

    // Top Black Stars (matching Image 1)
    ctx.fillStyle = "#0A0A0A";
    drawStar(ctx, paddingX + 35, 48, 5, 26, 12);
    drawStar(ctx, width - paddingX - 35, 48, 5, 26, 12);

    // Bottom Concert Event Stamp & Stars (matching Image 1)
    const footerY = height - footerH;

    // Corner stars flanking the concert text
    drawStar(ctx, paddingX + 35, footerY + 60, 5, 28, 13);
    drawStar(ctx, paddingX + 15, height - 60, 5, 28, 13);
    drawStar(ctx, width - paddingX - 15, height - 60, 5, 28, 13);

    // Bold Concert block typography
    ctx.save();
    ctx.fillStyle = "#0A0A0A";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "900 52px -apple-system, BlinkMacSystemFont, 'Impact', 'Arial Black', sans-serif";

    ctx.fillText("LIVE AT", width / 2, footerY + 70);
    ctx.font = "900 58px -apple-system, BlinkMacSystemFont, 'Impact', 'Arial Black', sans-serif";
    ctx.fillText("PHOTO BOOTH", width / 2, footerY + 140);

    ctx.font = "800 40px -apple-system, BlinkMacSystemFont, 'Arial Black', sans-serif";
    ctx.fillText(dateText, width / 2, footerY + 215);
    ctx.font = "700 28px -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.fillText("SPECIAL EDITION", width / 2, footerY + 275);
    ctx.restore();

    // Apply tactile real paper texture overlay
    applyRealisticPaperTexture(ctx, width, height, "cardstock");
  }

  // =========================================================================
  // STYLE 2: EDITORIAL BEAUTY (Image 2: Sephora / YSE Beauty Reference)
  // =========================================================================
  else if (border === "editorial") {
    const width = 1100;
    const paddingX = 64;
    const paddingTop = 70;
    const headerBarH = 44;
    const gap = 38;
    const photoW = width - paddingX * 2;
    const photoH = Math.round(photoW * 0.72);
    const footerH = 310;
    const height = paddingTop + 4 * (photoH + headerBarH) + 3 * gap + footerH;

    canvas.width = width;
    canvas.height = height;

    // Premium bright editorial cardstock paper
    ctx.fillStyle = "#FBFBF9";
    ctx.fillRect(0, 0, width, height);

    images.slice(0, 4).forEach((img, i) => {
      const y = paddingTop + i * (photoH + headerBarH + gap);

      // Black sub-header bar over each photo ("THE TO-GLOW MENU" style)
      ctx.fillStyle = "#0A0A0A";
      ctx.fillRect(paddingX, y, photoW, headerBarH);

      ctx.save();
      ctx.fillStyle = "#FFFFFF";
      ctx.font = "800 24px -apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText("■  THE PHOTO BOOTH MENU", paddingX + 24, y + headerBarH / 2);
      ctx.restore();

      // Photo
      const photoY = y + headerBarH;
      ctx.save();
      applyInstagramFilter(ctx, filter);
      drawAspectFill(ctx, img, paddingX, photoY, photoW, photoH);
      ctx.filter = "none";
      applyFilterOverlay(ctx, filter, paddingX, photoY, photoW, photoH);
      ctx.restore();

      ctx.strokeStyle = "rgba(0, 0, 0, 0.3)";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(paddingX, photoY, photoW, photoH);
    });

    // Elegant Sephora/YSE Brand Footer
    const footerY = height - footerH + 40;
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    ctx.fillStyle = "#0A0A0A";
    ctx.font = "900 64px -apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif";
    ctx.fillText("STUDIO", width / 2, footerY + 35);

    ctx.font = "700 28px -apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif";
    ctx.letterSpacing = "6px";
    ctx.fillText("B E A U T Y", width / 2, footerY + 105);

    // Fine rule line
    ctx.strokeStyle = "#0A0A0A";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(width / 2 - 160, footerY + 145);
    ctx.lineTo(width / 2 + 160, footerY + 145);
    ctx.stroke();

    ctx.font = "600 28px -apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif";
    ctx.letterSpacing = "8px";
    ctx.fillText("E D I T I O N", width / 2, footerY + 195);
    ctx.restore();

    applyRealisticPaperTexture(ctx, width, height, "matte");
  }

  // =========================================================================
  // STYLE 3: ART EXHIBITION / KOREAN (Image 3: Lee Hyori Exhibition Reference)
  // =========================================================================
  else if (border === "korean") {
    const width = 1140;
    const paddingLeft = 145; // Space for vertical Korean text
    const paddingRight = 95;  // Space for frame index counters (01, 02...)
    const paddingTop = 210;  // Space for cursive calligraphy header
    const gap = 36;
    const photoW = width - paddingLeft - paddingRight;
    const photoH = Math.round(photoW * 0.72);
    const footerH = 170;
    const height = paddingTop + 4 * photoH + 3 * gap + footerH;

    canvas.width = width;
    canvas.height = height;

    // Warm natural linen fine art paper
    ctx.fillStyle = "#F7F4EC";
    ctx.fillRect(0, 0, width, height);

    // Top cursive script header: "The Memories. / The Never Known"
    ctx.save();
    ctx.fillStyle = "#1E1C1A";
    ctx.font = "italic 400 68px 'Baskerville', 'Georgia', 'Playfair Display', serif";
    ctx.textAlign = "left";
    ctx.fillText("Special Moments.", paddingLeft - 30, 95);
    ctx.font = "italic 300 48px 'Baskerville', 'Georgia', serif";
    ctx.fillText("The Times We Remember", paddingLeft + 15, 160);
    ctx.restore();

    // Photos + Side markings
    images.slice(0, 4).forEach((img, i) => {
      const y = paddingTop + i * (photoH + gap);

      // Photo
      ctx.save();
      applyInstagramFilter(ctx, filter);
      drawAspectFill(ctx, img, paddingLeft, y, photoW, photoH);
      ctx.filter = "none";
      applyFilterOverlay(ctx, filter, paddingLeft, y, photoW, photoH);
      ctx.restore();

      ctx.strokeStyle = "rgba(0, 0, 0, 0.2)";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(paddingLeft, y, photoW, photoH);

      // Right margin frame counter indicator (▸ 01, ▸ 02...)
      ctx.save();
      ctx.fillStyle = "#4A463F";
      ctx.font = "600 20px -apple-system, BlinkMacSystemFont, monospace";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(`▸ 0${i + 1}`, width - paddingRight + 18, y + photoH / 2);
      ctx.restore();
    });

    // Left margin vertical Korean typography
    ctx.save();
    ctx.translate(65, paddingTop + photoH * 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillStyle = "#4A463F";
    ctx.font = "500 24px -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("순간의 조각들 • 우리가 기억할 시간들", 0, 0);
    ctx.restore();

    // Bottom Photographer credit footer
    ctx.save();
    ctx.fillStyle = "#35322D";
    ctx.font = "600 26px -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(`Photographer • MEMORIES ARCHIVE • ${dateText}`, width / 2, height - footerH / 2);
    ctx.restore();

    applyRealisticPaperTexture(ctx, width, height, "linen");
  }

  // =========================================================================
  // STYLE 4: 2x2 BLOCK PARTY (Image 4: YSL Block Party London Reference)
  // =========================================================================
  else if (border === "party") {
    // 2x2 Grid Layout
    const width = 1300;
    const paddingX = 60;
    const headerH = 140;
    const footerH = 150;
    const gridGap = 28;

    const cellW = (width - paddingX * 2 - gridGap) / 2; // ~576
    const cellH = Math.round(cellW * 1.05); // ~604

    const height = headerH + cellH * 2 + gridGap + footerH;

    canvas.width = width;
    canvas.height = height;

    // Bright street-post cardstock paper
    ctx.fillStyle = "#FAFAF8";
    ctx.fillRect(0, 0, width, height);

    // Top Full-width Bold Condensed Block Header
    ctx.save();
    ctx.fillStyle = "#0A0A0A";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "900 68px 'Impact', 'Arial Black', sans-serif";
    ctx.fillText("BLOCK PARTY PHOTO BOOTH", width / 2, headerH / 2 + 10);
    ctx.restore();

    // 2x2 Grid of Photos
    const gridPositions = [
      { x: paddingX, y: headerH },
      { x: paddingX + cellW + gridGap, y: headerH },
      { x: paddingX, y: headerH + cellH + gridGap },
      { x: paddingX + cellW + gridGap, y: headerH + cellH + gridGap },
    ];

    images.slice(0, 4).forEach((img, i) => {
      const pos = gridPositions[i];
      if (!pos) return;

      ctx.save();
      applyInstagramFilter(ctx, filter);
      drawAspectFill(ctx, img, pos.x, pos.y, cellW, cellH);
      ctx.filter = "none";
      applyFilterOverlay(ctx, filter, pos.x, pos.y, cellW, cellH);
      ctx.restore();

      ctx.strokeStyle = "rgba(0, 0, 0, 0.4)";
      ctx.lineWidth = 2;
      ctx.strokeRect(pos.x, pos.y, cellW, cellH);
    });

    // Bottom Condensed Street Title: "LONDON EDITION — 03/09"
    ctx.save();
    ctx.fillStyle = "#0A0A0A";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "900 64px 'Impact', 'Arial Black', sans-serif";
    ctx.fillText(`SPECIAL EDITION — ${dateText}`, width / 2, height - footerH / 2);
    ctx.restore();

    applyRealisticPaperTexture(ctx, width, height, "matte");
  }

  const dataUrl = canvas.toDataURL("image/png");
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => {
      if (b) resolve(b);
      else reject(new Error("Canvas toBlob failed"));
    }, "image/png");
  });

  return { blob, dataUrl };
}
