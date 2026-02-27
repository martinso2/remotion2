import dynamic from "next/dynamic";

const RemotionPlayer = dynamic(
  () =>
    import("@/components/remotion/StudioPlayer").then((m) => m.StudioPlayer),
  { ssr: false }
);

export default function StudioPage() {
  return (
    <main className="min-h-screen bg-slate-950 p-8">
      <h1 className="text-2xl font-semibold text-white mb-6">
        Remotion Studio
      </h1>
      <RemotionPlayer />
    </main>
  );
}
