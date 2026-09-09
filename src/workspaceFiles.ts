import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { parseWorkspaceExport } from "./api/workspaceExport";
export async function shareWorkspaceExport(data: string) {
  const file = parseWorkspaceExport(data);
  if (!file) return;
  if (!FileSystem.cacheDirectory || !(await Sharing.isAvailableAsync()))
    throw new Error("File sharing is unavailable on this device.");
  const directory = FileSystem.cacheDirectory + "kshana-exports/";
  await FileSystem.makeDirectoryAsync(directory, { intermediates: true });
  // Keep files long enough for the receiving app to read them; expire old exports.
  for (const name of await FileSystem.readDirectoryAsync(directory)) {
    const path = directory + name;
    const info = await FileSystem.getInfoAsync(path);
    if (
      info.exists &&
      !info.isDirectory &&
      info.modificationTime < Date.now() / 1000 - 86400
    )
      await FileSystem.deleteAsync(path, { idempotent: true });
  }
  const path = directory + Date.now() + "-" + file.name;
  await FileSystem.writeAsStringAsync(path, file.base64, {
    encoding: FileSystem.EncodingType.Base64,
  });
  await Sharing.shareAsync(path, {
    mimeType: file.mime,
    dialogTitle: "Save or share " + file.name,
  });
}
