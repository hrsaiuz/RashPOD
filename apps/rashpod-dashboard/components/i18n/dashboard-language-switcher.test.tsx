import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DashboardLanguageSwitcher } from "./dashboard-language-switcher";

const setLocale = vi.fn();

vi.mock("./dashboard-i18n-provider", () => ({
  useDashboardI18n: () => ({
    locale: "uz",
    setLocale,
    t: (value: string) => value,
    isLocaleLoading: false,
  }),
}));

describe("DashboardLanguageSwitcher", () => {
  beforeEach(() => setLocale.mockReset());

  it("renders a wide locale field with the current country flag", () => {
    render(<DashboardLanguageSwitcher compactOnMobile={false} />);

    const trigger = screen.getByRole("button", { name: "Language" });
    expect(trigger).toHaveClass("min-w-[176px]");
    expect(screen.getByTestId("locale-flag-uz")).toBeInTheDocument();
    expect(trigger).toHaveTextContent("O‘zbekcha");
  });

  it("shows flagged language options and applies the selected locale", async () => {
    setLocale.mockResolvedValue(undefined);
    render(<DashboardLanguageSwitcher />);

    fireEvent.click(screen.getByRole("button", { name: "Language" }));
    expect(screen.getByTestId("locale-flag-ru")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("menuitemradio", { name: /Русский Russian/ }));
    await waitFor(() => expect(setLocale).toHaveBeenCalledWith("ru"));
  });
});
