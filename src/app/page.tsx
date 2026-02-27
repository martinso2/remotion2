import dynamic from "next/dynamic";

const VideoCreator = dynamic(
  () => import("@/components/VideoCreator").then((m) => m.VideoCreator),
  { ssr: false }
);

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 p-6 lg:p-8">
      <VideoCreator />
    </main>
  );
}
