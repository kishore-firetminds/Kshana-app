const fs = require("node:fs");
const path = require("node:path");

module.exports = ({ config }) => {
  const projectId = process.env.EXPO_PUBLIC_EAS_PROJECT_ID;
  const nativeCalling =
    process.env.EXPO_PUBLIC_NATIVE_CALLING_ENABLED === "true";
  const microphonePermission =
    "Allow KshanaAPI to use your microphone during WhatsApp calls. Calls are not recorded.";
  const localGoogleServices = path.join(__dirname, "google-services.json");
  const googleServicesFile =
    process.env.GOOGLE_SERVICES_JSON ||
    (fs.existsSync(localGoogleServices) ? localGoogleServices : undefined);
  return {
    ...config,
    ...(process.env.EXPO_OWNER ? { owner: process.env.EXPO_OWNER } : {}),
    ...(nativeCalling
      ? {
          plugins: [
            ...(config.plugins || []).map((plugin) =>
              Array.isArray(plugin) && plugin[0] === "expo-image-picker"
                ? [plugin[0], { ...plugin[1], microphonePermission }]
                : plugin,
            ),
            [
              "@config-plugins/react-native-webrtc",
              {
                microphonePermission,
              },
            ],
          ],
        }
      : {}),
    android: {
      ...config.android,
      ...(nativeCalling
        ? {
            blockedPermissions: [
              ...(config.android.blockedPermissions || []).filter(
                (p) => p !== "android.permission.RECORD_AUDIO",
              ),
              "android.permission.SYSTEM_ALERT_WINDOW",
              "android.permission.BLUETOOTH",
            ],
          }
        : {}),
      ...(googleServicesFile ? { googleServicesFile } : {}),
    },
    extra: { ...config.extra, ...(projectId ? { eas: { projectId } } : {}) },
  };
};
