import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PrintfulPublishWizard } from "./PrintfulPublishWizard";
import { ToastProvider } from "../feedback/toast-provider";

function renderWizard() {
  return render(
    <ToastProvider>
      <PrintfulPublishWizard listingId="listing-1" defaultPrice="29.99" />
    </ToastProvider>,
  );
}
import { api } from "../../lib/api";

vi.mock("../../lib/api", () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

describe("PrintfulPublishWizard", () => {
  beforeEach(() => {
    vi.mocked(api.get).mockImplementation(async (path: string) => {
      if (path === "/admin/printful/stores") {
        return [
          { id: "11", name: "RashPOD API", type: "native", directPublishingSupported: true, publishingMode: "PRINTFUL_PRODUCTS_API" },
          { id: "22", name: "RashPOD EU", type: "native", directPublishingSupported: true, publishingMode: "PRINTFUL_PRODUCTS_API" },
        ] as never;
      }
      if (path === "/admin/printful/categories") {
        return [{ id: 24, title: "T-Shirts" }] as never;
      }
      if (path.startsWith("/admin/printful/catalog-products?")) {
        return {
          items: [{ id: 71, title: "Premium tee", type: "T-SHIRT", typeName: "T-Shirt", variantCount: 2 }],
        } as never;
      }
      if (path === "/admin/printful/catalog-products/71") {
        return {
          id: 71,
          title: "Premium tee",
          type: "T-SHIRT",
          typeName: "T-Shirt",
          variantCount: 2,
          techniques: ["dtg"],
          placements: ["front"],
          variants: [
            { id: 401, name: "Black / M", color: "Black", size: "M", inStock: true },
            { id: 402, name: "Black / L", color: "Black", size: "L", inStock: true },
          ],
        } as never;
      }
      throw new Error(`Unexpected request: ${path}`);
    });
    vi.mocked(api.post).mockResolvedValue({ publications: [{ id: "publication-1" }] } as never);
  });

  it("guides a moderator from category selection through multi-store publication", async () => {
    renderWizard();

    fireEvent.change(await screen.findByLabelText("Category"), { target: { value: "24" } });
    fireEvent.click(await screen.findByRole("button", { name: /premium tee/i }));

    expect(await screen.findByText(/2 of 2 available variants selected/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));

    const store = await screen.findByText("RashPOD API");
    fireEvent.click(store.closest("label")!.querySelector("input")!);
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));

    expect(await screen.findByText("4. Review the publication")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /publish to 1 store/i }));
    fireEvent.click(await screen.findByRole("button", { name: "Queue Printful publications" }));

    await waitFor(() => expect(api.post).toHaveBeenCalledWith(
      "/admin/printful/listings/listing-1/publish",
      expect.objectContaining({
        catalogProductId: 71,
        variantIds: [401, 402],
        storeIds: ["11"],
        placement: "front",
        technique: "dtg",
        retailPrice: "29.99",
      }),
    ));
    expect(await screen.findByText("1 Printful publication queued.")).toBeInTheDocument();
  });

  it("keeps external-platform stores visible but unavailable for unsupported direct publishing", async () => {
    vi.mocked(api.get).mockImplementation(async (path: string) => {
      if (path === "/admin/printful/stores") {
        return [
          { id: "11", name: "RashPOD API", type: "native", directPublishingSupported: true, publishingMode: "PRINTFUL_PRODUCTS_API" },
          { id: "22", name: "RashPOD Shopify", type: "shopify", directPublishingSupported: false, publishingMode: "EXTERNAL_PLATFORM_CONNECTOR_REQUIRED" },
        ] as never;
      }
      if (path === "/admin/printful/categories") return [{ id: 24, title: "T-Shirts" }] as never;
      if (path.startsWith("/admin/printful/catalog-products?")) {
        return { items: [{ id: 71, title: "Premium tee", typeName: "T-Shirt", variantCount: 1 }] } as never;
      }
      if (path === "/admin/printful/catalog-products/71") {
        return {
          id: 71,
          title: "Premium tee",
          variantCount: 1,
          techniques: ["dtg"],
          placements: ["front"],
          variants: [{ id: 401, name: "Black / M", color: "Black", size: "M", inStock: true }],
        } as never;
      }
      throw new Error(`Unexpected request: ${path}`);
    });

    renderWizard();
    fireEvent.change(await screen.findByLabelText("Category"), { target: { value: "24" } });
    fireEvent.click(await screen.findByRole("button", { name: /premium tee/i }));
    expect(await screen.findByText(/1 of 1 available variants selected/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));

    const externalStore = await screen.findByText("RashPOD Shopify");
    const checkbox = externalStore.closest("label")!.querySelector("input")!;
    expect(checkbox).toBeDisabled();
    expect(screen.getByText(/requires this platform's connector/i)).toBeInTheDocument();
  });

  it("confirms and queues a safe retry for a failed store publication", async () => {
    vi.mocked(api.get).mockImplementation(async (path: string) => {
      if (path === "/admin/printful/stores") return [] as never;
      if (path === "/admin/printful/categories") return [] as never;
      if (path === "/admin/printful/listings/listing-1/publications") {
        return [{
          id: "publication-failed",
          storeId: "11",
          storeName: "RashPOD API",
          status: "FAILED",
          errorMessage: "Temporary Printful failure",
        }] as never;
      }
      throw new Error(`Unexpected request: ${path}`);
    });
    vi.mocked(api.post).mockResolvedValue({ publication: { id: "publication-failed", status: "QUEUED" } } as never);

    renderWizard();
    fireEvent.click(await screen.findByRole("button", { name: /retry safely/i }));
    fireEvent.click(await screen.findByRole("button", { name: "Queue safe retry" }));

    await waitFor(() => expect(api.post).toHaveBeenCalledWith(
      "/admin/printful/publications/publication-failed/retry",
      {},
    ));
    expect(await screen.findByText("RashPOD API was queued for retry.")).toBeInTheDocument();
  });
});
