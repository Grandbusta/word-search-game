
import WordSearchGame from "@/components/WordSearchGame";

export default function Home() {
  return (
    <main className="min-h-screen p-2 md:p-8 bg-slate-950 text-white bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black overflow-x-hidden">
      <h1 className="text-3xl md:text-5xl font-extrabold text-center my-6 md:mb-10 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-600 drop-shadow-[0_0_10px_rgba(34,211,238,0.5)] tracking-wider uppercase">
        WORD SEARCH
      </h1>
      <WordSearchGame />
    </main>
  );
}
