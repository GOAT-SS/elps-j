import Link from 'next/link';
import type { AnalysisResult, ComponentComparison } from './analysis';
import { componentAdvice, componentLabel, featureLabel, feedbackGroups, compareAttempts } from './feedback';

const stateLabels = { clear: '推定音と候補比較が一致', ambiguous: '判定保留・参考フィードバック', not_provided: '確かさの数値なし・参考フィードバック', not_evaluable: '対象音を特定できませんでした' };

function Guidance({ title, items, empty, change = false }: { title: string; items: ComponentComparison[]; empty: string; change?: boolean }) {
  return <section className={`rounded-xl p-5 ${change ? 'bg-amber-50' : 'bg-blue-50'}`}>
    <h3 className="font-bold">{title}</h3>
    {items.length ? <ul className="mt-3 space-y-4 text-sm leading-7">{items.map(item => <li key={item.component}>
      <p className="font-bold">{componentLabel(item.component)}</p>
      <p>{componentAdvice(item)}</p>
    </li>)}</ul> : <p className="mt-3 text-sm leading-7">{empty}</p>}
  </section>;
}

export default function AnalysisView({ result, previous, onRetry, isBusy, isPreviousResult }: {
  result: AnalysisResult; previous?: AnalysisResult; onRetry: () => void; isBusy: boolean; isPreviousResult: boolean;
}) {
  const groups = feedbackGroups(result);
  const attempt = compareAttempts(result, previous);
  const hasFeedback = result.soundComponentAnalysis !== null;
  return (
    <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6" aria-labelledby="analysis-title">
      <h2 id="analysis-title" className="text-xl font-bold">構成要素に基づく発音フィードバック</h2>
      {isPreviousResult && <p className="mt-3 rounded-xl bg-slate-100 p-3 text-sm leading-6" role="status">直前の解析結果です。今回の録音はまだ解析されていません。</p>}
      <p className="mt-3 leading-7" role="status">{result.message}</p>
      <dl className="mt-5 grid grid-cols-[auto_1fr] gap-x-5 gap-y-3 text-sm">
        <dt className="font-bold">練習対象</dt><dd lang="en">{result.targetWord}</dd>
        <dt className="font-bold">目標音</dt><dd lang="en">/{result.targetSound}/</dd>
        <dt className="font-bold">推定音</dt><dd>{result.observedSound ? <span lang="en">/{result.observedSound}/</span> : '特定できませんでした'}</dd>
        <dt className="font-bold">状態</dt><dd>{stateLabels[result.scoreConfidenceStatus]}</dd>
      </dl>
      {hasFeedback && <>
        <p className="mt-5 text-sm leading-7 text-slate-600">推定音を教材の構成要素に対応づけて比較しています。口や舌を直接計測した結果ではありません。知識学習・構成理解と同じ項目を使い、次の発音で意識する点を確認しましょう。</p>
        {['ambiguous', 'not_provided'].includes(result.scoreConfidenceStatus) && <p className="mt-3 rounded-xl bg-amber-50 p-4 text-sm leading-7 text-amber-950">推定音が正しい場合の参考です。録音を聞いて違和感があるときは、この指示だけで発音を変えず、もう一度録音してください。</p>}
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <Guidance title="変更する要素（差）" items={groups.change} empty="比較できた構成要素に差はありません。共通する要素を意識して、同じ単語をもう一度発音してみましょう。" change />
          <Guidance title="維持する要素（共通）" items={groups.maintain} empty="比較できた構成要素に共通するものはありません。目標の構成要素を一つずつ確認しましょう。" />
        </div>
        {!!groups.unknown.length && <div className="mt-4 rounded-xl bg-slate-100 p-4 text-sm leading-7">
          <h3 className="font-bold">比較できない要素</h3>
          <ul className="mt-2 space-y-2">{groups.unknown.map(item => <li key={item.component}>{componentAdvice(item)}</li>)}</ul>
        </div>}
        <div className="mt-6 overflow-x-auto">
          <h3 className="mb-3 font-bold">構成要素を比べる</h3>
          <table className="w-full border-collapse text-left text-sm">
            <thead><tr>{['構成要素', `推定音 /${result.observedSound}/`, `目標音 /${result.targetSound}/`, '次の発音'].map(label => <th key={label} scope="col" className="border border-slate-300 p-3">{label}</th>)}</tr></thead>
            <tbody>{result.soundComponentAnalysis?.map(item => <tr key={item.component} className={item.matches === false ? 'bg-amber-50' : item.matches === true ? 'bg-blue-50' : 'bg-slate-100'}>
              <th scope="row" className="border border-slate-300 p-3">{componentLabel(item.component)}</th>
              <td className="border border-slate-300 p-3">{featureLabel(item.component, item.inferred)}</td>
              <td className="border border-slate-300 p-3">{featureLabel(item.component, item.target)}</td>
              <td className="border border-slate-300 p-3">{item.matches === null ? '比較しない' : item.matches ? '維持' : '変更'}</td>
            </tr>)}</tbody>
          </table>
        </div>
      </>}
      {attempt && <div className="mt-5 rounded-xl bg-slate-100 p-4 text-sm leading-7">
        <h3 className="font-bold">前回の録音と比べる（同じ単語・対象音）</h3>
        <p>推定音 <span lang="en">/{attempt.previousSound}/ → /{attempt.currentSound}/</span> · 目標と異なる構成要素 {attempt.previousDifferences} → {attempt.currentDifferences}項目</p>
        <p className="text-slate-500">推定音の辞書上の比較です。実際の調音の変化や上達を直接測定した結果ではありません。</p>
        {(result.scoreConfidenceStatus === 'not_provided' || previous?.scoreConfidenceStatus === 'not_provided') && <p className="text-slate-500">認識の確かさの数値がないため、前回との比較も参考として確認してください。</p>}
      </div>}
      <div className="mt-6 flex flex-wrap gap-3">
        <Link href={`/learn/${result.soundSlug}`} className="rounded-xl border border-slate-300 px-4 py-3 font-bold text-blue-700 underline">目標音の構成要素を復習</Link>
        <Link href={`/components?sound=${result.soundSlug}`} className="rounded-xl border border-slate-300 px-4 py-3 font-bold text-blue-700 underline">構成要素を組み立てて確認</Link>
      </div>
      <p className="mt-5 text-sm leading-7">{hasFeedback ? groups.change.length ? '変更する要素を一つ選び、共通する要素を意識したまま発音して、次の結果と比べましょう。' : '共通する構成要素を意識して、同じ単語をもう一度発音し、次の結果と比べましょう。' : '静かな場所で、選んだ単語を区切らずに発音してみましょう。'}</p>
      <button type="button" disabled={isBusy} onClick={onRetry} className="mt-3 min-h-12 rounded-xl bg-blue-700 px-5 py-3 font-bold text-white disabled:opacity-50">同じ単語でもう一度録音</button>
      <details className="mt-6">
        <summary className="cursor-pointer font-bold text-slate-600">音素転写・候補比較の詳細</summary>
        <p className="mt-3 text-sm">目標の音素列：<span lang="en">/{result.expectedIPA}/</span> · 推定された音素列：<span lang="en">{result.observedIPA || '読み取れませんでした'}</span></p>
        <p className="mt-3 text-sm leading-6 text-slate-500">{result.scoreMeaning}</p>
        {result.soundCandidateScores.length > 0 && <>
          <p className="mt-2 text-sm text-slate-500">候補差：{result.scoreMargin?.toFixed(2) ?? '未算出'}ポイント · 暫定基準：{result.scoreMarginThreshold}ポイント以上</p>
          <p className="mt-2 text-sm leading-6 text-slate-500">候補スコアは推定の確かさを確認する補助情報です。構成要素の比較には、スコア1位の候補ではなく転写された推定音を使います。</p>
        </>}
        {result.soundCandidateScores.length === 0 ? <p className="mt-3 text-sm">候補スコア・確かさの数値はありません。推定された音素列を参考に確認してください。</p> :
          <ul className="mt-4 space-y-2">{result.soundCandidateScores.map(candidate => <li key={candidate.slug} className="flex justify-between gap-3 border-b border-slate-200 py-2 text-sm"><span lang="en">/{candidate.sound}/ · {candidate.candidateIPA}</span><span>{candidate.relativeScorePercent.toFixed(2)}%</span></li>)}</ul>}
      </details>
    </section>
  );
}
