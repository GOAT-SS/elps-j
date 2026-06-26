import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-slate-100">
      <section className="mx-auto flex max-w-6xl flex-col gap-10">
        <header className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold tracking-wide text-blue-400">
              English Pronunciation Learning System For Japanese Learners
            </p>
            <p className="mt-1 text-sm text-slate-400">
              ある程度の認知能力がある人を想定（例：中学生以上）
            </p>
          </div>

          <nav className="hidden gap-6 text-sm font-medium text-slate-300 sm:flex">
            <Link href="/segmental" className="transition hover:text-blue-400">
              文節学習
            </Link>
            <Link
              href="/AssociativePhase"
              className="transition hover:text-blue-400"
            >
              構成要素選択演習
            </Link>
          </nav>
        </header>

        <section className="grid items-center gap-10 py-10 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="flex flex-col gap-8">
            <div className="flex flex-col gap-4">
              <h1 className="text-xl font-bold leading-tight tracking-tight text-white sm:text-5xl lg:text-5xl">
                日本人学習者のための
                <br />
                英語発音学習支援システム
                <br />
                文節編
              </h1>

              <p className="max-w-2xl text-lg leading-8 text-slate-300">
                日本人学習者が
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="/segmental"
                className="rounded-full bg-blue-500 px-6 py-3 text-center font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:bg-blue-400"
              >
                学習を始める
              </Link>
              <Link
                href="/AssociativePhase"
                className="rounded-full border border-slate-700 bg-slate-900 px-6 py-3 text-center font-semibold text-slate-200 transition hover:border-blue-400 hover:text-blue-300"
              >
                練習問題を見る
              </Link>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-sm">
            <p className="text-sm font-semibold text-blue-400">Step 1</p>
            <h2 className="mt-2 text-xl font-bold text-white">知識を学ぶ</h2>
            <p className="mt-3 text-sm leading-6 text-slate-400">
              発音記号と、音を構成する特徴を確認します。
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-sm">
            <p className="text-sm font-semibold text-blue-400">Step 2</p>
            <h2 className="mt-2 text-xl font-bold text-white">構成を再現する</h2>
            <p className="mt-3 text-sm leading-6 text-slate-400">
              音素に必要な構成要素を選択し、発音構造を再構築します。
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-sm">
            <p className="text-sm font-semibold text-blue-400">Step 3</p>
            <h2 className="mt-2 text-xl font-bold text-white">結果を振り返る</h2>
            <p className="mt-3 text-sm leading-6 text-slate-400">
              誤った構成要素を確認し、次の練習につなげます。
            </p>
          </div>
        </section>
      </section>
    </main>
  );
}
