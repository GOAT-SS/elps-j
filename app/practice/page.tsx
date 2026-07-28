import Recorder from './Recorder'

export default function PracticePage() {
  return (
    <main className="flex-1">
      <section className="border-b border-violet-100 bg-violet-50">
        <div className="mx-auto w-full max-w-6xl px-5 py-12 sm:px-8 sm:py-16">
          <p
            lang="en"
            className="text-sm font-bold tracking-[0.14em] text-violet-700"
          >
            STEP 3
          </p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight text-slate-950">
            発音練習
          </h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-700">
            ミニマルペアから単語を選んで発音します。判定結果では、
            候補となる母音の相対スコアと構成要素の違いを確認できます。
          </p>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-500">
            音声AIの結果は正解確率ではなく、練習候補の中での相対的な近さです。
            一度の結果だけで発音の良し悪しを断定するものではありません。
          </p>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-5 py-12 sm:px-8">
        <Recorder />
      </section>
    </main>
  )
}
