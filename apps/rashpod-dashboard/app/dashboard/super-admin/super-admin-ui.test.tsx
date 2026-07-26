import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ConfirmDialog, FeedbackBanner } from "./super-admin-ui";

describe("super admin safety UI", () => {
  it("requires exact typed confirmation and manages focus", async () => {
    const onConfirm = vi.fn();
    render(
      <ConfirmDialog
        open
        title="Apply RBAC changes?"
        description="Changes apply immediately."
        confirmLabel="Apply changes"
        confirmationText="APPLY"
        onCancel={vi.fn()}
        onConfirm={onConfirm}
      />,
    );

    const input = screen.getByLabelText(/type apply to confirm/i);
    await waitFor(() => expect(input).toHaveFocus());
    expect(screen.getByRole("button", { name: "Apply changes" })).toBeDisabled();
    fireEvent.change(input, { target: { value: "APPLY" } });
    fireEvent.click(screen.getByRole("button", { name: "Apply changes" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("announces mutation errors", () => {
    render(<FeedbackBanner feedback={{ kind: "error", message: "Could not save" }} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Could not save");
  });
});
