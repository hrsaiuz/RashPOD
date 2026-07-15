export type ModerationDecision = "APPROVE_LOCAL" | "APPROVE_GLOBAL" | "REJECT";

export function buildModerationDecisionPayload(input: {
  decision: ModerationDecision;
  localSelections: unknown[];
  globalPrintfulSelections: unknown[];
  rejectionReasons: string[];
  customRejectionReason?: string;
  moderatorNotes?: string;
}) {
  if (input.decision === "REJECT") {
    return {
      decision: input.decision,
      rejectionReasons: input.rejectionReasons,
      customRejectionReason: input.customRejectionReason || undefined,
      moderatorNotes: input.moderatorNotes || undefined,
    };
  }
  return {
    decision: input.decision,
    localSelections: input.localSelections,
    globalPrintfulSelections: input.decision === "APPROVE_GLOBAL" ? input.globalPrintfulSelections : undefined,
    moderatorNotes: input.moderatorNotes || undefined,
  };
}
