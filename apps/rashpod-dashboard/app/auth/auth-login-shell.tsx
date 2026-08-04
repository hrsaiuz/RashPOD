"use client";

import type { ReactNode } from "react";
import { AuthDecorations, useAuthBranding } from "./auth-decorations";
import { DashboardLanguageSwitcher } from "../../components/i18n/dashboard-language-switcher";

export function AuthLoginShell({ children }: { children: ReactNode }) {
  const { decorThemeUrls } = useAuthBranding();

  return (
    <div className="min-h-screen bg-white px-4 py-8 sm:px-6 sm:py-10 md:py-12">
      <div className="relative mx-auto w-full max-w-[1040px] min-h-[560px] overflow-hidden rounded-[28px] border border-surface-borderSoft bg-white shadow-soft md:min-h-[640px]">
        <AuthDecorations themeUrls={decorThemeUrls} />
        <div className="absolute right-4 top-4 z-20 sm:right-6 sm:top-6">
          <DashboardLanguageSwitcher compactOnMobile={false} />
        </div>
        <div className="relative z-10 px-6 pb-10 pt-24 sm:px-10 sm:pb-12 sm:pt-24 md:px-14 md:pb-14 lg:pr-[420px] lg:pt-14">
          {children}
        </div>
      </div>
    </div>
  );
}

export function AuthFormColumn({ children }: { children: ReactNode }) {
  return <div className="mx-auto w-full max-w-md">{children}</div>;
}

export function AuthPageFallback() {
  return (
    <div className="min-h-screen bg-white px-4 py-12">
      <div className="mx-auto max-w-[1040px] rounded-[28px] border border-surface-borderSoft bg-white px-6 py-14 text-center text-brand-muted shadow-soft">
        Loading...
      </div>
    </div>
  );
}
