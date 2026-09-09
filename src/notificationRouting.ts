/** Accept only the application's relative inbox links, never external URLs. */
export function notificationConversationId(
  link?: string | null,
): string | null {
  if (!link?.startsWith("/app/inbox?")) return null;
  try {
    const id = new URL(link, "https://workspace.invalid").searchParams.get(
      "conversation",
    );
    return id && /^[A-Za-z0-9-]+$/.test(id) ? id : null;
  } catch {
    return null;
  }
}

export function notificationMessageId(
  link?: string | null,
): string | undefined {
  if (!notificationConversationId(link)) return undefined;
  const id = new URL(link!, "https://workspace.invalid").searchParams.get(
    "message",
  );
  return id && /^[A-Za-z0-9-]+$/.test(id) ? id : undefined;
}
