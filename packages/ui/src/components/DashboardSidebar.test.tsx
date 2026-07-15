import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Home, Images } from "lucide-react";
import { DashboardSidebar } from "./DashboardSidebar";

vi.mock("next/link", () => ({ default: ({ href, children, ...props }: any) => <a href={href} {...props}>{children}</a> }));

describe("DashboardSidebar", () => {
  const links = [{ href: "/dashboard/moderator", label: "Overview", icon: Home }, { href: "/dashboard/moderator/designs", label: "Design review", icon: Images }];

  it("keeps icon-rail links accessible and identifies the active route", () => {
    render(<DashboardSidebar role="Moderator" links={links} activePath="/dashboard/moderator/designs" compact />);
    expect(screen.getByRole("link", { name: "Design review" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("complementary", { name: "Moderator navigation" })).toHaveClass("w-[72px]");
  });

  it("renders labeled navigation when expanded", () => {
    render(<DashboardSidebar role="Designer" links={links} activePath="/dashboard/moderator" compact={false} />);
    expect(screen.getByText("Overview")).toBeVisible();
    expect(screen.getByText("Designer")).toBeVisible();
  });
});
