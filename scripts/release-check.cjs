const fs = require("node:fs");
const app = require("../app.json").expo;
const config = require("../app.config.js")({ config: app });
const eas = require("../eas.json");
const issues = [];
function check(ok, message) {
  if (!ok) issues.push(message);
}
check(
  config.ios.bundleIdentifier === "com.firetminds.kshanaapi",
  "Unexpected iOS bundle identifier",
);
check(
  /^\d+$/.test(config.ios.buildNumber || ""),
  "iOS build number must be numeric",
);
check(
  config.ios.infoPlist?.ITSAppUsesNonExemptEncryption === false,
  "Declare iOS export-compliance encryption usage",
);
check(config.ios.supportsTablet === true, "iPad support changed unexpectedly");
check(
  config.android.package === "com.firetminds.kshanaapi",
  "Unexpected Android package identifier",
);
check(
  /^[0-9a-f-]{36}$/i.test(config.extra?.eas?.projectId || ""),
  "Link an EAS project with eas init",
);
check(
  eas.build.production.env.EXPO_PUBLIC_SITE_URL === "https://kshanaapi.com",
  "Production website URL is incorrect",
);
check(
  eas.build.production.env.EXPO_PUBLIC_API_URL ===
    "https://kshanaapi.com/api/backend",
  "Production API URL is incorrect",
);
check(
  eas.build.production.android.buildType === "app-bundle",
  "Play production build must be an AAB",
);
check(
  Boolean(eas.build.production.ios),
  "Missing iOS production build profile",
);
check(Boolean(eas.submit.production.ios), "Missing iOS submission profile");
check(
  config.plugins.some(
    (plugin) => Array.isArray(plugin) && plugin[0] === "expo-notifications",
  ),
  "Missing notification config plugin",
);
const icon = fs.readFileSync(
  require("node:path").resolve(__dirname, "..", config.icon),
);
check(
  icon.readUInt32BE(16) === 1024 && icon.readUInt32BE(20) === 1024,
  "App icon must be 1024 x 1024",
);
if (process.argv.includes("--credentials")) {
  const file = config.android.googleServicesFile;
  check(
    file && fs.existsSync(file),
    "Set GOOGLE_SERVICES_JSON to the Firebase config file (EAS file variable for cloud builds)",
  );
  if (file && fs.existsSync(file)) {
    const google = JSON.parse(fs.readFileSync(file, "utf8"));
    check(
      google.client?.some(
        (client) =>
          client.client_info?.android_client_info?.package_name ===
          config.android.package,
      ),
      "Firebase configuration does not match the Android package",
    );
  }
}
if (issues.length) {
  console.error(issues.map((issue) => `FAIL: ${issue}`).join("\n"));
  process.exitCode = 1;
} else
  console.log(
    "Local release configuration checks passed. Signing, live push delivery, store disclosures, and review-account checks remain separate gates.",
  );
