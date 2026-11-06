export type BorderStyle = "film" | "stamp" | "polaroid" | "classic" | "noir" | "pastel";

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
  { id: "film", name: "Vintage Film", icon: "🎞️", desc: "35mm sprocket film roll" },
  { id: "stamp", name: "Postage Stamp", icon: "📮", desc: "Perforated edges & postmark" },
  { id: "polaroid", name: "Polaroid", icon: "📷", desc: "Classic instant film with chin" },
  { id: "classic", name: "Classic Booth", icon: "⚪", desc: "Clean studio white" },
  { id: "noir", name: "Matte Noir", icon: "⚫", desc: "Deep dark cinema" },
  { id: "pastel", name: "Y2K Pastel", icon: "🌸", desc: "Blush pink Korean booth" },
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
 * Apply authentic Instagram filter curves & tone overlays
 */
function applyInstagramFilter(
  ctx: CanvasRenderingContext2D,
  filter: InstagramFilter,
  x: number,
  y: number,
  w: number,
  h: number
) {
  switch (filter) {
    case "clarendon":
      // Cool blue shadows, warm highlights, boosted contrast
      ctx.filter = "contrast(120%) saturate(125%) brightness(104%)";
      break;
    case "gingham":
      // Vintage muted, soft lifted blacks
      ctx.filter = "contrast(92%) saturate(85%) brightness(105%) sepia(8%)";
      break;
    case "juno":
      // Rich warm tones, deep saturation, punchy
      ctx.filter = "contrast(115%) saturate(132%) brightness(102%)";
      break;
    case "lark":
      // Bright, airy, cooled highlights, desaturated warm tones
      ctx.filter = "contrast(106%) saturate(110%) brightness(108%) hue-rotate(-5deg)";
      break;
    case "valencia":
      // 1970s warm antique yellow fade
      ctx.filter = "sepia(26%) contrast(108%) brightness(105%) saturate(108%)";
      break;
    case "moon":
      // Moody contrasty monochrome
      ctx.filter = "grayscale(100%) contrast(124%) brightness(103%)";
      break;
    case "slumber":
      // Dreamy retro haze with rose/yellow tint
      ctx.filter = "sepia(20%) saturate(86%) brightness(104%) contrast(96%)";
      break;
    default:
      ctx.filter = "none";
      break;
  }
}

/**
 * Second-pass overlay for filters that need color grading blend modes
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
    grad.addColorStop(0, "rgba(255, 235, 200, 0.15)"); // warm top
    grad.addColorStop(1, "rgba(0, 60, 160, 0.22)"); // cool blue shadows
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
    ctx.fillStyle = "rgba(35, 45, 60, 0.12)"; // lift blacks
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
 * Draw authentic 35mm film sprockets and golden frame numbers
 */
function drawFilmAccents(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  count: number,
  photoH: number,
  gap: number,
  paddingTop: number
) {
  // Sprocket hole dimensions
  const sprocketW = 54;
  const sprocketH = 76;
  const sprocketRadius = 10;
  const sprocketStep = 108; // distance between holes

  const leftMargin = 38;
  const rightMargin = width - leftMargin - sprocketW;

  const totalHoles = Math.floor(height / sprocketStep);

  for (let i = 0; i < totalHoles; i++) {
    const holeY = i * sprocketStep + (height % sprocketStep) / 2;

    // Draw sprocket hole (translucent white cut-out appearance)
    [leftMargin, rightMargin].forEach((hx) => {
      ctx.save();
      ctx.fillStyle = "#FFFFFF";
      ctx.beginPath();
      ctx.roundRect(hx, holeY, sprocketW, sprocketH, sprocketRadius);
      ctx.fill();

      // Subtle 3D inner edge shadow
      ctx.strokeStyle = "rgba(0, 0, 0, 0.35)";
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.restore();
    });
  }

  // Draw 35mm exposure numbers and film rebate text in classic amber / gold
  ctx.save();
  ctx.fillStyle = "#E5A238";
  ctx.font = "bold 22px 'Courier New', Courier, monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  for (let shot = 0; shot < count; shot++) {
    const frameNumber = 21 + shot;
    const shotCenterY = paddingTop + shot * (photoH + gap) + photoH / 2;

    // Left side markings (vertical rotation)
    ctx.save();
    ctx.translate(leftMargin + sprocketW + 28, shotCenterY);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(`${frameNumber}A ▶`, 0, 0);
    ctx.font = "14px 'Courier New', Courier, monospace";
    ctx.fillText(`KODAK 400`, 0, 20);
    ctx.restore();

    // Right side markings (vertical rotation)
    ctx.save();
    ctx.translate(rightMargin - 28, shotCenterY);
    ctx.rotate(Math.PI / 2);
    ctx.fillText(`${frameNumber}`, 0, 0);
    ctx.font = "14px 'Courier New', Courier, monospace";
    ctx.fillText(`SAFETY FILM`, 0, 20);
    ctx.restore();
  }
  ctx.restore();
}

/**
 * Draw authentic postage stamp perforated scalloped edges and postmark cancellation
 */
function drawStampAccents(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  photosCount: number,
  photoX: number,
  photoW: number,
  photoH: number,
  gap: number,
  paddingTop: number,
  dateText: string
) {
  ctx.save();

  // Perforation hole radius & spacing
  const radius = 18;
  const step = 46;

  // Draw circular perforation punches along perimeter (cut-outs against dark desktop)
  ctx.fillStyle = "#121214"; // background desk color to look like real punched perforations

  // Left and Right edge scallops
  const verticalCount = Math.floor(height / step);
  for (let i = 0; i <= verticalCount; i++) {
    const y = i * step + (height % step) / 2;
    // Left edge
    ctx.beginPath();
    ctx.arc(0, y, radius, 0, Math.PI * 2);
    ctx.fill();

    // Right edge
    ctx.beginPath();
    ctx.arc(width, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  // Top and Bottom edge scallops
  const horizontalCount = Math.floor(width / step);
  for (let j = 0; j <= horizontalCount; j++) {
    const x = j * step + (width % step) / 2;
    // Top edge
    ctx.beginPath();
    ctx.arc(x, 0, radius, 0, Math.PI * 2);
    ctx.fill();

    // Bottom edge
    ctx.beginPath();
    ctx.arc(x, height, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  // Horizontal divider perforation holes between stamp frames
  for (let shot = 0; shot < photosCount - 1; shot++) {
    const dividerY = paddingTop + (shot + 1) * photoH + shot * gap + gap / 2;
    for (let j = 0; j <= horizontalCount; j++) {
      const x = j * step + (width % step) / 2;
      ctx.beginPath();
      ctx.arc(x, dividerY, 10, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Postmark Cancellation Ink Stamps (like media_1793984484503_d5f29b24.png!)
  ctx.strokeStyle = "rgba(65, 45, 35, 0.45)";
  ctx.lineWidth = 3;
  ctx.fillStyle = "rgba(65, 45, 35, 0.45)";

  for (let shot = 0; shot < photosCount; shot++) {
    const y = paddingTop + shot * (photoH + gap);

    // 1. Wavy postmark cancellation lines
    const waveStartX = photoX + photoW - 320;
    const waveStartY = y + 55;
    for (let line = 0; line < 3; line++) {
      ctx.beginPath();
      const lineY = waveStartY + line * 14;
      ctx.moveTo(waveStartX, lineY);
      for (let wx = 0; wx < 180; wx += 6) {
        ctx.lineTo(waveStartX + wx, lineY + Math.sin(wx * 0.12) * 5);
      }
      ctx.stroke();
    }

    // 2. Round rubber postmark ink stamp
    const stampCx = photoX + photoW - 90;
    const stampCy = y + 70;
    const stampRadius = 48;

    ctx.save();
    ctx.translate(stampCx, stampCy);
    ctx.rotate(-0.15); // subtle angle

    // Outer circle
    ctx.beginPath();
    ctx.arc(0, 0, stampRadius, 0, Math.PI * 2);
    ctx.stroke();

    // Inner circle
    ctx.beginPath();
    ctx.arc(0, 0, stampRadius - 8, 0, Math.PI * 2);
    ctx.stroke();

    // Text inside postmark
    ctx.font = "bold 13px 'Courier New', Courier, monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("AIR MAIL", 0, -18);
    ctx.font = "11px 'Courier New', Courier, monospace";
    ctx.fillText(dateText, 0, 4);
    ctx.fillText("★ BOOTH ★", 0, 20);

    ctx.restore();
  }

  ctx.restore();
}

/**
 * Main generator function for high-res photo strips
 */
export async function generatePhotoStrip(
  photoDataUrls: string[],
  options: PhotoStripOptions = {}
): Promise<{ blob: Blob; dataUrl: string }> {
  const {
    border = "classic",
    filter = "normal",
    dateText = new Date().toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).toUpperCase(),
  } = options;

  // Load photos into HTMLImageElements
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

  const count = images.length;

  // Layout parameters tailored for each border style
  let width = 1200;
  let paddingX = 64;
  let paddingTop = 64;
  let gap = 44;
  let footerH = 200;
  let bgColor = "#FFFFFF";
  let textColor = "#2A2A2A";
  let subtextColor = "#7A7A7A";
  let frameBorderColor = "rgba(0, 0, 0, 0.08)";

  if (border === "film") {
    // 35mm Film Strip layout
    width = 1240;
    paddingX = 145; // Sprocket track width
    paddingTop = 60;
    gap = 48;
    footerH = 140;
    bgColor = "#0A0A0B";
    textColor = "#E5A238";
    subtextColor = "#A47426";
    frameBorderColor = "#000000";
  } else if (border === "stamp") {
    // Postage Stamp layout
    width = 1200;
    paddingX = 85;
    paddingTop = 75;
    gap = 64;
    footerH = 180;
    bgColor = "#F6F2EB"; // Antique stamp paper
    textColor = "#3E3630";
    subtextColor = "#867B72";
    frameBorderColor = "rgba(60, 45, 30, 0.15)";
  } else if (border === "polaroid") {
    // Polaroid Instant Film layout
    width = 1200;
    paddingX = 70;
    paddingTop = 70;
    gap = 52;
    footerH = 280; // Iconic Polaroid bottom chin
    bgColor = "#FCFCFB";
    textColor = "#1D1D1F";
    subtextColor = "#6E6E73";
    frameBorderColor = "rgba(0, 0, 0, 0.06)";
  } else if (border === "noir") {
    // Matte Noir
    width = 1200;
    paddingX = 64;
    paddingTop = 64;
    gap = 44;
    footerH = 200;
    bgColor = "#141416";
    textColor = "#F5F5F7";
    subtextColor = "#86868B";
    frameBorderColor = "rgba(255, 255, 255, 0.1)";
  } else if (border === "pastel") {
    // Y2K Pastel Korean Photo Booth
    width = 1200;
    paddingX = 64;
    paddingTop = 64;
    gap = 44;
    footerH = 200;
    bgColor = "#FDE8EF"; // Soft blush
    textColor = "#831843";
    subtextColor = "#BE185D";
    frameBorderColor = "rgba(255, 255, 255, 0.8)";
  }

  const photoW = width - paddingX * 2;
  const photoH = Math.round(photoW * 0.75); // 4:3 classic aspect ratio
  const height = paddingTop + count * photoH + (count - 1) * gap + footerH;

  canvas.width = width;
  canvas.height = height;

  // 1. Draw base background
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, width, height);

  // 2. Draw each photo with Instagram filter applied
  images.forEach((img, index) => {
    const y = paddingTop + index * (photoH + gap);

    ctx.save();

    // Subtle photo frame rounding for modern borders
    const radius = border === "polaroid" || border === "classic" ? 6 : border === "film" ? 4 : 0;
    if (radius > 0) {
      ctx.beginPath();
      ctx.roundRect(paddingX, y, photoW, photoH, radius);
      ctx.clip();
    }

    // Apply Instagram primary filter
    applyInstagramFilter(ctx, filter, paddingX, y, photoW, photoH);

    // Center-crop image into destination rectangle
    const imgRatio = img.width / img.height;
    const targetRatio = photoW / photoH;

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

    ctx.drawImage(img, sx, sy, sWidth, sHeight, paddingX, y, photoW, photoH);

    // Reset filter for secondary overlays
    ctx.filter = "none";
    applyFilterOverlay(ctx, filter, paddingX, y, photoW, photoH);

    // Polaroid subtle vignette
    if (border === "polaroid") {
      ctx.save();
      ctx.globalCompositeOperation = "multiply";
      const radGrad = ctx.createRadialGradient(
        paddingX + photoW / 2,
        y + photoH / 2,
        photoW * 0.35,
        paddingX + photoW / 2,
        y + photoH / 2,
        photoW * 0.75
      );
      radGrad.addColorStop(0, "rgba(255, 255, 255, 0)");
      radGrad.addColorStop(1, "rgba(20, 15, 10, 0.18)");
      ctx.fillStyle = radGrad;
      ctx.fillRect(paddingX, y, photoW, photoH);
      ctx.restore();
    }

    ctx.restore();

    // Frame border stroke
    if (frameBorderColor) {
      ctx.strokeStyle = frameBorderColor;
      ctx.lineWidth = 2;
      ctx.strokeRect(paddingX, y, photoW, photoH);
    }
  });

  // 3. Render border-specific accents
  if (border === "film") {
    drawFilmAccents(ctx, width, height, count, photoH, gap, paddingTop);
  } else if (border === "stamp") {
    drawStampAccents(ctx, width, height, count, paddingX, photoW, photoH, gap, paddingTop, dateText);
  }

  // 4. Footer Branding & Typography
  const footerCenterY = height - footerH / 2;

  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  if (border === "film") {
    ctx.fillStyle = textColor;
    ctx.font = "bold 26px 'Courier New', Courier, monospace";
    ctx.fillText(`🎞️  3 5 M M   F I L M   S T R I P  🎞️`, width / 2, footerCenterY - 14);
    ctx.fillStyle = subtextColor;
    ctx.font = "18px 'Courier New', Courier, monospace";
    ctx.fillText(`ISO 400 • ${dateText} • FRAME 21-24`, width / 2, footerCenterY + 22);
  } else if (border === "polaroid") {
    // Authentic handwritten / typewriter Polaroid caption
    ctx.fillStyle = textColor;
    ctx.font = "italic 600 36px 'Georgia', serif";
    ctx.fillText(`Photo Booth Memories`, width / 2, footerCenterY - 26);
    ctx.fillStyle = subtextColor;
    ctx.font = "400 22px -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.fillText(`${dateText}`, width / 2, footerCenterY + 26);
  } else if (border === "stamp") {
    ctx.fillStyle = textColor;
    ctx.font = "bold 32px 'Courier New', Courier, monospace";
    ctx.fillText(`★  P O S T A G E   S T A M P S  ★`, width / 2, footerCenterY - 18);
    ctx.fillStyle = subtextColor;
    ctx.font = "18px 'Courier New', Courier, monospace";
    ctx.fillText(`FIRST CLASS MAIL • ${dateText}`, width / 2, footerCenterY + 24);
  } else if (border === "pastel") {
    ctx.fillStyle = textColor;
    ctx.font = "800 36px -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif";
    ctx.fillText(`♥  P H O T O   B O O T H  ♥`, width / 2, footerCenterY - 20);
    ctx.fillStyle = subtextColor;
    ctx.font = "600 22px -apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif";
    ctx.fillText(`${dateText} • SPECIAL MEMORIES`, width / 2, footerCenterY + 24);
  } else {
    // Classic / Noir
    ctx.fillStyle = textColor;
    ctx.font = "700 36px -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif";
    ctx.fillText(`✦   P H O T O   B O O T H   ✦`, width / 2, footerCenterY - 22);
    ctx.fillStyle = subtextColor;
    ctx.font = "500 22px -apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif";
    ctx.fillText(dateText, width / 2, footerCenterY + 24);
  }
  ctx.restore();

  const dataUrl = canvas.toDataURL("image/png");
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => {
      if (b) resolve(b);
      else reject(new Error("Canvas toBlob failed"));
    }, "image/png");
  });

  return { blob, dataUrl };
}
