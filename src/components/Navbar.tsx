import Image from "next/image";
import Link from "next/link";

import logo from "@/app/reel-motion-logo-1.jpeg";

export function Navbar() {
  return (
    <nav className="border-b border-slate-800 bg-slate-950/95 backdrop-blur supports-[backdrop-filter]:bg-slate-950/80">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-14 items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <Image
              src={logo}
              alt="ReelForge"
              width={120}
              height={32}
              className="h-8 w-auto object-contain"
              priority
            />
          </Link>

          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="text-sm font-medium text-slate-300 hover:text-white transition-colors"
            >
              Create
            </Link>
            <Link
              href="/studio"
              className="text-sm font-medium text-slate-300 hover:text-white transition-colors"
            >
              Studio
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
