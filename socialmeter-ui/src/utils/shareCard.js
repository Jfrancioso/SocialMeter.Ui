import { PLATFORM_NAMES } from "./platforms";
// Draws the share card (1200 × 630, the shape of a link preview) from a title and its reading, entirely in the browser.
// Nothing is sent anywhere: the PNG comes off a canvas and goes to the clipboard or a download.

export const CARD_W = 1200;
export const CARD_H = 630;

const BAND_HEX = { cold: "#5b8cff", lukewarm: "#6fd0c5", warm: "#ffb000", hot: "#ff6a3d", electric: "#ff3d8f", none: "#596073" };
const PLATFORM = PLATFORM_NAMES;

/** The caption copied beside the image. */
export function shareCaption({ title, meter, ratings, url }) {
  const where = platformsText(meter);
  const beside = ratingsText(ratings);
  return `${title.name} reads ${meter.score} ${meter.label} (±${meter.stats?.margin ?? "?"}) on Chatterbub, from ${meter.totalPosts} posts${where ? ` on ${where}` : ""}.${beside ? ` ${beside}.` : ""}\n${url}`;
}

/**
 * Renders the card and resolves with a PNG Blob. The poster is drawn when its host allows cross-origin reads; otherwise
 * a colour block carries the title so the card never fails on art.
 */
export async function renderShareCard({ title, meter, ratings, posterUrl, url, bandKey }) {
  const canvas = document.createElement("canvas");
  canvas.width = CARD_W;
  canvas.height = CARD_H;
  const ctx = canvas.getContext("2d");
  const band = BAND_HEX[bandKey] ?? BAND_HEX.none;

  try { await document.fonts.load('900 56px "Inter"'); } catch { /* fallback face is fine */ }
  const font = (weight, size) => `${weight} ${size}px "Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`;

  // Background with a soft glow in the band colour, top right.
  ctx.fillStyle = "#0a0b10";
  ctx.fillRect(0, 0, CARD_W, CARD_H);
  const glow = ctx.createRadialGradient(CARD_W, 0, 20, CARD_W, 0, 620);
  glow.addColorStop(0, hexToRgba(band, 0.22));
  glow.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(420, 0, CARD_W - 420, CARD_H);

  // Poster column.
  const poster = posterUrl ? await loadImage(posterUrl) : null;
  if (poster) {
    drawCover(ctx, poster, 0, 0, 420, CARD_H);
    const shade = ctx.createLinearGradient(300, 0, 420, 0);
    shade.addColorStop(0, "rgba(10,11,16,0)");
    shade.addColorStop(1, "rgba(10,11,16,0.85)");
    ctx.fillStyle = shade;
    ctx.fillRect(300, 0, 120, CARD_H);
  } else {
    const block = ctx.createLinearGradient(0, 0, 420, CARD_H);
    block.addColorStop(0, "#1a1e2c");
    block.addColorStop(1, hexToRgba(band, 0.45));
    ctx.fillStyle = block;
    ctx.fillRect(0, 0, 420, CARD_H);
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    ctx.font = font(900, 54);
    wrapText(ctx, title.name.toUpperCase(), 40, 300, 340, 60, 4, "left");
  }

  // Brand.
  const x = 480;
  drawBolt(ctx, x, 54, 30);
  ctx.font = font(900, 28);
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#f3f5f9";
  ctx.fillText("Chatter", x + 40, 78);
  const w = ctx.measureText("Chatter").width;
  const brandGrad = ctx.createLinearGradient(x + 40 + w, 0, x + 40 + w + 60, 0);
  brandGrad.addColorStop(0, "#ffb000");
  brandGrad.addColorStop(1, "#ff3d8f");
  ctx.fillStyle = brandGrad;
  ctx.fillText("bub", x + 40 + w, 78);

  // Title and meta.
  ctx.fillStyle = "#f3f5f9";
  const titleSize = title.name.length > 26 ? 44 : 56;
  ctx.font = font(900, titleSize);
  const titleLines = wrapText(ctx, title.name, x, 150, 660, titleSize * 1.05, 2, "left");
  ctx.fillStyle = "#7f8799";
  ctx.font = font(600, 22);
  ctx.fillText(metaText(title), x, 150 + titleLines * titleSize * 1.05 + 6);

  // Gauge with the big number.
  const gx = x, gy = 300, gw = 280;
  drawArc(ctx, gx + gw / 2, gy + 150, 115, meter.score / 100, band);
  ctx.fillStyle = band;
  ctx.font = font(900, 110);
  ctx.textAlign = "center";
  ctx.fillText(String(meter.score), gx + gw / 2, gy + 150);
  ctx.textAlign = "left";

  // Facts beside the gauge.
  const fx = x + gw + 40;
  chip(ctx, fx, 312, `${meter.label} · ±${meter.stats?.margin ?? "?"}`, band, font(800, 22));
  fact(ctx, fx, 390, "READ FROM", `${meter.totalPosts} posts${platformsText(meter) ? ` on ${platformsText(meter)}` : ""}`, font);
  const beside = ratingsText(ratings);
  if (beside) fact(ctx, fx, 462, "BESIDE", beside, font);

  // Footer: tagline, then the address on its own line so neither can run into the other.
  ctx.fillStyle = "#7f8799";
  ctx.font = font(600, 19);
  ctx.fillText("Audience sentiment, scored from real posts", x, 566);
  ctx.fillStyle = "#b9c0cf";
  ctx.font = font(700, 20);
  ctx.fillText(url.replace(/^https?:\/\//, ""), x, 596);

  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Could not render the card."))), "image/png"));
}

// ---- helpers ----

function metaText(t) {
  const kind = t.mediaType === "tv" ? "TV show" : t.mediaType === "game" ? "Game" : "Movie";
  const year = t.releaseDate ? String(t.releaseDate).slice(0, 4) : "";
  const genres = (t.genres ?? []).slice(0, 3).join(", ");
  return [kind, year, genres].filter(Boolean).join(" · ");
}

function platformsText(meter) {
  const names = (meter.platforms ?? []).map((p) => PLATFORM[p.platform] ?? p.platform);
  return names.length <= 1 ? names.join("") : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

function ratingsText(ratings) {
  const list = ratings?.ratings ?? [];
  const pick = (src, label) => {
    const r = list.find((x) => x.source === src && x.available !== false && x.value);
    return r ? `${label} ${String(r.value).replace(/\/10$|\/100$/, "")}` : null;
  };
  return [pick("imdb", "IMDb"), pick("metacritic", "Metacritic"), pick("rottenTomatoes", "RT"), pick("steam", "Steam")].filter(Boolean).slice(0, 2).join(" · ") || null;
}

function fact(ctx, x, y, label, value, font) {
  ctx.fillStyle = "#7f8799";
  ctx.font = font(800, 14);
  ctx.fillText(label.split("").join(String.fromCharCode(8202)), x, y);
  ctx.fillStyle = "#f3f5f9";
  ctx.font = font(900, 26);
  ctx.fillText(value, x, y + 34);
}

function chip(ctx, x, y, text, color, f) {
  ctx.font = f;
  const label = text.toUpperCase();
  const w = ctx.measureText(label).width + 36;
  ctx.fillStyle = hexToRgba(color, 0.16);
  roundRect(ctx, x, y - 24, w, 40, 20);
  ctx.fill();
  ctx.fillStyle = color;
  ctx.fillText(label, x + 18, y + 4);
}

function drawArc(ctx, cx, cy, r, fraction, color) {
  ctx.lineCap = "round";
  ctx.lineWidth = 18;
  ctx.strokeStyle = "rgba(255,255,255,0.1)";
  ctx.beginPath();
  ctx.arc(cx, cy, r, Math.PI, 2 * Math.PI);
  ctx.stroke();
  const end = Math.PI + Math.PI * Math.max(0, Math.min(1, fraction));
  const grad = ctx.createLinearGradient(cx - r, 0, cx + r, 0);
  grad.addColorStop(0, "#5b8cff");
  grad.addColorStop(0.35, "#6fd0c5");
  grad.addColorStop(0.55, "#ffb000");
  grad.addColorStop(0.78, "#ff6a3d");
  grad.addColorStop(1, "#ff3d8f");
  ctx.strokeStyle = grad;
  ctx.beginPath();
  ctx.arc(cx, cy, r, Math.PI, end);
  ctx.stroke();
  // Marker at the end of the fill.
  const mx = cx + r * Math.cos(end), my = cy + r * Math.sin(end);
  ctx.fillStyle = "#0a0b10";
  ctx.beginPath(); ctx.arc(mx, my, 12, 0, 2 * Math.PI); ctx.fill();
  ctx.strokeStyle = color; ctx.lineWidth = 3; ctx.stroke();
  ctx.fillStyle = "#ffffff";
  ctx.beginPath(); ctx.arc(mx, my, 6, 0, 2 * Math.PI); ctx.fill();
}

function drawBolt(ctx, x, y, size) {
  const g = ctx.createLinearGradient(x, y - size, x + size, y);
  g.addColorStop(0, "#ffb000");
  g.addColorStop(1, "#ff3d8f");
  ctx.fillStyle = g;
  const p = [[0.56, 0.05], [0.25, 0.56], [0.47, 0.56], [0.41, 0.95], [0.78, 0.4], [0.56, 0.4]];
  ctx.beginPath();
  p.forEach(([px, py], i) => (i ? ctx.lineTo : ctx.moveTo).call(ctx, x + px * size, y - size + py * size));
  ctx.closePath();
  ctx.fill();
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight, maxLines, align) {
  const words = text.split(" ");
  const lines = [];
  let line = "";
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) { lines.push(line); line = word; }
    else line = test;
  }
  if (line) lines.push(line);
  const shown = lines.slice(0, maxLines);
  if (lines.length > maxLines) shown[maxLines - 1] = shown[maxLines - 1].replace(/\s?\S*$/, "…");
  ctx.textAlign = align;
  shown.forEach((l, i) => ctx.fillText(l, x, y + i * lineHeight));
  ctx.textAlign = "left";
  return shown.length;
}

function drawCover(ctx, img, x, y, w, h) {
  const scale = Math.max(w / img.width, h / img.height);
  const dw = img.width * scale, dh = img.height * scale;
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function hexToRgba(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

function loadImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous"; // without this the canvas is tainted and toBlob throws
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}
