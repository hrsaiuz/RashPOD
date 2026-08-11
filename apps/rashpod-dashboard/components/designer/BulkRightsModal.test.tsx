import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { BulkRightsModal } from "./BulkRightsModal";

describe("BulkRightsModal", () => {
  it("leaves every permission unchanged until the designer chooses an action", () => {
    render(
      <BulkRightsModal
        open
        selectedCount={3}
        saving={false}
        onClose={vi.fn()}
        onApply={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "Apply to 3 selected" })).toBeDisabled();
  });

  it("emits only the ordinary rights explicitly selected", () => {
    const onApply = vi.fn();
    render(
      <BulkRightsModal
        open
        selectedCount={2}
        saving={false}
        onClose={vi.fn()}
        onApply={onApply}
      />,
    );

    fireEvent.change(screen.getByLabelText("Product sales"), { target: { value: "ALLOW" } });
    fireEvent.change(screen.getByLabelText("Corporate bidding"), { target: { value: "DENY" } });
    fireEvent.click(screen.getByRole("button", { name: "Apply to 2 selected" }));

    expect(onApply).toHaveBeenCalledWith({
      allowProductSales: true,
      allowCorporateBidding: false,
    });
  });

  it("requires an explicit film action and shows the consent warning", () => {
    const onApply = vi.fn();
    render(
      <BulkRightsModal
        open
        selectedCount={4}
        saving={false}
        onClose={vi.fn()}
        onApply={onApply}
      />,
    );

    fireEvent.change(screen.getByLabelText("DTF / UV-DTF film sales"), { target: { value: "ENABLE" } });

    expect(screen.getByText(/gives your explicit consent for every selected design/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Apply to 4 selected" }));
    expect(onApply).toHaveBeenCalledWith({ filmSalesAction: "ENABLE" });
  });
});
