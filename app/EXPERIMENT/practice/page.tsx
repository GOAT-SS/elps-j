import Link from "next/link";
import RecordingPractice from "./RecordingPractice";

// 評価実験用の発音練習ページ。表示と録音操作を別の部品に分けます。
export default function ExperimentPracticePage() {
  // constは、表示に使う値に名前を付ける宣言です。
  const targetSound = "æ";
  const practiceWord = "cap";
  const wordIPA = "kæp";

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-12">
      <h1 className="text-3xl font-bold">発音練習</h1>
      <p className="mt-4 leading-7">
        対象の音を意識して、単語全体を発音してみましょう。
      </p>

      <section
        aria-labelledby="practice-target"
        className="mt-8 rounded-2xl border border-slate-300 bg-white p-6"
      >
        <h2 id="practice-target" className="text-lg font-bold">
          今回の練習
        </h2>
        {/* JSXでは、波括弧の中に変数を書くと、その値を表示できます。 */}
        <p className="mt-4">
          対象の音：<span lang="en">/{targetSound}/</span>
        </p>
        <p lang="en" className="mt-3 text-4xl font-bold">
          {practiceWord}
        </p>
        <p lang="en" className="mt-2 text-xl">/{wordIPA}/</p>
      </section>

      <RecordingPractice key={practiceWord} word={practiceWord} soundSlug="ae" />

      <Link
        href="/EXPERIMENT/Evaluate2"
        className="mt-8 inline-block py-3 font-bold text-blue-700 underline"
      >
        学習の流れに戻る
      </Link>
    </main>
  );
}
