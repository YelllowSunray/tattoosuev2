"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import AuthButton from "../components/AuthButton";
import MobileNav from "../components/MobileNav";

const CREDIT_PACKAGES = [
  { credits: 10, price: 1.00, perImage: 0.20, popular: false },
  { credits: 100, price: 10.00, perImage: 0.20, popular: true },
  { credits: 200, price: 20.00, perImage: 0.20, popular: false },
  { credits: 500, price: 50.00, perImage: 0.20, popular: false },
  { credits: 1000, price: 100.00, perImage: 0.20, popular: false },
];

const FAQ = [
  {
    question: "How many credits does it cost to generate an image?",
    answer: "Each tattoo design generation costs 2 credits, which equals $0.20 per image. This is the most affordable rate in the AI tattoo industry.",
  },
  {
    question: "Do credits expire?",
    answer: "No, your credits never expire. Use them whenever you're ready to create your next tattoo design.",
  },
  {
    question: "Can I get a refund on unused credits?",
    answer: "Credits are non-refundable once purchased, but they never expire so you can use them anytime.",
  },
  {
    question: "What payment methods do you accept?",
    answer: "We accept all major credit cards, debit cards, and Apple Pay through our secure Stripe payment system.",
  },
  {
    question: "Is there a free trial?",
    answer: "New users can explore the gallery for free. To generate custom designs, you'll need to purchase credits starting from just $1 for 10 credits.",
  },
  {
    question: "What's included in each generation?",
    answer: "Each generation creates a unique AI tattoo design based on your description, style preferences, and optional reference images. You can also visualize the design on your body placement photo.",
  },
];

export default function PricingPage() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="relative border-b border-white/5 bg-black/95 lg:bg-black/40 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 py-3 flex items-center justify-between gap-4">
          <div className="flex-1 flex justify-start gap-2">
            <div className="hidden lg:flex gap-2">
              <Link
                href="/"
                className="text-xs sm:text-sm text-white/70 hover:text-white border border-white/30 px-3 py-2 rounded-full transition-colors min-h-[44px] flex items-center"
              >
                ← Back to gallery
              </Link>
              <Link
                href="/generate"
                className="text-xs sm:text-sm text-white/70 hover:text-white border border-white/30 px-3 py-2 rounded-full transition-colors min-h-[44px] flex items-center"
              >
                Generate
              </Link>
            </div>
            <div className="lg:hidden">
              <MobileNav />
            </div>
          </div>
          <div className="flex-1 flex justify-center">
            <Link href="/" className="text-xl sm:text-2xl font-light tracking-tight">
              Sue&apos;s Tattoo
            </Link>
          </div>
          <div className="flex-1 flex justify-end">
            <div className="hidden lg:flex items-center gap-2">
              <AuthButton />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero */}
        <div className="text-center mb-12">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-light tracking-tight mb-4">
            Simple, Affordable Pricing
          </h1>
          <p className="text-white/60 text-lg max-w-2xl mx-auto mb-6">
            The most affordable AI tattoo generator on the market. 
            Generate unlimited designs at just <span className="text-white font-medium">$0.20 per image</span>.
          </p>
          <div className="inline-flex items-center gap-2 bg-green-500/10 border border-green-500/20 text-green-400 px-4 py-2 text-sm">
            <span>💰</span>
            <span>Save up to 96% compared to other AI tattoo generators</span>
          </div>
        </div>

        {/* How it works */}
        <div className="bg-white/5 border border-white/10 p-6 mb-12 text-center">
          <h2 className="text-xl font-light mb-4">How Credits Work</h2>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8 text-white/70">
            <div className="flex items-center gap-2">
              <span className="text-2xl font-light text-white">2</span>
              <span>credits</span>
            </div>
            <span className="text-white/30">=</span>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-light text-white">1</span>
              <span>generated image</span>
            </div>
            <span className="text-white/30">=</span>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-light text-white">$0.20</span>
            </div>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="mb-16">
          <h2 className="text-2xl font-light text-center mb-8">Choose Your Package</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {CREDIT_PACKAGES.map((pkg, idx) => (
              <div
                key={idx}
                className={`relative border p-6 ${
                  pkg.popular
                    ? "border-white/40 bg-white/10"
                    : "border-white/10 bg-white/5"
                }`}
              >
                {pkg.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-white text-black text-xs px-3 py-1 font-medium">
                    MOST POPULAR
                  </div>
                )}
                <div className="text-center">
                  <div className="text-3xl font-light text-white mb-1">
                    {pkg.credits}
                  </div>
                  <div className="text-white/50 text-sm mb-4">credits</div>
                  <div className="text-2xl font-light text-white mb-1">
                    €{pkg.price.toFixed(2)}
                  </div>
                  <div className="text-white/50 text-xs mb-4">
                    {Math.floor(pkg.credits / 2)} images • €{pkg.perImage.toFixed(2)}/image
                  </div>
                  <Link
                    href={user ? "/credits" : "/credits"}
                    className={`block w-full py-3 text-sm font-medium transition-colors ${
                      pkg.popular
                        ? "bg-white text-black hover:bg-zinc-200"
                        : "border border-white/30 text-white hover:bg-white/10"
                    }`}
                  >
                    {user ? "Buy Now" : "Sign In to Buy"}
                  </Link>
                </div>
              </div>
            ))}
          </div>
          <p className="text-center text-white/40 text-sm mt-4">
            All prices in EUR. Credits never expire.
          </p>
        </div>

        {/* What's Included */}
        <div className="mb-16">
          <h2 className="text-2xl font-light text-center mb-8">What&apos;s Included</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="border border-white/10 bg-white/5 p-5">
              <div className="text-xl mb-2">🎨</div>
              <h3 className="text-white font-medium mb-2">100+ Tattoo Styles</h3>
              <p className="text-white/50 text-sm">
                Mandala, geometric, traditional, realism, watercolor, and many more styles to choose from.
              </p>
            </div>
            <div className="border border-white/10 bg-white/5 p-5">
              <div className="text-xl mb-2">📸</div>
              <h3 className="text-white font-medium mb-2">Body Visualization</h3>
              <p className="text-white/50 text-sm">
                Upload your photo and see exactly how the tattoo will look on your body.
              </p>
            </div>
            <div className="border border-white/10 bg-white/5 p-5">
              <div className="text-xl mb-2">🖼️</div>
              <h3 className="text-white font-medium mb-2">Photo References</h3>
              <p className="text-white/50 text-sm">
                Turn photos of loved ones, pets, or meaningful images into tattoo designs.
              </p>
            </div>
            <div className="border border-white/10 bg-white/5 p-5">
              <div className="text-xl mb-2">📁</div>
              <h3 className="text-white font-medium mb-2">Unlimited History</h3>
              <p className="text-white/50 text-sm">
                All your generated designs are saved forever. Access them anytime.
              </p>
            </div>
            <div className="border border-white/10 bg-white/5 p-5">
              <div className="text-xl mb-2">🏪</div>
              <h3 className="text-white font-medium mb-2">Parlor CRM</h3>
              <p className="text-white/50 text-sm">
                Professional tools for tattoo artists to manage customers and designs.
              </p>
            </div>
            <div className="border border-white/10 bg-white/5 p-5">
              <div className="text-xl mb-2">🔒</div>
              <h3 className="text-white font-medium mb-2">Privacy First</h3>
              <p className="text-white/50 text-sm">
                Your body photos are never stored. We respect your privacy.
              </p>
            </div>
          </div>
        </div>

        {/* FAQ */}
        <div className="mb-16">
          <h2 className="text-2xl font-light text-center mb-8">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {FAQ.map((item, idx) => (
              <div key={idx} className="border border-white/10 bg-white/5 p-5">
                <h3 className="text-white font-medium mb-2">{item.question}</h3>
                <p className="text-white/60 text-sm">{item.answer}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="text-center border border-white/10 bg-white/5 p-8">
          <h2 className="text-2xl font-light mb-4">Ready to Create Your Perfect Tattoo?</h2>
          <p className="text-white/60 mb-6">
            Start generating custom tattoo designs for just $0.20 per image.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/generate"
              className="w-full sm:w-auto px-8 py-3 text-sm font-medium text-black bg-white hover:bg-zinc-200 transition-colors"
            >
              Start Generating
            </Link>
            <Link
              href="/credits"
              className="w-full sm:w-auto px-8 py-3 text-sm font-medium text-white border border-white/30 hover:border-white/50 hover:bg-white/5 transition-colors"
            >
              Buy Credits
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8 mt-12">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-white/30 text-xs">
              © {new Date().getFullYear()} Sue&apos;s Tattoo Studio
            </p>
            <div className="flex items-center gap-4">
              <Link href="/terms" className="text-xs text-white/50 hover:text-white/70">
                Terms
              </Link>
              <Link href="/privacy" className="text-xs text-white/50 hover:text-white/70">
                Privacy
              </Link>
              <Link href="/support" className="text-xs text-white/50 hover:text-white/70">
                Support
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
