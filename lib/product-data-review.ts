export const productDataReportStatuses = ["new", "reviewing", "resolved", "dismissed"] as const;
export type ProductDataReportStatus = typeof productDataReportStatuses[number];
export type ProductDataReviewAction = "list" | "start" | "resolve" | "dismiss";

export type ProductDataReviewCommand =
  | { action: "list"; limit: number; status: ProductDataReportStatus }
  | { action: Exclude<ProductDataReviewAction, "list">; id: string; note: string };

const statusSet = new Set<string>(productDataReportStatuses);
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function cleanNote(value: string) {
  return value.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "").trim().slice(0, 500);
}

export function parseProductDataReviewArgs(args: string[]): ProductDataReviewCommand | null {
  const tokens = [...args];
  const first = tokens[0];
  const action = (!first || first.startsWith("--") ? "list" : tokens.shift()) as ProductDataReviewAction;
  if (!["list", "start", "resolve", "dismiss"].includes(action)) return null;

  if (action === "list") {
    let status = "new";
    let limitText = "25";
    while (tokens.length) {
      const flag = tokens.shift();
      const value = tokens.shift();
      if (!value || (flag !== "--status" && flag !== "--limit")) return null;
      if (flag === "--status") status = value;
      if (flag === "--limit") limitText = value;
    }
    const limit = Number(limitText);
    if (!statusSet.has(status) || !Number.isInteger(limit) || limit < 1 || limit > 100) return null;
    return { action, limit, status: status as ProductDataReportStatus };
  }

  const id = tokens.shift() ?? "";
  let note = "";
  if (tokens.length) {
    if (tokens.length !== 2 || tokens[0] !== "--note") return null;
    note = cleanNote(tokens[1]);
  }
  if (!uuidPattern.test(id)) return null;
  return { action, id, note };
}

export function reviewStatusForAction(action: Exclude<ProductDataReviewAction, "list">): ProductDataReportStatus {
  return action === "start" ? "reviewing" : action === "resolve" ? "resolved" : "dismissed";
}
