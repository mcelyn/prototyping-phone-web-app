export interface PhotoStripOptions {
  theme?: "white" | "black" | "cream";
  filter?: "normal" | "bw" | "warm" | "cool";
  dateText?: string;
  mirrored?: boolean;
}

export async function generatePhotoStrip(
  photoDataUrls: string[],
  options: PhotoStripOptions = {}
): Promise<{ blob: Blob; dataUrl: string }> {
  const {
    theme = "white",
    filter = "normal",
    dateText = new Date().toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).toUpperCase(),
  } = options;

  // Load all images first
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

  // High-res photo strip layout
  const width = 1200;
  const paddingX = 64;
  const paddingTop = 64;
  const gap = 44;
  const photoW = width - paddingX * 2; // 1072
  const photoH = Math.round(photoW * 0.75); // 4:3 ratio -> 804
  const footerH = 200;

  const count = images.length;
  const height = paddingTop + count * photoH + (count - 1) * gap + footerH;

  canvas.width = width;
  canvas.height = height;

  // Background color / theme
  let bgColor = "#FFFFFF";
  let textColor = "#2A2A2A";
  let subtextColor = "#7A7A7A";
  let frameBorderColor = "rgba(0, 0, 0, 0.06)";

  if (theme === "black") {
    bgColor = "#141416";
    textColor = "#F5F5F7";
    subtextColor = "#86868B";
    frameBorderColor = "rgba(255, 255, 255, 0.1)";
  } else if (theme === "cream") {
    bgColor = "#FBF8F1";
    textColor = "#3C3836";
    subtextColor = "#8A8379";
    frameBorderColor = "rgba(0, 0, 0, 0.05)";
  }

  // Draw background
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, width, height);

  // Draw each photo
  images.forEach((img, index) => {
    const y = paddingTop + index * (photoH + gap);

    // Save context state for filters & transforms
    ctx.save();

    // Clipping path for subtle rounded corners inside strip
    const radius = 8;
    ctx.beginPath();
    ctx.moveTo(paddingX + radius, y);
    ctx.lineTo(paddingX + photoW - radius, y);
    ctx.quadraticCurveTo(paddingX + photoW, y, paddingX + photoW, y + radius);
    ctx.lineTo(paddingX + photoW, y + photoH - radius);
    ctx.quadraticCurveTo(paddingX + photoW, y + photoH, paddingX + photoW - radius, y + photoH);
    ctx.lineTo(paddingX + radius, y + photoH);
    ctx.quadraticCurveTo(paddingX, y + photoH, paddingX, y + photoH - radius);
    ctx.lineTo(paddingX, y + radius);
    ctx.quadraticCurveTo(paddingX, y, paddingX + radius, y);
    ctx.closePath();
    ctx.clip();

    // Filter styling
    if (filter === "bw") {
      ctx.filter = "grayscale(100%) contrast(110%) brightness(102%)";
    } else if (filter === "warm") {
      ctx.filter = "sepia(28%) saturate(120%) contrast(105%) brightness(102%)";
    } else if (filter === "cool") {
      ctx.filter = "hue-rotate(190deg) saturate(95%) contrast(108%)";
    }

    // Aspect-fit / center-crop image into destination rectangle
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
    ctx.restore();

    // Subtle hairline inner border around photo
    ctx.strokeStyle = frameBorderColor;
    ctx.lineWidth = 2;
    ctx.strokeRect(paddingX, y, photoW, photoH);
  });

  // Footer Branding & Timestamp
  const footerCenterY = height - footerH / 2;

  // Title: "PHOTO BOOTH"
  ctx.fillStyle = textColor;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "700 38px -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', sans-serif";
  
  // Custom letter spacing for typography
  const title = "P H O T O   B O O T H";
  ctx.fillText(title, width / 2, footerCenterY - 24);

  // Date / Subtitle
  ctx.fillStyle = subtextColor;
  ctx.font = "500 24px -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', sans-serif";
  ctx.fillText(dateText, width / 2, footerCenterY + 28);

  // Tiny retro stars / dots
  ctx.fillStyle = subtextColor;
  ctx.font = "18px sans-serif";
  ctx.fillText("✦", width / 2 - 280, footerCenterY - 24);
  ctx.fillText("✦", width / 2 + 280, footerCenterY - 24);

  const dataUrl = canvas.toDataURL("image/png");
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => {
      if (b) resolve(b);
      else reject(new Error("Canvas toBlob failed"));
    }, "image/png");
  });

  return { blob, dataUrl };
}
