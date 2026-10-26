"use client";

import { useState } from "react";
import AnalysisView from "../../practice/AnalysisView";
import type { AnalysisResult } from "../../practice/analysis";
import { useRecording } from "../../practice/useRecording";

type RecordingPracticeProps = {
  word: string;
  soundSlug: string;
};

export default function RecordingPractice({ word, soundSlug }: RecordingPracticeProps) {
  // この画面を開いている間、今回と前回の結果を覚えます。
  const [attempts, setAttempts] = useState<AnalysisResult[]>([]);

  function rememberResult(result: AnalysisResult) {
    setAttempts((previous) => [result, ...previous].slice(0, 2));
  }

  // 録音・WAV変換・API送信は、既存のHookに任せます。
  const recording = useRecording(word, soundSlug, rememberResult);
  const isRecording = recording.status === "recording";
  const isWaiting = recording.status === "starting" || recording.status === "uploading";
  const messages = {
    idle: "録音できます。マイクの利用を許可してください。",
    starting: "マイクを準備しています…",
    recording: "録音中です。単語を発音したら停止してください。",
    uploading: "音声を解析しています…",
    done: "解析が完了しました。下の結果を確認しましょう。",
    error: "もう一度録音できます。",
  };

  return (
    <section className="mt-6" aria-label="録音と発音の解析">
      <p className="text-sm leading-7">静かな場所で録音してください。15秒で自動停止します。</p>
      {/* onClickには、クリック時に実行する関数を渡します。 */}
      <button
        type="button"
        onClick={isRecording ? recording.stop : recording.start}
        disabled={isWaiting}
        className={`mt-4 min-h-14 w-full rounded-xl px-5 py-4 font-bold text-white disabled:opacity-50 ${isRecording ? "bg-red-600" : "bg-blue-700"}`}
      >
        {isRecording ? "録音を停止して解析" : isWaiting ? "処理中…" : "録音を開始"}
      </button>
      {recording.status === "uploading" ? (
        <button type="button" onClick={recording.cancel} className="mt-3 min-h-11 rounded-xl border border-slate-300 px-4 py-2">
          解析を中止
        </button>
      ) : null}
      <p role="status" className="mt-4 leading-7">
        {recording.error ?? messages[recording.status]}
      </p>

      {recording.audioUrl ? (
        <div className="mt-5">
          <p id="recording-playback-label" className="mb-2 font-bold">録音を聞く</p>
          <audio controls src={recording.audioUrl} aria-labelledby="recording-playback-label" className="w-full" />
        </div>
      ) : null}

      {recording.result ? (
        <AnalysisView
          result={recording.result}
          previous={attempts[1]}
          onRetry={recording.start}
          isBusy={recording.isBusy}
          isPreviousResult={recording.status !== "done"}
        />
      ) : null}
    </section>
  );
}
