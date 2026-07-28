import Link from "next/link";
import ipaData from "../backend/data/ipa_features.json";

const componentLabels = {
  height: "舌の高さ",
  backness: "舌の前後",
  rounding: "唇の丸め",
  tenseness: "緊張性",
} as const;

const valueLabels: Record<string, string> = {
  high: "高い",
  mid: "中間",
  low: "低い",
  front: "前",
  central: "中央",
  back: "後ろ",
  rounded: "円唇",
  unrounded: "非円唇",
  tense: "緊張",
  lax: "弛緩",
  neutral: "中立",
  unspecified: "未指定",
};

const vowelGuides = [
  {
    symbol: "æ",
    words: "cap / hat / stack",
    cue: "口を横にも縦にも開き、舌を前方の低い位置に置く意識。",
    mouth: "h-10 w-20",
    position: { left: "21%", top: "68%" },
  },
  {
    symbol: "ʌ",
    words: "cup / hut / stuck",
    cue: "力を入れすぎず、舌を中央付近に置いて短く発音する意識。",
    mouth: "h-8 w-16",
    position: { left: "50%", top: "46%" },
  },
  {
    symbol: "ɑ",
    words: "cop / hot / stock",
    cue: "口を大きく開き、舌を後方の低い位置に置く意識。",
    mouth: "h-12 w-16",
    position: { left: "78%", top: "68%" },
  },
] as const;

export default function LearnPage() {
  return (
    <main className="flex-1">
      <section className="border-b border-blue-100 bg-blue-50">
        <div className="mx-auto w-full max-w-6xl px-5 py-12 sm:px-8 sm:py-16">
          <p
            lang="en"
            className="text-sm font-bold tracking-[0.14em] text-blue-700"
          >
            STEP 1
          </p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight text-slate-950">
            発音知識学習
          </h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-700">
            母音は、舌の高さ・舌の前後・唇の丸め・緊張性などの組み合わせで整理できます。
            まずは練習対象の /æ/・/ʌ/・/ɑ/ を比べます。
          </p>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-6xl gap-8 px-5 py-12 sm:px-8 lg:grid-cols-[0.9fr_1.1fr]">
        <div>
          <p className="text-sm font-bold text-blue-700">舌の位置のイメージ</p>
          <h2 className="mt-2 text-2xl font-bold">前後と高さを比べる</h2>
          <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex justify-between text-xs font-semibold text-slate-500">
              <span>前</span>
              <span>舌の位置</span>
              <span>後ろ</span>
            </div>
            <div className="relative mt-3 h-72 overflow-hidden rounded-[3rem_7rem_4rem_6rem] border-2 border-slate-200 bg-gradient-to-b from-blue-50 to-rose-50">
              <span className="absolute left-3 top-3 text-xs font-semibold text-slate-500">
                高い
              </span>
              <span className="absolute bottom-3 left-3 text-xs font-semibold text-slate-500">
                低い
              </span>
              <div className="absolute inset-x-8 top-1/2 border-t border-dashed border-slate-300" />
              <div className="absolute inset-y-8 left-1/2 border-l border-dashed border-slate-300" />
              {vowelGuides.map((vowel) => (
                <span
                  key={vowel.symbol}
                  lang="en"
                  className="absolute flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-blue-700 text-xl font-bold text-white shadow-lg"
                  style={vowel.position}
                >
                  {vowel.symbol}
                </span>
              ))}
            </div>
            <p className="mt-4 text-xs leading-5 text-slate-500">
              この図は位置関係を理解するための模式図です。実際の舌の位置や音価は話者・方言によって変わります。
            </p>
          </div>
        </div>

        <div>
          <p className="text-sm font-bold text-blue-700">発音の目安</p>
          <h2 className="mt-2 text-2xl font-bold">3つの母音を見比べる</h2>
          <div className="mt-6 space-y-4">
            {vowelGuides.map((vowel) => {
              const features = ipaData.phonemes[vowel.symbol].features;

              return (
                <article
                  key={vowel.symbol}
                  className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
                >
                  <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                    <div className="flex min-w-28 flex-col items-center rounded-2xl bg-slate-950 px-5 py-4 text-white">
                      <span lang="en" className="text-4xl font-bold">
                        /{vowel.symbol}/
                      </span>
                      <span
                        role="img"
                        aria-label={`口の開き方の目安：${vowel.symbol}`}
                        className={`mt-3 rounded-[50%] border-4 border-rose-300 bg-rose-950 ${vowel.mouth}`}
                      />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-slate-950">
                        例：<span lang="en">{vowel.words}</span>
                      </p>
                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        {vowel.cue}
                      </p>
                      <dl className="mt-4 grid grid-cols-2 gap-2 text-sm">
                        {Object.entries(features).map(([key, value]) => (
                          <div
                            key={key}
                            className="rounded-xl bg-slate-100 px-3 py-2"
                          >
                            <dt className="text-xs text-slate-500">
                              {componentLabels[
                                key as keyof typeof componentLabels
                              ] ?? key}
                            </dt>
                            <dd className="mt-1 font-bold text-slate-900">
                              {valueLabels[value] ?? value}
                            </dd>
                          </div>
                        ))}
                      </dl>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-5 pb-14 sm:px-8">
        <div className="flex flex-col gap-4 rounded-3xl bg-slate-900 p-7 text-white sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-bold text-blue-300">理解を試す</p>
            <p className="mt-2 text-lg font-semibold">
              構成要素を自分で選んで確認できます。
            </p>
          </div>
          <Link
            href="/components"
            className="rounded-full bg-white px-5 py-3 text-center font-bold text-slate-950 transition hover:bg-blue-100"
          >
            発音構成理解を開く
          </Link>
        </div>
      </section>
    </main>
  );
}
