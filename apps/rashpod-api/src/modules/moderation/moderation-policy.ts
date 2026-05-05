import { DesignStatus, ModerationDecision } from "@prisma/client";

export function statusToDecision(status: DesignStatus): ModerationDecision | undefined {
  switch (status) {
    case DesignStatus.APPROVED:
      return ModerationDecision.APPROVE;
    case DesignStatus.REJECTED:
      return ModerationDecision.REJECT;
    case DesignStatus.NEEDS_FIX:
      return ModerationDecision.REQUEST_CHANGES;
    case DesignStatus.SUSPENDED:
      return ModerationDecision.SUSPEND;
    default:
      return undefined;
  }
}
