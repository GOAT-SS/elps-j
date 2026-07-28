import Link from "next/link";

const steps = [
  {
    number: "STEP 1",
    title: "発音知識学習",
    description:
      "発音記号と、舌の高さ・前後、唇の形などの構成要素を文字と図で確認します。",
    href: "/learn",
    action: "発音知識を学ぶ",
    accent: "bg-blue-50 text-blue-700",
  },
  {
    number: "STEP 2",
    title: "発音構成理解",
    description:
      "発音記号を見て、音を作る構成要素を自分で選び、理解を確かめます。",
    href: "/components",
    action: "発音構成を理解する",
    accent: "bg-emerald-50 text-emerald-700",
  },
  {
    number: "STEP 3",
    title: "発音練習",
    description:
      "ミニマルペアを録音し、音声AIの判定と構成要素のフィードバックを確認します。",
    href: "/practice",
    action: "発音練習を始める",
    accent: "bg-violet-50 text-violet-700",
  },
] as const;

export default function Home() {
  return (
    <main className="flex-1">
      <section className="border-b border-blue-100 bg-gradient-to-br from-white via-blue-50 to-indigo-50">
        <div className="mx-auto grid w-full max-w-6xl gap-10 px-5 py-16 sm:px-8 sm:py-24 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <div>
            <p
              lang="en"
              className="text-sm font-bold tracking-[0.16em] text-blue-700"
            >
              FOR JAPANESE LEARNERS
            </p>
            <h1 className="mt-5 text-4xl font-bold leading-tight tracking-tight text-slate-950 sm:text-6xl">
              発音を、感覚だけでなく
              <span className="block text-blue-700">構成要素から学ぶ。</span>
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-700">
              英語の音を「舌の位置」「唇の形」などに分けて理解し、
              知識・選択演習・録音練習の好きなところから学べるシステムです。
            </p>
            <p className="mt-4 text-sm text-slate-500">
              想定する学習者：中学生以上
            </p>
          </div>

          <div className="rounded-3xl border border-white/80 bg-white/80 p-7 shadow-xl shadow-blue-950/5 backdrop-blur">
            <p className="text-sm font-bold text-blue-700">
              なぜ発音を学ぶのか
            </p>
            <ul className="mt-5 space-y-4 text-sm leading-7 text-slate-700">
              <li className="flex gap-3">
                <span aria-hidden="true" className="text-blue-600">
                  01
                </span>
                似た音の違いを意識し、自分の発音を調整する手がかりにする
              </li>
              <li className="flex gap-3">
                <span aria-hidden="true" className="text-blue-600">
                  02
                </span>
                聞き取りと発音を、同じ音の特徴から考えられるようにする
              </li>
              <li className="flex gap-3">
                <span aria-hidden="true" className="text-blue-600">
                  03
                </span>
                「違う」だけでなく、どの構成要素が違うかを知る
              </li>
            </ul>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-5 py-14 sm:px-8 sm:py-20">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p lang="en" className="text-sm font-bold text-blue-700">
              LEARNING MENU
            </p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
              学びたいSTEPを選ぶ
            </h2>
          </div>
          <p className="max-w-xl rounded-xl bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-950">
            3つのSTEPは独立しています。順番どおりでなくても、
            必要なところから始められます。
          </p>
        </div>

        <div className="mt-8 grid gap-5 lg:grid-cols-3">
          {steps.map((step) => (
            <Link
              key={step.number}
              href={step.href}
              className="group flex min-h-72 flex-col rounded-3xl border border-slate-200 bg-white p-7 shadow-sm transition hover:-translate-y-1 hover:border-blue-200 hover:shadow-lg"
            >
              <span
                lang="en"
                className={`w-fit rounded-full px-3 py-1 text-xs font-bold ${step.accent}`}
              >
                {step.number}
              </span>
              <h3 className="mt-6 text-2xl font-bold text-slate-950">
                {step.title}
              </h3>
              <p className="mt-4 leading-7 text-slate-600">
                {step.description}
              </p>
              <span className="mt-auto pt-8 font-bold text-blue-700 transition group-hover:translate-x-1">
                {step.action} →
              </span>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
