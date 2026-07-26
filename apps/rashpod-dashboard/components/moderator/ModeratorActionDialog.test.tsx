import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { ModeratorActionDialog } from "./ModeratorActionDialog";

describe("ModeratorActionDialog", () => {
  it("focuses the confirmation action and closes with Escape", async () => {
    const onCancel = vi.fn();
    render(
      <ModeratorActionDialog
        open
        title="Publish listing?"
        description="The listing will become public."
        confirmLabel="Publish listing"
        busy={false}
        onCancel={onCancel}
        onConfirm={vi.fn()}
      />,
    );

    const confirm = screen.getByRole("button", { name: "Publish listing" });
    await waitFor(() => expect(confirm).toHaveFocus());
    fireEvent.keyDown(screen.getByRole("alertdialog"), { key: "Escape" });
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("can focus a required moderation field before confirmation", async () => {
    render(
      <ModeratorActionDialog
        open
        title="Reject listing?"
        description="A reason is required."
        confirmLabel="Reject listing"
        destructive
        busy={false}
        initialFocus="firstField"
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
      >
        <textarea aria-label="Rejection reason" />
      </ModeratorActionDialog>,
    );

    await waitFor(() => expect(screen.getByRole("textbox", { name: "Rejection reason" })).toHaveFocus());
  });
});
