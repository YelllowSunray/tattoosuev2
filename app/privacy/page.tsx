"use client";

import Link from "next/link";

export default function PrivacyPage() {
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
          Privacy Policy
        </h1>

        <div className="space-y-6 text-sm text-white/80 leading-relaxed">
          <section>
            <h2 className="text-xl font-medium mb-4">Data We Collect</h2>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Account information: Email address (for authentication)</li>
              <li>Customer data: Name, email, phone (for parlor mode customers)</li>
              <li>Generated tattoo designs: Stored in Firebase Storage</li>
              <li>Reference images: Body photos and subject photos uploaded for generation</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-medium mb-4">How We Store Your Data</h2>
            <div className="space-y-3">
              <div>
                <h3 className="font-medium mb-2">Reference Images (Body Photos)</h3>
                <ul className="list-disc list-inside space-y-1 ml-4 text-white/70">
                  <li><strong>Storage Location:</strong> Reference images are processed in memory only and are NOT permanently stored</li>
                  <li><strong>Retention:</strong> Images are only held in your browser session during the generation process</li>
                  <li><strong>Deletion:</strong> Images are automatically cleared when you remove them from the form or close your browser</li>
                  <li><strong>No Permanent Storage:</strong> We do not save body photos or reference images to our servers</li>
                </ul>
              </div>
              <div>
                <h3 className="font-medium mb-2">Generated Tattoo Designs</h3>
                <ul className="list-disc list-inside space-y-1 ml-4 text-white/70">
                  <li><strong>Storage Location:</strong> Firebase Storage (Google Cloud Platform)</li>
                  <li><strong>Retention:</strong> Stored until you delete your account or request deletion</li>
                  <li><strong>Deletion:</strong> You can request deletion by contacting support</li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-medium mb-4">Why We Store Your Data</h2>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>To provide tattoo design generation services</li>
              <li>To maintain your generation history</li>
              <li>To manage customer relationships (parlor mode)</li>
              <li>To process payments and manage credits</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-medium mb-4">Data Retention</h2>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li><strong>Reference Images:</strong> Not stored - cleared immediately after generation</li>
              <li><strong>Generated Designs:</strong> Retained until account deletion or upon request</li>
              <li><strong>Account Data:</strong> Retained while your account is active</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-medium mb-4">Image Usage Policy</h2>
            <div className="bg-black/40 border border-white/10 p-4 rounded">
              <p className="font-medium mb-2">Your images are NOT used for AI training</p>
              <p className="text-white/70">
                We do not use your uploaded reference images or generated designs to train AI models. 
                Your images are used solely for the purpose of generating your requested tattoo designs 
                and are not shared, sold, or used for any other purpose without your explicit consent.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-medium mb-4">Your Rights</h2>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Request access to your data</li>
              <li>Request deletion of your data</li>
              <li>Request correction of inaccurate data</li>
              <li>Contact us at <Link href="/support" className="text-white underline hover:text-white/80">support</Link> for any privacy concerns</li>
            </ul>
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
