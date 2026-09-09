// Deterministic exports of the supplied KshanaAPI vector masters; no logo redraw.
const fs = require("node:fs");
const path = require("node:path");
const { Resvg } = require("@resvg/resvg-js");
const root = path.resolve(__dirname, "../assets/brand");
const read = (name) =>
  fs.readFileSync(path.join(root, "masters", name + ".svg"), "utf8");
function render(svg, name, width) {
  const png = new Resvg(svg, {
    fitTo: { mode: "width", value: width },
  }).render();
  const pixels = png.pixels;
  for (let i = 0; i < pixels.length; i += 4) {
    if (name === "app-icon" && pixels[i + 3] !== 255)
      throw new Error("App icon must have an opaque background");
    if (
      (name === "notification-icon" || name === "adaptive-monochrome") &&
      pixels[i + 3] > 0 &&
      // Resvg exposes premultiplied RGBA: white RGB channels equal alpha.
      (pixels[i] !== pixels[i + 3] || pixels[i + 1] !== pixels[i + 3] || pixels[i + 2] !== pixels[i + 3])
    )
      throw new Error(
        "System monochrome icons must contain only white artwork",
      );
  }
  fs.writeFileSync(path.join(root, name + ".png"), png.asPng());
}
for (const [master, name, width] of [
  ["primary", "logo-primary", 280],
  ["no-tagline", "logo-no-tagline", 180],
  ["white", "logo-white", 280],
  ["monochrome", "logo-monochrome", 280],
  ["icon", "icon-only", 64],
]) {
  for (const density of [1, 2, 3])
    render(
      read(master),
      name + (density === 1 ? "" : `@${density}x`),
      width * density,
    );
}
// Opaque, square source: iOS and launchers apply their own corner masks.
render(
  read("app-icon").replace(
    /(<svg\b[^>]*>)/,
    '$1<rect width="512" height="512" fill="#fff"/>',
  ),
  "app-icon",
  1024,
);
const icon = read("icon");
const viewBox = icon.match(/viewBox="([^"]+)"/)[1];
const body = icon
  .replace(/^[\s\S]*?<svg\b[^>]*>/, "")
  .replace(/<\/svg>\s*$/, "");
const monochrome = body
  .replace(/fill="(?!none)[^"]*"/g, 'fill="#fff"')
  .replace(/fill:\s*(?!none)[^;]+;/g, "fill: #fff;");
function square(content, inset) {
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 108 108"><svg x="${inset}" y="${inset}" width="${108 - inset * 2}" height="${108 - inset * 2}" viewBox="${viewBox}">${content}</svg></svg>`;
}
// Keep the bubble tail as well as the ring within Android's 66dp safe circle.
render(square(body, 30), "adaptive-foreground", 1024);
render(square(monochrome, 30), "adaptive-monochrome", 1024);
render(square(monochrome, 9), "notification-icon", 96);
// Transparent brand mark for the splash, avoiding a white rounded tile.
render(square(body, 8), "splash-icon", 512);
console.log(
  "Exported brand logos at 1x/2x/3x and platform icons from vector masters.",
);
