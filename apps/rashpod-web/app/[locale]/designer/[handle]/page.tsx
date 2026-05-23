import type { Metadata } from "next";
import { fetchDesignerByHandle } from "../../../../lib/catalog";
import DesignerPageClient from "./DesignerPageClient";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ handle: string }>;
}): Promise<Metadata> {
  const { handle } = await params;
  const profile = await fetchDesignerByHandle(handle);

  return {
    title: profile ? `${profile.designer.displayName} | Designer` : "Designer",
    description: profile?.designer.bio ?? `Shop designs by ${profile?.designer.displayName ?? handle} on RashPOD.`,
  };
}

export default async function DesignerProfilePage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const profile = await fetchDesignerByHandle(handle);

  return (
    <DesignerPageClient
      handle={handle}
      initialDesigner={
        profile
          ? {
              id: profile.designer.id,
              handle: profile.designer.handle,
              displayName: profile.designer.displayName,
              avatarUrl: profile.designer.avatarUrl,
              coverUrl: profile.designer.profileImageUrl,
              bio: profile.designer.bio,
              joinedAt: "",
              stats: { listingsCount: profile.designer.listingsCount },
            }
          : null
      }
      initialListings={
        profile?.listings.map((listing) => ({
          id: listing.id,
          slug: listing.slug,
          title: listing.title,
          price: listing.price,
          imageUrl: listing.imageUrl,
          designer: {
            displayName: listing.designer,
            handle: listing.designerHandle ?? profile.designer.handle,
          },
        })) ?? []
      }
    />
  );
}
