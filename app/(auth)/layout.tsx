import Image from "next/image";
import Link from "next/link";
import { LogoBadge, Wordmark, Cutout } from "@/components/brand";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      {/* Pinned to the viewport so a long form never stretches the photo */}
      <aside className="xm-veil xm-veil-tall sticky top-0 hidden h-dvh overflow-hidden lg:block">
        <div className="absolute inset-0">
          <Image
            src="/photos/monteverde-puente-colgante-canopy.jpg"
            alt="A hanging bridge through the Monteverde cloud forest canopy"
            fill
            priority
            sizes="55vw"
            className="object-cover"
          />
        </div>
        <div className="absolute inset-x-0 bottom-0 z-10 p-12">
          <p className="max-w-lg font-display text-[64px] leading-none tracking-[0.005em] text-white uppercase">
            Sell the country you know
          </p>
          <p className="mt-5 max-w-md text-[17px] leading-[1.55] text-cloudy">
            Short lessons from the TravelXM team in San José. Learn the destinations, get certified, and quote with confidence.
          </p>
          <p className="xm-meta mt-6">Monteverde · Cloud forest</p>
        </div>
      </aside>

      {/* overflow-x-clip: the cut-out sits on the edge without adding a sideways scrollbar */}
      <main className="relative flex min-h-dvh flex-col overflow-x-clip px-4 pt-[max(20px,env(safe-area-inset-top))] pb-6 sm:px-10">
        <Link href="/" className="flex items-center gap-3 self-start rounded-md" aria-label="TravelXM Academy home">
          <LogoBadge size={56} priority />
          <Wordmark />
        </Link>
        <div className="mx-auto flex w-full max-w-[440px] flex-1 flex-col justify-center py-6">{children}</div>
        <p className="text-center text-[13px] text-muted">
          TravelXM · San José, Costa Rica · <span className="italic">Pura Vida</span>
        </p>
        <Cutout name="toucan" width={170} height={120} className="-right-8 bottom-14 hidden xl:block" />
      </main>
    </div>
  );
}
