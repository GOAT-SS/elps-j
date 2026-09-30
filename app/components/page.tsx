import Link from "next/link";
import ComponentBuilder from "./ComponentBuilder";

export default function ComponentsPage() {
  return (
    <main className="flex-1">
      <section className="border-b border-emerald-100 bg-emerald-50">
        <div className="mx-auto w-full max-w-7xl px-5 py-12 sm:px-8 sm:py-16">
          <p
            lang="en"
            className="text-sm font-bold tracking-[0.14em] text-emerald-700"
          >
            STEP 2 · GENERAL AMERICAN
          </p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight text-slate-950">
            発音構成理解
          </h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-700">
            アメリカ英語の基本41項目について、その音を作る構成要素を選び、概念マップを組み立てます。
            まずは答えを見ずに選び、自分の理解を確かめてみましょう。
          </p>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-5 py-12 sm:px-8">
        <ComponentBuilder />

        <aside className="mt-8 grid gap-5 md:grid-cols-3">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-bold text-emerald-700">
              この学習方法について
            </p>
            <h2 className="mt-2 text-xl font-bold text-slate-950">
              音を分解し、再構成する
            </h2>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              発音を音声だけで覚えるのではなく、音を構成要素へ分け、
              学習者自身が再構成する学習課題です。現在は学部研究の試作として検証しています。
            </p>
          </div>

          <div className="rounded-3xl border border-amber-200 bg-amber-50 p-6">
            <p className="font-bold text-amber-950">データについて</p>
            <p className="mt-2 text-sm leading-6 text-amber-900">
              General American を基準にした学習用の分類です。舌の位置はおおまかな目安で、方言や話者による違いがあります。二重母音は開始位置と移動方向、R音性母音はRの響きと強勢を扱います。
            </p>
          </div>

          <Link
            href="/practice"
            className="block rounded-3xl bg-slate-950 p-6 font-bold text-white transition hover:bg-slate-800"
          >
            発音も試してみる
            <span className="mt-2 block text-sm font-medium text-slate-300">
              発音練習を開く →
            </span>
          </Link>
        </aside>
      </section>
    </main>
  );
}
