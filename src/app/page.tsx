import dynamic from "next/dynamic";

const VideoCreator = dynamic(
  () => import("@/components/VideoCreator").then((m) => m.VideoCreator),
  { ssr: false }
);

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 p-6 lg:p-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-white">
          Create
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Enter a prompt and choose a platform to create TikTok or Facebook videos
        </p>
      </header>
      <VideoCreator />
    </main>
  );
}
