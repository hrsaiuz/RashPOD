import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import NewDesignPage from "./page";

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  upload: vi.fn(),
  toast: vi.fn(),
  user: { id: "designer-1", role: "DESIGNER" },
}));

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => <a href={href}>{children}</a>,
}));
vi.mock("../../../../auth/auth-provider", () => ({
  useAuth: () => ({ user: mocks.user, isLoading: false }),
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
  resolveUploadMimeType: () => "image/svg+xml",
  uploadToSignedUrlWithProgress: mocks.upload,
}));

const uploadOptions = [
  {
    id: "product-type-1",
    name: "T-shirts",
    slug: "t-shirts",
    category: "APPAREL",
    baseProducts: [
      {
        id: "base-product-1",
        name: "Classic tee",
        imageUrl: "https://cdn.example/classic-tee.png",
        placements: [
          {
            code: "FRONT",
            name: "Front",
            mockupTemplateId: "template-1",
            mockupViewId: "view-front",
            printAreaId: "area-front",
          },
          {
            code: "BACK",
            name: "Back",
            mockupTemplateId: "template-1",
            mockupViewId: "view-back",
            printAreaId: "area-back",
          },
        ],
      },
    ],
  },
];

describe("NewDesignPage product and placement upload", () => {
  beforeEach(() => {
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: vi.fn(() => "blob:design-preview"),
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      value: vi.fn(),
    });
    mocks.get.mockImplementation((path: string) => {
      if (path === "/designer/designs/upload-options") return Promise.resolve(uploadOptions);
      if (path === "/designer/designs/design-1") {
        return Promise.resolve({
          id: "design-1",
          previewImageUrl: "https://signed.example/design.png",
          versions: [{ id: "version-front", placement: "FRONT" }, { id: "version-back", placement: "BACK" }],
        });
      }
      return Promise.reject(new Error(`Unexpected GET ${path}`));
    });
    let fileCounter = 0;
    mocks.post.mockImplementation((path: string) => {
      if (path === "/designs") return Promise.resolve({ id: "design-1" });
      if (path === "/files/upload-url") {
        fileCounter += 1;
        return Promise.resolve({
          fileId: `file-${fileCounter}`,
          url: `https://upload.example/file-${fileCounter}`,
          headers: { "content-type": "image/svg+xml" },
        });
      }
      if (path === "/files/complete-upload" || path.endsWith("/versions")) return Promise.resolve({});
      return Promise.reject(new Error(`Unexpected POST ${path}`));
    });
    mocks.upload.mockImplementation(async (_url: string, _file: File, _mimeType: string, _headers: unknown, onProgress: (percent: number) => void) => {
      onProgress(100);
    });
  });

  it("chooses the product first and uploads a separate version for each selected placement", async () => {
    const { container } = render(<NewDesignPage />);

    expect(await screen.findByRole("heading", { name: "What product is this design for?" })).toBeInTheDocument();
    expect(mocks.post).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText(/Product type/), { target: { value: "product-type-1" } });
    fireEvent.click(screen.getByRole("button", { name: /Classic tee/ }));
    fireEvent.click(screen.getByRole("button", { name: "Continue to placements" }));

    fireEvent.click(screen.getByRole("checkbox", { name: /Front/ }));
    let fileInputs = container.querySelectorAll<HTMLInputElement>('input[type="file"]');
    fireEvent.change(fileInputs[0], {
      target: { files: [new File(["front-art"], "front.svg", { type: "application/octet-stream" })] },
    });

    fireEvent.click(screen.getByRole("checkbox", { name: /Back/ }));
    fileInputs = container.querySelectorAll<HTMLInputElement>('input[type="file"]');
    fireEvent.change(fileInputs[1], {
      target: { files: [new File(["back-art"], "back.svg", { type: "application/octet-stream" })] },
    });

    fireEvent.click(screen.getByRole("button", { name: "Review design" }));
    fireEvent.change(screen.getByLabelText(/Title/), { target: { value: "Two-sided skyline" } });
    fireEvent.click(screen.getByRole("button", { name: "Upload 2 placements" }));

    expect(await screen.findByRole("heading", { name: "Submit your design" })).toBeInTheDocument();
    expect(mocks.post).toHaveBeenCalledWith("/designs", {
      title: "Two-sided skyline",
      description: undefined,
      requestedBaseProductId: "base-product-1",
    });

    const uploadRequests = mocks.post.mock.calls.filter(([path]) => path === "/files/upload-url");
    expect(uploadRequests).toHaveLength(2);
    expect(uploadRequests.map(([, payload]) => payload)).toEqual([
      expect.objectContaining({ filename: "front.svg", designId: "design-1", purpose: "DESIGN_ORIGINAL" }),
      expect.objectContaining({ filename: "back.svg", designId: "design-1", purpose: "DESIGN_ORIGINAL" }),
    ]);

    const versionRequests = mocks.post.mock.calls.filter(([path]) => path === "/designs/design-1/versions");
    expect(versionRequests).toHaveLength(2);
    expect(versionRequests.map(([, payload]) => payload)).toEqual([
      { fileId: "file-1", dpi: 300, placement: "FRONT" },
      { fileId: "file-2", dpi: 300, placement: "BACK" },
    ]);
    await waitFor(() => expect(mocks.get).toHaveBeenCalledWith("/designer/designs/design-1"));
  });
});
