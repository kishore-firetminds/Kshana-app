const fs = require("node:fs");
const path = require("node:path");
// Read the web app's light theme at build/development time; no runtime dependency.
const source = path.resolve(process.argv[2] || "../kshana-fe/app/globals.css");
const css = fs.readFileSync(source, "utf8");
const root = css.match(/:root\s*\{([^}]+)\}/)?.[1];
if (!root) throw new Error("Web theme :root block not found");
const tokens = Object.fromEntries(
  [...root.matchAll(/--([\w-]+):\s*([^;]+);/g)].map(([, key, value]) => [
    key,
    value.trim(),
  ]),
);
// The native shell follows the approved v2 identity even while embedded web
// modules migrate their broader semantic palette.
Object.assign(tokens, {
  background: "#f7fbf9",
  foreground: "#132e29",
  "card-foreground": "#132e29",
  "popover-foreground": "#132e29",
  primary: "#00856a",
  "primary-hover": "#00745d",
  "primary-strong": "#132e29",
  "brand-ink": "#132e29",
  "brand-orange": "#00856a",
  "surface-subtle": "#f2f7f5",
  secondary: "#e7f4f0",
  "secondary-foreground": "#132e29",
  muted: "#edf3f1",
  "muted-foreground": "#4f5b57",
  accent: "#e5f5f1",
  "accent-foreground": "#00856a",
  success: "#00856a",
  "success-foreground": "#132e29",
  "success-surface": "#e5f5f1",
  border: "#dce7e3",
  "border-strong": "#c8d9d3",
  input: "#dce7e3",
  ring: "#00856a",
  "chart-1": "#132e29",
  "chart-2": "#00856a",
  "chart-3": "#4f5b57",
  "chart-4": "#69ad9c",
  "chart-5": "#cde8e1",
  sidebar: "#f8fcfa",
  "sidebar-foreground": "#132e29",
  "sidebar-primary": "#00856a",
  "sidebar-accent": "#e5f5f1",
  "sidebar-accent-foreground": "#132e29",
  "sidebar-border": "#dce7e3",
  "sidebar-ring": "#00856a",
});
for (const key of [
  "background",
  "foreground",
  "primary",
  "brand-orange",
  "border",
  "radius",
]) {
  if (!tokens[key]) throw new Error("Missing web theme token: " + key);
}
fs.writeFileSync(
  path.join(__dirname, "../src/webTheme.json"),
  JSON.stringify(tokens, null, 2) + "\n",
);
console.log("Synced " + Object.keys(tokens).length + " web theme tokens.");
