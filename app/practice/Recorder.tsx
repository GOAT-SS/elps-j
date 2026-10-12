'use client';
import Link from 'next/link';
import { useState } from 'react';
import { soundGroups, soundLessons, type SoundLesson } from '../data/american-english';
import AnalysisView from './AnalysisView';
import PracticeHistory from './PracticeHistory';
import { usePracticeHistory } from './usePracticeHistory';
import { useRecording } from './useRecording';

export default function Recorder({ initialSoundSlug }: { initialSoundSlug?: string }) {
  const initialSound = soundLessons.find(sound => sound.slug === initialSoundSlug) ?? soundLessons[0];
  const [sound, setSound] = useState(initialSound);
  const [word, setWord] = useState(initialSound.examples[0]);
  const { history, storageMessage, addResult, clearHistory } = usePracticeHistory();
  const recording = useRecording(word.word, sound.slug, addResult);
  const labels = { idle: '録音できます', starting: 'マイクを準備中…', recording: '録音中', uploading: '音声を解析中…', done: '解析完了', error: '再録音できます' };
  function selectSound(next: SoundLesson) {
    setSound(next); setWord(next.examples[0]); recording.reset();
  }
  return <section>
    <fieldset disabled={recording.isBusy} className="mb-8">
      <legend className="text-lg font-bold">練習する発音記号と単語を選択</legend>
      <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="発音記号の分類">
        {soundGroups.map(group => <button key={group.id} type="button" aria-pressed={sound.group === group.id} onClick={() => selectSound(soundLessons.find(item => item.group === group.id)!)} className={`min-h-12 rounded-xl border px-4 py-2 font-bold ${sound.group === group.id ? 'border-blue-700 bg-blue-700 text-white' : 'border-slate-300 bg-white text-slate-700'}`}>{group.title}</button>)}
      </div>
      <div className="mt-5 flex flex-wrap gap-2" role="group" aria-label="練習する音">
        {soundLessons.filter(item => item.group === sound.group).map(item => <button key={item.slug} type="button" aria-pressed={sound.slug === item.slug} aria-label={`/${item.symbol}/ ${item.name}`} onClick={() => selectSound(item)} className={`min-h-12 min-w-14 rounded-xl border px-3 text-lg font-bold ${sound.slug === item.slug ? 'border-blue-700 bg-blue-700 text-white' : 'border-slate-300 bg-white text-slate-900'}`}><span lang="en">/{item.symbol}/</span></button>)}
      </div>
      <p className="mt-5 font-bold">/{sound.symbol}/ {sound.name}</p>
      <div className="mt-3 flex flex-wrap gap-3" role="group" aria-label="例語">
        {sound.examples.map(example => <button key={example.word} type="button" aria-pressed={word.word === example.word} onClick={() => { setWord(example); recording.reset(); }} className={`min-h-12 rounded-xl border px-5 py-3 ${word.word === example.word ? 'border-blue-700 bg-blue-700 text-white' : 'border-slate-300 bg-white text-slate-900'}`}><span lang="en" className="block font-bold">{example.word}</span><span lang="en" className="text-sm">/{example.ipa}/</span></button>)}
      </div>
    </fieldset>
    <div className="max-w-2xl rounded-2xl border border-slate-200 bg-white p-6">
      <p className="text-sm text-slate-500">対象の音 <span lang="en">/{sound.symbol}/</span> を意識して、単語全体を発音します。</p>
      <p lang="en" className="mt-3 text-3xl font-bold">{word.word} <span className="text-xl font-normal text-slate-500">/{word.ipa}/</span></p>
      <button type="button" onClick={recording.status === 'recording' ? recording.stop : recording.start} disabled={recording.status === 'starting' || recording.status === 'uploading'} className={`mt-5 min-h-16 w-full rounded-xl px-6 py-4 text-lg font-bold text-white disabled:opacity-50 ${recording.status === 'recording' ? 'bg-red-600' : 'bg-blue-700'}`}>{recording.status === 'recording' ? '録音を停止して解析' : recording.status === 'uploading' ? '音声を解析中…' : recording.status === 'starting' ? 'マイクを準備中…' : '録音を開始'}</button>
      {recording.status === 'uploading' && <button type="button" onClick={recording.cancel} className="mt-3 min-h-11 rounded-xl border border-slate-300 px-4 py-2">判定を中止</button>}
      <div className="mt-4" role="status" aria-live="polite"><p className="font-bold">{labels[recording.status]}</p><p className="mt-2 text-sm leading-6 text-slate-600">{recording.error ?? '静かな場所で録音してください。15秒で自動停止します。初回の解析にはモデルの読み込み時間がかかります。'}</p></div>
      <Link href={`/learn/${sound.slug}`} className="mt-4 inline-block text-sm font-bold text-blue-700 underline">/{sound.symbol}/ の口と舌の使い方を確認する</Link>
    </div>
    {recording.audioUrl && <div className="mt-5 max-w-2xl"><p className="mb-2 font-bold">録音した音声</p><audio controls src={recording.audioUrl} className="w-full" /></div>}
    {recording.result && <AnalysisView result={recording.result} previous={history.filter(entry => entry.soundSlug === sound.slug && entry.targetWord === word.word)[1]} onRetry={recording.start} isBusy={recording.isBusy} isPreviousResult={recording.status !== 'done'} />}
    <PracticeHistory history={history} message={storageMessage} onClear={clearHistory} />
  </section>;
}
