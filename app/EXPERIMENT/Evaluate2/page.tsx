import Link from "next/link";
//リンク飛べるようにするやつ「

export default
function
Evaluate2Page() {
  return (
    <main>
      <h1>学習の進め方</h1>

      <p>これから、次の順番で学習します。</p>

      <ol>
        <li>発音の知識を学ぶ</li>
        <li>発音の構成要素を組み立てる</li>
        <li>録音して発音を練習する</li>
      </ol>

      <p>
        <Link href="/EXPERIMENT/practice">
          発音練習へ
        </Link>
      </p>

      <Link href="/EXPERIMENT/Evaluate1">
        前のページへ
      </Link>
    </main>
  );
}
