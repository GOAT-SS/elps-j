'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { type AnalysisResult, type HistoryEntry } from './analysis';
import { HISTORY_LIMIT, HISTORY_STORAGE_KEY, PREVIOUS_STORAGE_KEY, LEGACY_STORAGE_KEY, parseHistory } from './history';

export function usePracticeHistory() {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [storageMessage, setStorageMessage] = useState<string | null>(null);
  const entries = useRef<HistoryEntry[]>([]);
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const saved = localStorage.getItem(HISTORY_STORAGE_KEY) ?? localStorage.getItem(PREVIOUS_STORAGE_KEY) ?? localStorage.getItem(LEGACY_STORAGE_KEY);
        const parsed = parseHistory(saved);
        entries.current = parsed;
        setHistory(parsed);
        if (saved && JSON.stringify(JSON.parse(saved)) !== JSON.stringify(parsed)) {
          setStorageMessage('過去の履歴を読み込みました。以前の候補に基づく構成要素は参考データとしてJSON出力に残し、今回の推定音に基づく比較には使用しません。履歴は読み取れる最新200件です。');
        }
      } catch { setStorageMessage('このブラウザーでは履歴を読み込めませんでした。録音練習は続けられます。'); }
    }, 0);
    return () => clearTimeout(timer);
  }, []);
  const addResult = useCallback((result: AnalysisResult) => {
    const next = [{ ...result, id: crypto.randomUUID(), recordedAt: new Date().toISOString() }, ...entries.current].slice(0, HISTORY_LIMIT);
    entries.current = next;
    setHistory(next);
    try { localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(next)); }
    catch { setStorageMessage('履歴を保存できませんでした。この画面を開いている間は結果を確認できます。'); }
  }, []);
  const clearHistory = useCallback(() => {
    entries.current = []; setHistory([]);
    try { localStorage.removeItem(HISTORY_STORAGE_KEY); localStorage.removeItem(PREVIOUS_STORAGE_KEY); localStorage.removeItem(LEGACY_STORAGE_KEY); setStorageMessage(null); }
    catch { setStorageMessage('ブラウザー内の履歴を削除できませんでした。'); }
  }, []);
  return { history, storageMessage, addResult, clearHistory };
}
