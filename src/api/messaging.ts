import type { Message, UploadedFile } from "./types";
export type Attachment = {
  uri: string;
  name: string;
  mimeType: string;
  size?: number;
  uploaded?: UploadedFile;
};
export function messagePayload(
  text: string,
  note: boolean,
  file?: UploadedFile,
  replyToMessageId?: string,
) {
  if (!text.trim() && !file)
    throw new Error("Enter a message or choose an attachment.");
  const messageType = file
    ? file.mimeType.startsWith("image/")
      ? "IMAGE"
      : file.mimeType.startsWith("video/")
        ? "VIDEO"
        : file.mimeType.startsWith("audio/")
          ? "AUDIO"
          : "DOCUMENT"
    : "TEXT";
  return {
    senderType: "user",
    direction: note ? "INTERNAL_NOTE" : "OUTGOING",
    content: text.trim(),
    messageType,
    ...(!note && replyToMessageId ? { replyToMessageId } : {}),
    ...(file
      ? {
          mediaUrl: file.fileUrl,
          attachments: [
            {
              name: file.fileName,
              fileName: file.fileName,
              size: file.size,
              type: file.mimeType,
              mimeType: file.mimeType,
              url: file.fileUrl,
            },
          ],
        }
      : {}),
  };
}
export function mergeMessages(older: Message[], latest: Message[]) {
  const messages = new Map(older.map((item) => [item.id, item]));
  latest.forEach((item) => messages.set(item.id, item));
  return [...messages.values()].sort(
    (a, b) =>
      a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id),
  );
}
/** Render successful reactions on their target; retain failures and orphan events. */
export function messageTimeline(messages: Message[]) {
  const ids = new Set(messages.map((message) => message.id));
  const externalIds = new Map(
    messages
      .filter((message) => message.externalMessageId)
      .map((message) => [message.externalMessageId!, message.id]),
  );
  const reactions = new Map<string, string[]>();
  const reactionTargets = new Map<string, string>();
  const visible = messages.filter((message) => {
    if (!message.reaction?.emoji || message.status?.toLowerCase() === "failed")
      return true;
    const target =
      message.replyTo?.id || externalIds.get(message.reaction.messageId || "");
    if (!target || !ids.has(target)) return true;
    reactions.set(target, [
      ...(reactions.get(target) || []),
      message.reaction.emoji,
    ]);
    reactionTargets.set(message.id, target);
    return false;
  });
  return { visible, reactions, reactionTargets };
}
export function mediaLinks(message: Message) {
  const links = [
    ...(message.mediaUrl
      ? [{ url: message.mediaUrl, name: humanMediaName(message.messageType) }]
      : []),
    ...(message.attachments || []).map((file) => ({
      url: file.url || file.mediaUrl || "",
      name: file.name || file.fileName || "Attachment",
    })),
  ];
  // Keep signed query strings untouched; reject device/intent/javascript URLs.
  return links.filter(
    (link, i) =>
      /^https?:\/\//i.test(link.url) &&
      links.findIndex((other) => other.url === link.url) === i,
  );
}
function humanMediaName(type: string) {
  return type === "IMAGE"
    ? "Photo"
    : type === "VIDEO"
      ? "Video"
      : type === "AUDIO"
        ? "Audio"
        : "Attachment";
}
