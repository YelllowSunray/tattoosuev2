"use client";

import Link from "next/link";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Link
          href="/"
          className="text-xs sm:text-sm text-white/70 hover:text-white border border-white/30 px-3 py-2 rounded-full inline-flex items-center mb-8 transition-colors"
        >
          ← Back to Gallery
        </Link>

        <h1 className="text-3xl sm:text-4xl font-light tracking-tight mb-8">
          Terms & Conditions
        </h1>

        <div className="space-y-6 text-sm text-white/80 leading-relaxed">
          <section>
            <h2 className="text-xl font-medium mb-4">Acceptance of Terms</h2>
            <p>
              By using this service, you agree to these Terms & Conditions and our{" "}
              <Link href="/privacy" className="text-white underline hover:text-white/80">
                Privacy Policy
              </Link>.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-medium mb-4">Service Description</h2>
            <p>
              This service provides AI-generated tattoo designs. Generated designs are for reference 
              purposes only and should be reviewed by a professional tattoo artist before application.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-medium mb-4">User Responsibilities</h2>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>You must be 18+ to use this service</li>
              <li>You are responsible for ensuring you have rights to upload any reference images</li>
              <li>You agree not to upload inappropriate, illegal, or copyrighted content</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-medium mb-4">Image Usage</h2>
            <div className="bg-black/40 border border-white/10 p-4 rounded">
              <p className="font-medium mb-2">Your images are NOT used for AI training</p>
              <p className="text-white/70">
                Reference images you upload are used solely for generating your requested designs 
                and are not stored permanently or used to train AI models.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-medium mb-4">Limitation of Liability</h2>
            <p>
              Generated designs are AI-created suggestions. We are not responsible for the final 
              tattoo application or any outcomes resulting from the use of generated designs.
            </p>
          </section>

          <section>
            <p className="text-white/60 text-xs">
              Last updated: {new Date().toLocaleDateString()}
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
