import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import ToolboxPage from "./ToolboxPage";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "toolbox" });

  return {
    title: t("title"),
    description: t("subtitle"),
  };
}

export default async function ToolboxRoute({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <ToolboxPage />;
}
