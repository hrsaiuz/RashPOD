import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { StoryExperience } from "./StoryExperience";

const { api } = vi.hoisted(() => ({ api: { get: vi.fn(), put: vi.fn() } }));
vi.mock("../../../../lib/api", () => ({ api, ApiError: class ApiError extends Error {} }));
vi.mock("next/link", () => ({ default: ({ href, children, ...props }: any) => <a href={href} {...props}>{children}</a> }));
vi.mock("next-intl", () => ({ useTranslations: () => (key: string, values?: Record<string, string>) => values ? `${key}:${Object.values(values).join(",")}` : key }));
vi.mock("../../../../components/ProductCard", () => ({ ProductCard: ({ title }: { title: string }) => <article>{title}</article> }));

const story = {
  id: "story-1", slug: "culture", title: "Culture", body: "A long cultural story. ".repeat(60), locale: "en", sourceLocale: "en", fallbackUsed: false,
  publicUrl: "https://rashpod.uz/en/story/culture", qrCodeImageUrl: null, coverImageUrl: null, audioUrl: "https://cdn.example/story.mp3", videoUrl: "https://cdn.example/story.mp4",
  designer: { displayName: "Designer" }, design: { title: "Culture", description: "A cultural portrait" }, listings: [],
};

describe("StoryExperience", () => {
  beforeEach(() => {
    api.get.mockReset(); api.put.mockReset();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ json: async () => ({ user: { id: "user-1" } }) }));
    api.get.mockResolvedValue({ storyId: "story-1", liked: false, bookmarked: false });
    api.put.mockImplementation(async (_path: string, body: any) => ({ storyId: "story-1", ...body }));
  });

  it("renders available media and controlled cover fallback", async () => {
    render(<StoryExperience story={story} locale="en" />);
    expect(screen.getByText("coverMissing")).toBeTruthy();
    expect(screen.getByText("audioTitle")).toBeTruthy();
    expect(screen.getByText("videoTitle")).toBeTruthy();
    expect(screen.getByRole("button", { name: "showMore" }).getAttribute("aria-expanded")).toBe("false");
    await waitFor(() => expect(api.get).toHaveBeenCalled());
  });

  it("persists an optimistic like with the complete engagement state", async () => {
    render(<StoryExperience story={story} locale="en" />);
    await waitFor(() => expect(api.get).toHaveBeenCalled());
    fireEvent.click(screen.getByRole("button", { name: "like" }));
    await waitFor(() => expect(api.put).toHaveBeenCalledWith("/customer/stories/story-1/engagement", { liked: true, bookmarked: false }));
    expect(screen.getByRole("button", { name: "unlike" }).getAttribute("aria-pressed")).toBe("true");
  });
});
