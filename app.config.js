const fs = require("node:fs");
const path = require("node:path");

module.exports = ({ config }) => {
  const projectId = process.env.EXPO_PUBLIC_EAS_PROJECT_ID;
  const localGoogleServices = path.join(__dirname, "google-services.json");
  const googleServicesFile = process.env.GOOGLE_SERVICES_JSON ||
    (fs.existsSync(localGoogleServices) ? localGoogleServices : undefined);
  return {
    ...config,
    ...(process.env.EXPO_OWNER ? { owner: process.env.EXPO_OWNER } : {}),
    android: {
      ...config.android,
      ...(googleServicesFile
        ? { googleServicesFile }
        : {}),
    },
    extra: { ...config.extra, ...(projectId ? { eas: { projectId } } : {}) },
  };
};
