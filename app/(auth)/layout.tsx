import Image from "next/image";
import Link from "next/link";
import { LogoBadge, Wordmark } from "@/components/brand";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[1.05fr_1fr]">
      {/* Phones: a band of photo with the form on a sheet rising over it. Large screens: the photo stays pinned beside the form. */}
      <aside className="xm-veil xm-veil-tall relative h-[200px] overflow-hidden lg:sticky lg:top-0 lg:h-dvh">
        <div className="absolute inset-0">
          <Image
            src="/photos/monteverde-puente-colgante-canopy.jpg"
            alt="A hanging bridge through the Monteverde cloud forest canopy"
            fill
            priority
            sizes="(min-width: 1024px) 55vw, 100vw"
            className="object-cover"
          />
        </div>
        <div className="absolute inset-x-0 bottom-0 z-10 hidden p-12 lg:block">
          <p className="xm-hero max-w-lg text-white">Sell the country you know</p>
          <p className="mt-5 max-w-md text-[18px] leading-[1.55] text-white">
            Training, masterclasses, FAM trips, offers and marketing material from the TravelXM team in San José. One account, everything in one place.
          </p>
        </div>
      </aside>

      <main className="relative z-10 -mt-8 flex min-h-[calc(100dvh-168px)] flex-col rounded-t-xl bg-page px-4 pt-6 pb-6 sm:px-10 lg:mt-0 lg:min-h-dvh lg:rounded-none lg:pt-[max(24px,env(safe-area-inset-top))]">
        <Link href="/" className="flex items-center gap-3 self-start rounded-md" aria-label="TravelXM Agents Hub home">
          <LogoBadge size={56} priority />
          <Wordmark />
        </Link>
        <div className="mx-auto flex w-full max-w-[440px] flex-1 flex-col justify-center py-8">{children}</div>
        <p className="text-center text-[15px] text-muted">
          TravelXM, San José, Costa Rica. <span className="italic">Pura Vida</span>
        </p>
      </main>
    </div>
  );
}
