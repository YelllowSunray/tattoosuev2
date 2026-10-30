"use client";

import { useStudio } from "@/lib/studio-context";

export default function ArtistsShowcase() {
  const studio = useStudio();
  const artists = studio.artists.filter(
    (artist) => artist.name && (artist.portfolioImages?.length || artist.bio)
  );
  const featured = studio.featuredWork.filter((item) => item.url);

  if (artists.length === 0 && featured.length === 0) {
    return null;
  }

  return (
    <section className="border-b border-white/5 bg-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 py-10 space-y-10">
        {artists.length > 0 && (
          <div>
            <div className="mb-6">
              <p className="text-white/40 text-xs uppercase tracking-[0.2em] mb-2">
                The studio
              </p>
              <h2 className="text-2xl sm:text-3xl font-light text-white">
                Our artists
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {artists.map((artist) => (
                <article
                  key={artist.name}
                  className="border border-white/10 bg-white/[0.02] p-5 space-y-4"
                >
                  <div>
                    <h3 className="text-lg font-light text-white">{artist.name}</h3>
                    {artist.bio && (
                      <p className="text-white/50 text-sm mt-1">{artist.bio}</p>
                    )}
                    {artist.specialties && artist.specialties.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {artist.specialties.map((specialty) => (
                          <span
                            key={specialty}
                            className="text-[10px] uppercase tracking-wider text-white/60 border border-white/15 px-2 py-1"
                          >
                            {specialty}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  {artist.portfolioImages && artist.portfolioImages.length > 0 && (
                    <div className="grid grid-cols-3 gap-2">
                      {artist.portfolioImages.slice(0, 6).map((src) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          key={src}
                          src={src}
                          alt={`${artist.name} tattoo work`}
                          className="aspect-square w-full object-cover border border-white/10"
                        />
                      ))}
                    </div>
                  )}
                </article>
              ))}
            </div>
          </div>
        )}

        {featured.length > 0 && (
          <div>
            <div className="mb-6">
              <p className="text-white/40 text-xs uppercase tracking-[0.2em] mb-2">
                Portfolio
              </p>
              <h2 className="text-2xl sm:text-3xl font-light text-white">
                Our work
              </h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {featured.map((item) => (
                <figure key={item.url} className="space-y-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.url}
                    alt={item.alt || "Studio tattoo work"}
                    className="aspect-square w-full object-cover border border-white/10"
                  />
                  {(item.alt || item.artist) && (
                    <figcaption className="text-xs text-white/40 font-light">
                      {item.alt}
                      {item.artist ? ` — ${item.artist}` : ""}
                    </figcaption>
                  )}
                </figure>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
