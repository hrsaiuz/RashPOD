import { WorkshopItemPage } from "../../../workshop-mobile";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <WorkshopItemPage id={id} />;
}
