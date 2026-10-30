import Link from "next/link";
import { SALES_WHATSAPP_HREF } from "@/lib/studios";

const SAMPLE_CARDS = [
  { src: "/images/1.png", label: "Ornamental" },
  { src: "/images/2.png", label: "Japanese" },
  { src: "/images/3.png", label: "Realism" },
  { src: "/images/4.png", label: "Geometric" },
  { src: "/images/5.png", label: "Fine line" },
  { src: "/images/6.png", label: "Blackwork" },
] as const;

const WHATSAPP_HREF = `${SALES_WHATSAPP_HREF}?text=${encodeURIComponent(
  "Hi! I'd like a branded style explorer for my tattoo studio."
)}`;

function WhatsAppIcon({ className }: { className: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.71.306 1.263.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

export default function StudioSalesLanding() {
  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <header className="border-b border-white/[0.08]">
        <div className="h-12 lg:h-16 max-w-5xl mx-auto px-4 sm:px-6 flex items-center justify-between">
          <p className="text-sm tracking-[0.22em] uppercase text-white/50 font-light">
            SamirDev
          </p>
          <a
            href={WHATSAPP_HREF}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 text-[11px] sm:text-sm font-semibold bg-white text-black hover:opacity-90 transition-opacity"
          >
            <WhatsAppIcon className="w-4 h-4" />
            Contact
          </a>
        </div>
      </header>

      <main className="flex-1">
        <section className="max-w-5xl mx-auto px-4 sm:px-6 pt-14 sm:pt-20 pb-10 sm:pb-14 text-center">
          <p className="text-white/35 text-xs uppercase tracking-[0.22em] mb-4">
            For tattoo studios
          </p>
          <h1 className="text-3xl sm:text-5xl font-light tracking-tight text-white max-w-3xl mx-auto leading-[1.15]">
            Style explorer for tattoo studios, branded for your studio
          </h1>
          <p className="mt-5 text-white/55 text-sm sm:text-base font-light max-w-xl mx-auto">
            Clients sample and combine styles on a page that looks like yours —
            then book a consultation. The full catalogue is not public.
          </p>
          <a
            href={WHATSAPP_HREF}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-8 inline-flex items-center justify-center gap-2 px-8 sm:px-10 py-3.5 sm:py-4 text-sm sm:text-base font-semibold bg-white text-black hover:scale-[1.02] transition-transform"
          >
            <WhatsAppIcon className="w-5 h-5" />
            Message on WhatsApp
          </a>
        </section>

        <section className="max-w-5xl mx-auto px-4 sm:px-6 pb-16 sm:pb-24">
          <p className="text-center text-white/30 text-[11px] uppercase tracking-[0.2em] mb-5">
            Sample styles
          </p>
          <ul className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
            {SAMPLE_CARDS.map((card) => (
              <li
                key={card.src}
                className="relative overflow-hidden bg-white/5 aspect-square"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={card.src}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover blur-md scale-110 opacity-80 pointer-events-none select-none"
                  draggable={false}
                />
                <div className="absolute inset-0 bg-black/45" />
                <span className="absolute inset-0 flex items-end p-3">
                  <span className="text-[11px] tracking-[0.16em] uppercase text-white/70">
                    {card.label}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      </main>

      <footer className="border-t border-white/5 py-8">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-white/30 text-xs font-light">
            © {new Date().getFullYear()} SamirDev
          </p>
          <div className="flex items-center gap-4">
            <Link
              href="/terms"
              className="text-xs text-white/50 hover:text-white/70 font-light"
            >
              Terms
            </Link>
            <Link
              href="/privacy"
              className="text-xs text-white/50 hover:text-white/70 font-light"
            >
              Privacy
            </Link>
            <a
              href={WHATSAPP_HREF}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-white/50 hover:text-white/70 font-light"
            >
              WhatsApp
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
