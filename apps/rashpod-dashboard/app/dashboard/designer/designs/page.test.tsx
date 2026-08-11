import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import DesignerDesignsPage from "./page";

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  patch: vi.fn(),
  push: vi.fn(),
  toast: vi.fn(),
  user: { id: "designer-1", role: "DESIGNER" },
}));

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => <a href={href}>{children}</a>,
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock("../../../auth/auth-provider", () => ({
  useAuth: () => ({ user: mocks.user, isLoading: false }),
}));
vi.mock("../../dashboard-layout", () => ({
  default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));
vi.mock("../../../../lib/api", () => ({
  api: { get: mocks.get, patch: mocks.patch },
}));
vi.mock("../../../../components/feedback/toast-provider", () => ({
  useToast: () => ({ toast: mocks.toast }),
}));

const designs = [
  {
    id: "550e8400-e29b-41d4-a716-446655440001",
    designerId: "designer-1",
    title: "Alpha artwork",
    status: "DRAFT",
    commercialRights: {
      id: "rights-1",
      designAssetId: "550e8400-e29b-41d4-a716-446655440001",
      allowProductSales: false,
      allowMarketplacePublishing: false,
      allowFilmSales: false,
      allowCorporateBidding: false,
    },
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-01T00:00:00.000Z",
  },
  {
    id: "550e8400-e29b-41d4-a716-446655440002",
    designerId: "designer-1",
    title: "Beta artwork",
    status: "DRAFT",
    commercialRights: {
      id: "rights-2",
      designAssetId: "550e8400-e29b-41d4-a716-446655440002",
      allowProductSales: true,
      allowMarketplacePublishing: false,
      allowFilmSales: false,
      allowCorporateBidding: true,
    },
    createdAt: "2026-08-02T00:00:00.000Z",
    updatedAt: "2026-08-02T00:00:00.000Z",
  },
];

describe("DesignerDesignsPage bulk rights", () => {
  beforeEach(() => {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation(() => ({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    });
    mocks.get.mockResolvedValue(designs);
    mocks.patch.mockResolvedValue({ requestedCount: 2, updatedCount: 2, unchangedCount: 0, items: [] });
  });

  it("clears hidden selections and sends the selected IDs with explicit film consent", async () => {
    render(<DesignerDesignsPage />);

    fireEvent.click(await screen.findByLabelText("Select Alpha artwork"));
    expect(screen.getByRole("button", { name: "Manage rights (1)" })).toBeEnabled();

    fireEvent.change(screen.getByPlaceholderText("Search designs…"), { target: { value: "Beta" } });
    await waitFor(() => expect(screen.getByRole("button", { name: "Manage rights" })).toBeDisabled());

    fireEvent.change(screen.getByPlaceholderText("Search designs…"), { target: { value: "" } });
    await screen.findByLabelText("Select Alpha artwork");
    fireEvent.click(screen.getByLabelText("Select all filtered designs"));
    fireEvent.click(screen.getByRole("button", { name: "Manage rights (2)" }));
    fireEvent.change(screen.getByLabelText("DTF / UV-DTF film sales"), { target: { value: "ENABLE" } });
    fireEvent.click(screen.getByRole("button", { name: "Apply to 2 selected" }));

    await waitFor(() => expect(mocks.patch).toHaveBeenCalledWith("/designs/commercial-rights/bulk", {
      designIds: designs.map((design) => design.id),
      filmSalesAction: "ENABLE",
      reason: "Bulk film-sale consent granted from the designer designs table",
    }));
  });

  it("caps a filtered selection at 100 and lets the designer clear it from the same control", async () => {
    const manyDesigns = Array.from({ length: 101 }, (_, index) => ({
      ...designs[0],
      id: `550e8400-e29b-41d4-a716-${String(index + 1).padStart(12, "0")}`,
      title: `Artwork ${index + 1}`,
      commercialRights: {
        ...designs[0].commercialRights,
        designAssetId: `550e8400-e29b-41d4-a716-${String(index + 1).padStart(12, "0")}`,
      },
    }));
    mocks.get.mockResolvedValue(manyDesigns);

    render(<DesignerDesignsPage />);

    await screen.findByText("Artwork 1");
    fireEvent.click(screen.getByLabelText("Select all filtered designs"));
    expect(screen.getByRole("button", { name: "Manage rights (100)" })).toBeEnabled();
    expect(screen.getByLabelText("Clear filtered selection")).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("Clear filtered selection"));
    expect(screen.getByRole("button", { name: "Manage rights" })).toBeDisabled();
  });
});
