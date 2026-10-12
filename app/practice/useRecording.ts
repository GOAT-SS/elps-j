'use client';
import { useEffect, useRef, useState } from 'react';
import { requestAnalysis, type AnalysisResult } from './analysis';
import { recordingToWav } from './audio';
export type RecordingStatus = 'idle' | 'starting' | 'recording' | 'uploading' | 'done' | 'error';
const MAX_RECORDING_MS = 15_000;
const REQUEST_TIMEOUT_MS = 105_000;

export function useRecording(word: string, soundSlug: string, onResult: (result: AnalysisResult) => void) {
  const [status, setStatus] = useState<RecordingStatus>('idle');
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const mounted = useRef(false);
  const busy = useRef(false);
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const controller = useRef<AbortController | null>(null);
  const stopTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onResultRef = useRef(onResult);
  useEffect(() => { onResultRef.current = onResult; }, [onResult]);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (stopTimer.current) clearTimeout(stopTimer.current);
      if (requestTimer.current) clearTimeout(requestTimer.current);
      controller.current?.abort();
      if (recorder.current) {
        recorder.current.onstop = null;
        recorder.current.onerror = null;
        recorder.current.ondataavailable = null;
        if (recorder.current.state !== 'inactive') recorder.current.stop();
      }
      stream.current?.getTracks().forEach(track => track.stop());
    };
  }, []);
  useEffect(() => () => { if (audioUrl) URL.revokeObjectURL(audioUrl); }, [audioUrl]);

  function stop() {
    if (stopTimer.current) clearTimeout(stopTimer.current);
    if (recorder.current?.state === 'recording') {
      setStatus('uploading');
      recorder.current.stop();
    }
  }
  function reset() {
    if (busy.current) return;
    setResult(null); setError(null); setAudioUrl(null); setStatus('idle');
  }
  async function start() {
    if (busy.current) return;
    busy.current = true;
    // Retain the last feedback as a reference while the learner re-pronounces.
    setStatus('starting'); setError(null); setAudioUrl(null);
    try {
      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') throw new Error('このブラウザーでは録音を利用できません。マイクの権限と接続方法を確認してください。');
      const acquired = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!mounted.current) { acquired.getTracks().forEach(track => track.stop()); busy.current = false; return; }
      stream.current = acquired;
      const mediaRecorder = new MediaRecorder(acquired);
      recorder.current = mediaRecorder;
      const chunks: Blob[] = [];
      let byteCount = 0;
      mediaRecorder.ondataavailable = event => {
        if (event.data.size) { chunks.push(event.data); byteCount += event.data.size; }
        if (byteCount > 3_900_000) stop();
      };
      mediaRecorder.onerror = () => {
        if (stopTimer.current) clearTimeout(stopTimer.current);
        mediaRecorder.onstop = null;
        acquired.getTracks().forEach(track => track.stop());
        busy.current = false;
        if (mounted.current) { setError('録音が中断されました。もう一度録音してください。'); setStatus('error'); }
      };
      mediaRecorder.onstop = async () => {
        if (stopTimer.current) clearTimeout(stopTimer.current);
        acquired.getTracks().forEach(track => track.stop());
        if (!mounted.current) return;
        setStatus('uploading');
        const audio = new Blob(chunks, { type: mediaRecorder.mimeType });
        setAudioUrl(URL.createObjectURL(audio));
        const abortController = new AbortController();
        controller.current = abortController;
        requestTimer.current = setTimeout(() => abortController.abort(), REQUEST_TIMEOUT_MS);
        try {
          if (audio.size === 0) throw new Error('録音データが空です。もう一度録音してください。');
          if (audio.size > 3_900_000) throw new Error('録音データが大きすぎます。短く録音してください。');
          const wav = await recordingToWav(audio);
          // Cancellation or leaving the page during local decoding must not upload.
          if (!mounted.current || abortController.signal.aborted) throw new DOMException('Aborted', 'AbortError');
          const analysis = await requestAnalysis(wav, word, soundSlug, abortController.signal);
          if (mounted.current) { setResult(analysis); onResultRef.current(analysis); setStatus('done'); }
        } catch (failure) {
          if (mounted.current) {
            setError(abortController.signal.aborted ? '解析を中止しました。もう一度録音できます。' : failure instanceof Error ? failure.message : '音声を解析できませんでした。もう一度お試しください。');
            setStatus('error');
          }
        } finally {
          if (requestTimer.current) clearTimeout(requestTimer.current);
          controller.current = null; busy.current = false;
        }
      };
      mediaRecorder.start(250);
      setStatus('recording');
      stopTimer.current = setTimeout(stop, MAX_RECORDING_MS);
    } catch (failure) {
      stream.current?.getTracks().forEach(track => track.stop());
      busy.current = false;
      if (mounted.current) { setError(failure instanceof Error && failure.name !== 'NotAllowedError' ? failure.message : 'マイクを利用できません。ブラウザーの権限を確認してください。'); setStatus('error'); }
    }
  }
  return { status, result, error, audioUrl, start, stop, reset, cancel: () => controller.current?.abort(), isBusy: ['starting','recording','uploading'].includes(status) };
}
