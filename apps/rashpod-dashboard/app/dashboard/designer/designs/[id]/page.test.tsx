import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import DesignDetailPage from "./page";

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  push: vi.fn(),
  toast: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "design-1" }),
  useRouter: () => ({ push: mocks.push }),
}));
vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => <a href={href}>{children}</a>,
}));
vi.mock("../../../../auth/auth-provider", () => ({
  useAuth: () => ({ user: { id: "designer-1", role: "DESIGNER" }, isLoading: false }),
}));
vi.mock("../../../dashboard-layout", () => ({
  default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));
vi.mock("../../../../../components/design/DesignPreviewCard", () => ({
  DesignPreviewCard: ({ title }: { title: string }) => <div>{title}</div>,
}));
vi.mock("../../../../../components/design-story/DesignerDesignStoryPanel", () => ({
  DesignerDesignStoryPanel: () => <div>Story editor</div>,
}));
vi.mock("../../../../../components/feedback/toast-provider", () => ({
  useToast: () => ({ toast: mocks.toast }),
}));
vi.mock("../../../../../lib/api", () => ({
  api: { get: mocks.get, post: mocks.post },
  resolveUploadMimeType: () => "image/png",
  uploadToSignedUrl: vi.fn(),
}));

describe("DesignDetailPage draft recovery", () => {
  beforeEach(() => {
    mocks.get.mockImplementation((path: string) => {
      if (path === "/designer/designs/design-1") {
        return Promise.resolve({
          id: "design-1",
          title: "Unfinished tee",
          description: "",
          status: "DRAFT",
          updatedAt: "2026-08-11T10:00:00.000Z",
          requestedBaseProductId: "base-product-1",
          requestedBaseProduct: { id: "base-product-1", name: "Classic tee" },
          versions: [],
          productSelections: [],
          listings: [],
        });
      }
      if (path === "/designs/design-1/commercial-rights") return Promise.resolve(null);
      if (path === "/designer/designs/upload-options") {
        return Promise.resolve([{
          id: "product-type-1",
          name: "T-shirts",
          baseProducts: [{
            id: "base-product-1",
            name: "Classic tee",
            placements: [{ code: "FRONT", name: "Front", mockupTemplateId: "template-1", printAreaId: "area-1" }],
          }],
        }]);
      }
      return Promise.reject(new Error(`Unexpected GET ${path}`));
    });
  });

  it("allows the first artwork upload while keeping submission blocked", async () => {
    render(<DesignDetailPage />);

    expect(await screen.findByRole("button", { name: "Upload Front artwork" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Upload artwork before submitting" })).toBeDisabled();
  });
});
