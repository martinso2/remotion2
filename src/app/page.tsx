import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-8">
      <h1 className="text-3xl font-semibold text-white mb-4">
        Remotion + Next.js
      </h1>
      <p className="text-slate-400 mb-8 text-center max-w-md">
        Programmatic video creation with Remotion embedded in Next.js 14
      </p>
      <Link
        href="/studio"
        className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors"
      >
        Open Studio
      </Link>
    </main>
  );
}
