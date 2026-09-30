import Link from "next/link";
import { soundGroups, soundLessons } from "../data/american-english";

export default function LearnPage() {
  return (
    <main className="flex-1">
      <section className="border-b border-blue-100 bg-blue-50">
        <div className="mx-auto max-w-6xl px-5 py-12 sm:px-8 sm:py-16">
          <p lang="en" className="text-sm font-bold tracking-widest text-blue-700">STEP 1 · GENERAL AMERICAN</p>
          <h1 className="mt-3 text-4xl font-bold text-slate-950">発音知識学習</h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-700">アメリカ英語の発音記号を、ひとつずつ。記号を選んで、口と舌の使い方・例語・似た音との違いを学びましょう。</p>
          <p className="mt-4 text-sm leading-7 text-slate-600">一般的なアメリカ英語（General American）を基準に、母音17項目・子音24項目を扱います。弱母音やR音性母音を個別に数えた学習用の分類です。音素の数え方や発音には辞書・地域による違いがあります。</p>
          <nav aria-label="発音記号の分類" className="mt-7 flex flex-wrap gap-3">
            {soundGroups.map((group) => <a key={group.id} href={`#${group.id}`} className="rounded-full border border-blue-200 bg-white px-4 py-2 font-semibold text-blue-700 hover:underline">{group.title} · {soundLessons.filter((sound) => sound.group === group.id).length}</a>)}
            <a href="#notation" className="rounded-full border border-blue-200 bg-white px-4 py-2 font-semibold text-blue-700 hover:underline">表記と音の変化</a>
          </nav>
        </div>
      </section>
      <div className="mx-auto max-w-6xl space-y-12 px-5 py-12 sm:px-8">
        {soundGroups.map((group) => (
          <section key={group.id} id={group.id} className="scroll-mt-6" aria-labelledby={`${group.id}-title`}>
            <h2 id={`${group.id}-title`} className="text-2xl font-bold text-slate-950">{group.title}</h2>
            <p className="mt-2 text-slate-600">{group.description}</p>
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {soundLessons.filter((sound) => sound.group === group.id).map((sound) => (
                <Link key={sound.slug} href={`/learn/${sound.slug}`} className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-700 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-700">
                  <span lang="en" className="block text-4xl font-bold text-blue-700">/{sound.symbol}/</span>
                  <span lang="en" className="mt-3 block text-lg text-slate-950">{sound.examples.map((example) => example.word).join(" / ")}</span>
                  <span className="mt-2 block text-xs leading-5 text-slate-500">{sound.name}</span>
                  <span className="mt-4 block text-sm font-bold text-blue-700 group-hover:underline">この音を学ぶ →</span>
                </Link>
              ))}
            </div>
          </section>
        ))}
        <section id="notation" className="scroll-mt-6 rounded-3xl border border-slate-200 bg-white p-6 sm:p-8">
          <h2 className="text-2xl font-bold text-slate-950">発音記号の読み方と、会話での音の変化</h2>
          <p className="mt-3 leading-7 text-slate-600">/ / は語の音を区別するための表記、[ ] は実際の音の詳しい表記に使います。以下は独立した基本音の追加ではなく、読み方の記号や音の変化です。</p>
          <dl className="mt-6 grid gap-6 sm:grid-cols-2">
            {[
              ["ˈ・ˌ・.", "ˈ は主強勢、ˌ は副強勢で、強く読む音節の前につきます。. は音節の区切りです。例：about /əˈbaʊt/。"],
              ["ː と辞書の表記", "ː は長さの記号です。本教材では /i, u, ɑ, ɔ/ と書きますが、/iː, uː, ɑː, ɔː/ とする辞書もあります。/ɛ/ を /e/、/ɝ/ を /ɜr/、/ɚ/ を /ər/ と書く場合もあります。"],
              ["[ɾ]：はじき音", "water や city などの /t/、ladder などの /d/ は、強勢のある母音の後・強勢のない母音の前などで、舌先を歯茎に一瞬当てる音になることがあります。"],
              ["[ʔ]：声門閉鎖音", "button などで /t/ が喉で息を一瞬止める音になったり、その閉鎖を伴ったりすることがあります。現れ方には話者や発話スタイルによる違いがあります。"],
              ["[ɫ]・[l̩]・[n̩]", "[ɫ] は舌の奥も持ち上げた暗いLです。[l̩]・[n̩] の下の印は、子音だけで音節の中心になることを示します。little や button の語末などで現れます。"],
              ["[pʰ, tʰ, kʰ]：息の強い破裂音", "ʰ は息を伴うことを示します。強勢のある音節の先頭の /p, t, k/ などで現れ、spin・stay・sky の /s/ 直後では通常その息が弱くなります。"],
              ["母音＋ /r/", "car /kɑr/、door /dɔr/、near /nɪr/、care /kɛr/ のような組み合わせもあります。アメリカ英語では語末のRも発音します。まず母音と /r/ の各ページで形を学び、続けて発音します。"],
              ["イギリス英語との違い", "イギリス英語の表記に見られる /ɒ, əʊ, ɪə, eə, ʊə/ は、この教材では独立した基本項目にしていません。米語では語に応じて /ɑ, oʊ/ や母音＋ /r/ などを用います。"],
            ].map(([title, body]) => <div key={title}><dt className="font-bold text-slate-950">{title}</dt><dd className="mt-2 text-sm leading-7 text-slate-600">{body}</dd></div>)}
          </dl>
          <p className="mt-7 text-sm leading-7 text-slate-500">表記の参考：<a href="https://dictionary.cambridge.org/help/phonetics.html" className="text-blue-700 underline">Cambridge Dictionary 発音記号ガイド</a>、<a href="https://www.oxfordlearnersdictionaries.com/us/about/pronunciation_american_english.html" className="text-blue-700 underline">Oxford アメリカ英語発音ガイド</a>。例語の音声を辞書で確認するときは US（米語）を選んでください。</p>
        </section>
        <aside className="rounded-3xl bg-blue-50 p-7">
          <h2 className="text-xl font-bold text-slate-950">学んだ知識を使ってみる</h2>
          <p className="mt-3 leading-7 text-slate-600">発音構成理解や録音練習にも進めます。各STEPの演習対象は、その画面に表示される音です。</p>
          <div className="mt-4 flex flex-wrap gap-5 font-bold text-blue-700"><Link href="/components" className="underline">発音構成理解へ →</Link><Link href="/practice" className="underline">発音練習へ →</Link></div>
        </aside>
      </div>
    </main>
  );
}
