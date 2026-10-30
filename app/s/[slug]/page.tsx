import type { Metadata } from "next";
import { notFound } from "next/navigation";
import WhiteLabelGallery from "@/app/components/WhiteLabelGallery";
import ExpiredPreview from "@/app/components/ExpiredPreview";
import {
  getStudioBySlug,
  isDemoPreview,
  isStudioExpired,
  studioRecordToConfig,
  studios,
} from "@/lib/studios";

export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return studios.map((studio) => ({ slug: studio.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const studio = getStudioBySlug(slug);
  if (!studio) {
    return { title: "Studio preview" };
  }
  return {
    title: `${studio.name} gallery preview`,
    description: `Style explorer branded for ${studio.name}. Sample and combine tattoo styles, then book a consultation.`,
    robots: { index: false, follow: false },
  };
}

export default async function StudioPreviewPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const studio = getStudioBySlug(slug);
  if (!studio) {
    notFound();
  }

  if (isStudioExpired(studio)) {
    return <ExpiredPreview studio={studio} />;
  }

  const config = studioRecordToConfig(studio);

  return (
    <WhiteLabelGallery
      studio={config}
      homeHref={`/s/${studio.slug}`}
      showGeneratorLink={false}
      showDemoBanner={isDemoPreview(studio)}
      explorerCopy
    />
  );
}
