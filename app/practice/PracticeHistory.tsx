'use client';
import type { HistoryEntry } from './analysis';
import { downloadFile, historyCsv } from './history';
export default function PracticeHistory({ history, message, onClear }: { history: HistoryEntry[]; message: string | null; onClear: () => void }) {
  return <details className="mt-8 rounded-2xl border border-slate-200 bg-white p-5">
    <summary className="cursor-pointer font-bold">録音結果の履歴・データ出力（{history.length}件）</summary>
    <p className="mt-4 text-sm text-slate-500">このブラウザーに最新200件の解析結果を保存します。録音音声は保存しません。</p>
    {message && <p className="mt-3 text-sm text-amber-900" role="status">{message}</p>}
    <div className="mt-4 flex flex-wrap gap-3">
      <button type="button" disabled={!history.length} onClick={() => downloadFile('pronunciation-history.json', JSON.stringify(history, null, 2), 'application/json')} className="rounded-xl border border-slate-300 px-4 py-2 disabled:opacity-40">JSON出力</button>
      <button type="button" disabled={!history.length} onClick={() => downloadFile('pronunciation-history.csv', historyCsv(history), 'text/csv;charset=utf-8')} className="rounded-xl border border-slate-300 px-4 py-2 disabled:opacity-40">CSV出力</button>
      <button type="button" disabled={!history.length} onClick={onClear} className="rounded-xl border border-slate-300 px-4 py-2 disabled:opacity-40">履歴を削除</button>
    </div>
    {!history.length ? <p className="mt-4">録音結果はまだありません。</p> : <div className="mt-5 overflow-x-auto"><table className="w-full border-collapse text-left text-sm">
      <thead><tr>{['日時', '対象の音', '単語', '認識IPA', '状態'].map(label => <th key={label} scope="col" className="border border-slate-300 p-3">{label}</th>)}</tr></thead>
      <tbody>{history.map(entry => <tr key={entry.id}>
        <td className="border border-slate-300 p-3">{new Date(entry.recordedAt).toLocaleString('ja-JP')}</td>
        <td lang="en" className="border border-slate-300 p-3">/{entry.targetSound}/</td>
        <td lang="en" className="border border-slate-300 p-3">{entry.targetWord}</td>
        <td lang="en" className="border border-slate-300 p-3">{entry.observedIPA || '未認識'}</td>
        <td className="border border-slate-300 p-3">{entry.scoreConfidenceStatus === 'clear' ? '候補の差が明確' : entry.scoreConfidenceStatus === 'not_provided' ? '参考（確かさ未提供）' : entry.scoreConfidenceStatus === 'ambiguous' ? '判定保留' : '再録音'}</td>
      </tr>)}</tbody>
    </table></div>}
  </details>;
}
