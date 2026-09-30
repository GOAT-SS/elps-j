import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { soundGroups, soundLessons } from "../../data/american-english";

export function generateStaticParams() {
  return soundLessons.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const sound = soundLessons.find((item) => item.slug === slug);
  return { title: sound ? `/${sound.symbol}/ の発音を学ぶ | ELPS-J` : "発音記号が見つかりません | ELPS-J" };
}

export default async function SoundPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const index = soundLessons.findIndex((item) => item.slug === slug);
  const sound = soundLessons[index];
  if (!sound) notFound();
  const group = soundGroups.find((item) => item.id === sound.group)!;
  const comparison = soundLessons.find((item) => item.slug === sound.comparison)!;
  const previous = soundLessons[index - 1];
  const next = soundLessons[index + 1];

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-5 py-10 sm:px-8">
      <nav aria-label="パンくず" className="flex flex-wrap gap-2 text-sm text-blue-700"><Link href="/learn" className="underline">発音知識学習</Link><span aria-hidden="true">/</span><Link href={`/learn#${group.id}`} className="underline">{group.title}</Link><span aria-hidden="true">/</span><span lang="en" aria-current="page">/{sound.symbol}/</span></nav>
      <header className="mt-7 rounded-3xl border border-blue-100 bg-blue-50 p-7 sm:p-10">
        <p className="text-sm font-bold text-blue-700">{group.title} · {index + 1} / {soundLessons.length}</p>
        <h1 className="mt-4 flex flex-wrap items-baseline gap-5"><span lang="en" className="text-6xl font-bold text-blue-700">/{sound.symbol}/</span><span className="text-2xl font-bold text-slate-950">{sound.name}</span></h1>
        {sound.aliases && <p className="mt-4 text-sm text-slate-600">別の表記：<span lang="en">{sound.aliases}</span></p>}
        <ul aria-label="音の構成要素" className="mt-6 flex flex-wrap gap-2">{sound.features.map((feature) => <li key={feature} className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-700">{feature}</li>)}</ul>
      </header>
      <div className="mt-7 grid gap-6 md:grid-cols-2">
        <section className="rounded-3xl border border-slate-200 bg-white p-7">
          <h2 className="text-xl font-bold text-slate-950">口と舌の使い方</h2>
          <ol className="mt-5 list-decimal space-y-4 pl-5 leading-8 text-slate-700">{sound.steps.map((step) => <li key={step}>{step}</li>)}</ol>
          <h3 className="mt-7 font-bold text-blue-700">間違えやすいポイント</h3>
          <p className="mt-2 leading-8 text-slate-600">{sound.tip}</p>
        </section>
        <section className="rounded-3xl border border-slate-200 bg-white p-7">
          <h2 className="text-xl font-bold text-slate-950">例語で確かめる</h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">記号の位置を確認して、ゆっくり発音しましょう。辞書のリンク先では US の音声を確認できます。</p>
          <ul className="mt-5 space-y-4">{sound.examples.map((example) => <li key={example.word} className="rounded-2xl bg-slate-100 p-4"><div lang="en" className="flex flex-wrap justify-between gap-3 text-2xl text-slate-950"><span className="font-bold">{example.word}</span><span>/{example.ipa}/</span></div><a href={`https://dictionary.cambridge.org/pronunciation/english/${example.word}`} className="mt-3 inline-block text-sm text-blue-700 underline">{example.word} の辞書・音声を開く ↗</a></li>)}</ul>
        </section>
      </div>
      <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-7">
        <h2 className="text-xl font-bold text-slate-950">似た音と比べる</h2>
        <p className="mt-3 leading-7 text-slate-600">/{sound.symbol}/ と /{comparison.symbol}/ の口・舌・息の使い方を比べ、どこが変わるかを説明してみましょう。</p>
        <Link href={`/learn/${comparison.slug}`} className="mt-4 inline-block rounded-xl border border-blue-200 px-5 py-3 font-bold text-blue-700 hover:underline">/{comparison.symbol}/ {comparison.name} を学ぶ →</Link>
      </section>
      <nav aria-label="学習項目の移動" className="mt-8 grid gap-3 sm:grid-cols-3">
        {previous ? <Link href={`/learn/${previous.slug}`} className="rounded-xl border border-slate-200 bg-white p-4 text-center font-bold text-blue-700 hover:underline">← 前の音 /{previous.symbol}/</Link> : <Link href="/learn" className="rounded-xl border border-slate-200 bg-white p-4 text-center font-bold text-blue-700 hover:underline">← 一覧から選ぶ</Link>}
        <Link href={`/learn#${sound.group}`} className="rounded-xl border border-slate-200 bg-white p-4 text-center font-bold text-blue-700 hover:underline">{group.title}の一覧</Link>
        {next ? <Link href={`/learn/${next.slug}`} className="rounded-xl border border-slate-200 bg-white p-4 text-center font-bold text-blue-700 hover:underline">次の音 /{next.symbol}/ →</Link> : <Link href="/learn" className="rounded-xl border border-slate-200 bg-white p-4 text-center font-bold text-blue-700 hover:underline">全ての発音記号を復習 →</Link>}
      </nav>
      <p className="mt-7 text-sm text-slate-500"><Link href="/learn#notation" className="underline">表記の違い・強勢記号・会話での音の変化について</Link></p>
    </main>
  );
}
