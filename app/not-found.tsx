import Link from "next/link";
import { BrandLink, Cutout } from "@/components/brand";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden">
      <header className="xm-container flex h-24 items-center">
        <BrandLink />
      </header>
      <main className="xm-container flex flex-1 flex-col justify-center pb-24">
        <h1 className="xm-hero max-w-3xl">Off the map</h1>
        <p className="xm-lead mt-6 max-w-xl text-muted">
          This page does not exist, or the course has moved. Your progress is safe.
        </p>
        <div className="mt-8">
          <Button asChild size="lg">
            <Link href="/dashboard">Back to Home</Link>
          </Button>
        </div>
      </main>
      <Cutout name="sloth" width={260} height={193} className="right-6 bottom-10 hidden md:block" />
    </div>
  );
}
