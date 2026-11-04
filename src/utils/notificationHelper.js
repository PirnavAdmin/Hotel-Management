/**
 * Sanitizes notification texts by stripping mojibake sequences,
 * broken utf-8 sequences, question mark artifacts, and raw emojis
 * to ensure all headings, descriptions, timestamps, and button labels
 * display clean, legible, human-readable text.
 */
export function cleanNotificationText(value) {
  if (!value || typeof value !== "string") return "";
  return value
    // Remove common mojibake sequences produced by UTF-8 decoded as Windows-1252 / ISO-8859-1
    .replace(/(?:ðŸ[^\s]*|âœ[^\s]*|â °|âœ•|â†’|ï¸[^\s]*|Â[^\s]*|Ã[^\s]*)+/gu, " ")
    // Remove Unicode Replacement Characters
    .replace(/[\uFFFD\uFFFE\uFFFF]/g, "")
    // Remove emojis (which can be garbled across encoding boundaries)
    .replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}]/gu, "")
    // Remove stray leading question marks or junk symbols
    .replace(/^[?\s]+/, "")
    // Normalize spaces
    .replace(/\s+/g, " ")
    .trim();
}

export function getCleanAlertTitle(alert) {
  if (!alert) return "Kitchen Update";
  const cleaned = cleanNotificationText(alert.title);
  if (cleaned) return cleaned;
  if (alert.type === "cooking_completed") return "Food Ready to Serve";
  if (alert.type === "cooking_started") return "Cooking in Progress";
  if (alert.type === "order_received") return "Order Received";
  return "Kitchen Update";
}

export function getCleanAlertMessage(alert) {
  if (!alert) return "";
  const cleaned = cleanNotificationText(alert.message);
  if (cleaned) return cleaned;
  const tbl = cleanNotificationText(alert.tableName) || (alert.tableId ? `Table ${alert.tableId}` : "Table");
  if (alert.type === "cooking_completed") {
    return `All dishes for ${tbl} are cooked and ready to serve!`;
  }
  if (alert.type === "cooking_started") {
    return `Kitchen has started cooking for ${tbl}.`;
  }
  return `Kitchen status updated for ${tbl}.`;
}

export function getCleanAlertTimestamp(alert) {
  if (!alert) return "";
  const cleaned = cleanNotificationText(alert.timestamp);
  return cleaned || new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true });
}

export function sanitizeKitchenAlert(alert) {
  if (!alert || typeof alert !== "object") return alert;
  return {
    ...alert,
    title: getCleanAlertTitle(alert),
    message: getCleanAlertMessage(alert),
    timestamp: getCleanAlertTimestamp(alert),
    tableName: cleanNotificationText(alert.tableName) || (alert.tableId ? `Table ${alert.tableId}` : ""),
  };
}

