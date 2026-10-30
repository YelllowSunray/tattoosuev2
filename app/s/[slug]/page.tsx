import type { Metadata } from "next";
import { notFound } from "next/navigation";
import StudioPreviewLayout from "@/app/components/StudioPreviewLayout";
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
    return {
      title: { absolute: "Studio preview | Style explorer" },
    };
  }

  const title = `${studio.name} | Style explorer`;
  const description = `Style explorer branded for ${studio.name}. Sample and combine tattoo styles, then book a consultation.`;

  return {
    title: { absolute: title },
    description,
    authors: [{ name: studio.name }],
    creator: studio.name,
    publisher: studio.name,
    robots: { index: false, follow: false },
    openGraph: {
      title,
      description,
      url: `/s/${slug}`,
      siteName: studio.name,
      images: [
        {
          url: "/og-image.jpg",
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      title,
      description,
    },
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
    <StudioPreviewLayout
      studio={config}
      homeHref={`/s/${studio.slug}`}
      showDemoBanner={isDemoPreview(studio)}
    />
  );
}
