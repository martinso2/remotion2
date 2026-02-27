import Link from "next/link";

export function Navbar() {
  return (
    <nav className="border-b border-slate-800 bg-slate-950/95 backdrop-blur supports-[backdrop-filter]:bg-slate-950/80">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-14 items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            {/* Logo - video/reel icon */}
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-700">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4 text-white"
              >
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <path d="M10 9l5 3-5 3V9z" />
              </svg>
            </div>
            <span className="text-lg font-semibold text-white">
              ReelForge
            </span>
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
