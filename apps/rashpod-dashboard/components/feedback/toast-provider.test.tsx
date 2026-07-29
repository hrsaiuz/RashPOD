import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ToastProvider, useToast } from "./toast-provider";

function ToastTrigger() {
  const { toast } = useToast();
  return (
    <button
      type="button"
      onClick={() => toast({ tone: "success", title: "Design saved", description: "Ready for moderation." })}
    >
      Save
    </button>
  );
}

describe("ToastProvider", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("announces and dismisses a top-level success notification", () => {
    vi.spyOn(globalThis.crypto, "randomUUID").mockReturnValue("00000000-0000-4000-8000-000000000001");
    render(
      <ToastProvider>
        <ToastTrigger />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(screen.getByTestId("toast-viewport")).toHaveClass("right-4", "top-20", "sm:right-6", "z-toast");
    expect(screen.getByRole("status")).toHaveTextContent("Design saved");
    expect(screen.getByText("Ready for moderation.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Dismiss notification" }));
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("automatically dismisses notifications after the requested duration", () => {
    vi.useFakeTimers();
    vi.spyOn(globalThis.crypto, "randomUUID").mockReturnValue("00000000-0000-4000-8000-000000000002");
    render(
      <ToastProvider>
        <ToastTrigger />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(screen.getByRole("status")).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(4500));
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
