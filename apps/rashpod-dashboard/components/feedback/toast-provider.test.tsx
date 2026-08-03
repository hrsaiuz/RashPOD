import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ToastProvider, useToast } from "./toast-provider";
import { DASHBOARD_TRANSFER_EVENT, type DashboardTransferEvent } from "../../lib/background-transfer";

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
    vi.unstubAllGlobals();
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

  it("shows background transfer progress in the bottom-right viewport", () => {
    render(<ToastProvider><div>Dashboard</div></ToastProvider>);

    act(() => {
      window.dispatchEvent(new CustomEvent<DashboardTransferEvent>(DASHBOARD_TRANSFER_EVENT, {
        detail: { id: "upload-1", kind: "upload", label: "front-artwork.png", status: "running", progress: 42 },
      }));
    });

    expect(screen.getByTestId("transfer-viewport")).toHaveClass("bottom-4", "right-4", "sm:bottom-6", "sm:right-6");
    expect(screen.getByText("Uploading in background")).toBeInTheDocument();
    expect(screen.getByText("front-artwork.png")).toBeInTheDocument();
    expect(screen.getByText("42%")).toBeInTheDocument();

    act(() => {
      window.dispatchEvent(new CustomEvent<DashboardTransferEvent>(DASHBOARD_TRANSFER_EVENT, {
        detail: { id: "upload-1", kind: "upload", label: "front-artwork.png", status: "success", progress: 100 },
      }));
    });
    expect(screen.getByText("Transfer complete")).toBeInTheDocument();
  });

  it("reports unhandled dashboard mutation results at the top right", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    window.history.replaceState({}, "", "/dashboard/admin/settings");

    render(
      <ToastProvider>
        <button type="button" onClick={() => void fetch("/api/proxy/admin/settings", { method: "PATCH" })}>
          Save settings
        </button>
      </ToastProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Save settings" }));
    await act(async () => { await Promise.resolve(); });
    act(() => vi.advanceTimersByTime(300));

    expect(screen.getByTestId("toast-viewport")).toHaveTextContent("Save settings");
    expect(screen.getByText("Action completed successfully.")).toBeInTheDocument();
  });

  it("reports an API error from a dashboard action", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(
      JSON.stringify({ message: "The settings conflict with an active rule." }),
      { status: 409, headers: { "Content-Type": "application/json" } },
    )));
    window.history.replaceState({}, "", "/dashboard/admin/settings");

    render(
      <ToastProvider>
        <button type="button" onClick={() => void fetch("/api/proxy/admin/settings", { method: "PATCH" })}>
          Save settings
        </button>
      </ToastProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Save settings" }));
    await act(async () => { await Promise.resolve(); });
    act(() => vi.advanceTimersByTime(300));

    expect(screen.getByRole("alert")).toHaveTextContent("Action failed");
    expect(screen.getByText("The settings conflict with an active rule.")).toBeInTheDocument();
  });
});
