import Link from "next/link";

export default function StudioNotFound() {
  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center px-6">
      <div className="max-w-lg text-center space-y-5">
        <h1 className="text-3xl font-light tracking-tight">Studio not found</h1>
        <p className="text-white/55 text-sm font-light">
          This preview link doesn&apos;t match a studio in the gallery catalog.
        </p>
        <Link
          href="/"
          className="inline-flex items-center justify-center px-6 py-3 text-sm font-semibold text-black bg-white"
        >
          Back home
        </Link>
      </div>
    </div>
  );
}
