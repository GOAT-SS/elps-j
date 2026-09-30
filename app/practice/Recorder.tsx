'use client'

import { useEffect, useRef, useState } from 'react'
import {
  soundGroups,
  soundLessons,
  type SoundGroup,
} from '../data/american-english'
import practiceConfig from '../data/practice_words.json'

type Status = 'idle' | 'recording' | 'uploading' | 'done' | 'error'

type VowelCandidateScore = {
  vowel: string
  candidateIPA: string
  relativeScorePercent: number
}

type VowelComponentComparison = {
  component: string
  target: string | null
  bestCandidate: string | null
  matches: boolean | null
}

type VowelComponentAnalysis = {
  basis: 'best_candidate_vowel'
  directMeasurement: false
  target: {
    ipa: string
    features: Record<string, string>
  }
  bestCandidate: {
    ipa: string
    features: Record<string, string>
  }
  comparison: VowelComponentComparison[]
}

type AnalysisResult = {
  observedIPA: string
  targetWord: string
  expectedIPA: string
  targetVowel: string
  observedVowel: string | null
  canEvaluate: boolean
  evaluationStatus: 'correct' | 'vowel_mismatch' | 'retry' | 'ambiguous'
  message: string
  vowelCandidateScores: VowelCandidateScore[]
  bestCandidateVowel: string
  scoreMargin: number
  scoreConfidenceStatus: 'clear' | 'ambiguous' | 'not_evaluable'
  scoreMarginThreshold: number
  scoreMarginThresholdStatus: 'provisional'
  scoreMeaning: string
  vowelComponentAnalysis: VowelComponentAnalysis | null
}

type PhonemeResponse = {
  phonemes: string | string[]
}

type PracticeWord = {
  word: string
  ipa: string
  soundSlug: string
  symbol: string
}

type PracticeSound = {
  slug: string
  symbol: string
  group: SoundGroup
  name: string
  examples: PracticeWord[]
}

type HistoryEntry = AnalysisResult & {
  id: string
  recordedAt: string
}

const PRACTICE_SOUNDS: PracticeSound[] = soundLessons.map((sound) => ({
  slug: sound.slug,
  symbol: sound.symbol,
  group: sound.group,
  name: sound.name,
  examples: sound.examples.map((example) => ({
    ...example,
    soundSlug: sound.slug,
    symbol: sound.symbol,
  })),
}))
const CANDIDATE_VOWELS = practiceConfig.candidateVowels
const HISTORY_STORAGE_KEY = 'elps-j:pronunciation-history:v1'

const COMPONENT_LABELS: Record<string, string> = {
  height: '舌の高さ',
  backness: '舌の前後',
  rounding: '唇の丸め',
  tenseness: '緊張性',
}

const COMPONENT_VALUE_LABELS: Record<string, string> = {
  high: '高い',
  mid: '中間',
  low: '低い',
  front: '前',
  central: '中央',
  back: '後ろ',
  rounded: '円唇',
  unrounded: '非円唇',
  tense: '緊張',
  lax: '弛緩',
  neutral: '中立',
  unspecified: '未指定',
}

function componentValueLabel(value: string | null) {
  if (value === null) {
    return 'データなし'
  }

  return COMPONENT_VALUE_LABELS[value] ?? value
}

function downloadFile(
  filename: string,
  contents: string,
  contentType: string,
) {
  const blob = new Blob([contents], { type: contentType })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')

  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

function csvCell(value: unknown) {
  const text = String(value ?? '')
  return `"${text.replaceAll('"', '""')}"`
}

function formatNumber(value: unknown, digits = 2) {
  return typeof value === 'number' && Number.isFinite(value)
    ? value.toFixed(digits)
    : 'データなし'
}

function normalizedPercentage(value: unknown) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return 0
  }

  return Math.min(100, Math.max(0, value))
}

function isPhonemeResponse(value: unknown): value is PhonemeResponse {
  if (typeof value !== 'object' || value === null || !('phonemes' in value)) {
    return false
  }

  const { phonemes } = value
  return (
    typeof phonemes === 'string'
    || (
      Array.isArray(phonemes)
      && phonemes.every((phoneme) => typeof phoneme === 'string')
    )
  )
}

function responseErrorMessage(value: unknown, status: number) {
  if (typeof value === 'object' && value !== null) {
    if ('error' in value && typeof value.error === 'string') {
      return value.error
    }

    if ('detail' in value && typeof value.detail === 'string') {
      return value.detail
    }
  }

  return `発音判定APIからHTTP ${status}が返されました。`
}

function encodePcmWav(samples: Float32Array, sampleRate: number) {
  const bytesPerSample = 2
  const buffer = new ArrayBuffer(44 + samples.length * bytesPerSample)
  const view = new DataView(buffer)

  const writeText = (offset: number, text: string) => {
    for (let index = 0; index < text.length; index += 1) {
      view.setUint8(offset + index, text.charCodeAt(index))
    }
  }

  writeText(0, 'RIFF')
  view.setUint32(4, buffer.byteLength - 8, true)
  writeText(8, 'WAVE')
  writeText(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * bytesPerSample, true)
  view.setUint16(32, bytesPerSample, true)
  view.setUint16(34, 16, true)
  writeText(36, 'data')
  view.setUint32(40, samples.length * bytesPerSample, true)

  samples.forEach((sample, index) => {
    const normalizedSample = Math.max(-1, Math.min(1, sample))
    const integerSample = normalizedSample < 0
      ? normalizedSample * 0x8000
      : normalizedSample * 0x7fff

    view.setInt16(44 + index * bytesPerSample, integerSample, true)
  })

  return new Blob([buffer], { type: 'audio/wav' })
}

async function convertToWav(audioBlob: Blob) {
  const targetSampleRate = 16_000
  const audioContext = new AudioContext()

  try {
    const decodedAudio = await audioContext.decodeAudioData(
      await audioBlob.arrayBuffer(),
    )
    const frameCount = Math.max(
      1,
      Math.ceil(decodedAudio.duration * targetSampleRate),
    )
    const offlineContext = new OfflineAudioContext(
      1,
      frameCount,
      targetSampleRate,
    )
    const source = offlineContext.createBufferSource()

    source.buffer = decodedAudio
    source.connect(offlineContext.destination)
    source.start()

    const renderedAudio = await offlineContext.startRendering()
    return encodePcmWav(
      renderedAudio.getChannelData(0),
      targetSampleRate,
    )
  } finally {
    await audioContext.close()
  }
}

export default function Recorder({
  initialSoundSlug,
}: {
  initialSoundSlug?: string
}) {
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

  const initialSound = (
    PRACTICE_SOUNDS.find((sound) => sound.slug === initialSoundSlug)
    ?? PRACTICE_SOUNDS[0]
  )
  const initialWord = initialSound.examples[0]

  const [selectedGroup, setSelectedGroup] = useState<SoundGroup>(
    initialSound.group,
  )
  const [selectedSound, setSelectedSound] = useState<PracticeSound>(initialSound)
  const [status, setStatus] = useState<Status>('idle')
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [phonemeResult, setPhonemeResult] = useState<PhonemeResponse | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [selectedWord, setSelectedWord] = useState<PracticeWord>(initialWord)

  const isBusy = status === 'recording' || status === 'uploading'
  const recordingButtonLabel = status === 'recording'
    ? '録音を停止して判定'
    : status === 'uploading'
      ? '音声を判定中…'
      : '録音を開始'
  const recordingButtonClassName = status === 'recording'
    ? 'bg-red-600 hover:bg-red-700 focus-visible:outline-red-600'
    : status === 'uploading'
      ? 'cursor-wait bg-gray-400'
      : 'bg-blue-600 hover:bg-blue-700 focus-visible:outline-blue-600'
  const statusLabel = {
    idle: '録音できます',
    recording: '録音中',
    uploading: '判定中',
    done: '判定完了',
    error: 'エラーが発生しました',
  }[status]
  const defaultStatusDescription = {
    idle: 'ボタンを押してから、選択した単語を発音してください。',
    recording: '発音が終わったら、赤い停止ボタンを押してください。',
    uploading: '音声を解析しています。そのままお待ちください。',
    done: 'もう一度練習するときは、録音開始ボタンを押してください。',
    error: 'マイクとバックエンドの接続を確認して、もう一度お試しください。',
  }[status]
  const statusDescription = status === 'error' && errorMessage !== null
    ? errorMessage
    : defaultStatusDescription
  const visibleSounds = PRACTICE_SOUNDS.filter(
    (sound) => sound.group === selectedGroup,
  )

  useEffect(() => {
    return () => {
      if (audioUrl !== null) {
        URL.revokeObjectURL(audioUrl)
      }
    }
  }, [audioUrl])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      try {
        const savedHistory = localStorage.getItem(HISTORY_STORAGE_KEY)

        if (savedHistory !== null) {
          const parsedHistory = JSON.parse(savedHistory)

          if (Array.isArray(parsedHistory)) {
            setHistory(parsedHistory as HistoryEntry[])
          }
        }
      } catch (error) {
        console.error('録音履歴を読み込めませんでした。', error)
      }
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [])

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      })

      const recorder = new MediaRecorder(stream)
      chunksRef.current = []
      setResult(null)
      setPhonemeResult(null)
      setErrorMessage(null)
      setAudioUrl(null)

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }

      recorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, {
          type: recorder.mimeType,
        })

        setAudioUrl(URL.createObjectURL(audioBlob))
        stream.getTracks().forEach((track) => track.stop())
        await uploadAudio(audioBlob)
      }

      recorderRef.current = recorder
      recorder.start()
      setStatus('recording')
    } catch (error) {
      console.error(error)
      setErrorMessage('マイクを利用できませんでした。ブラウザーの権限を確認してください。')
      setStatus('error')
    }
  }

  function stopRecording() {
    recorderRef.current?.stop()
    setStatus('uploading')
  }

  function resetRecordingResult() {
    setResult(null)
    setPhonemeResult(null)
    setErrorMessage(null)
    setAudioUrl(null)
    setStatus('idle')
  }

  function selectSound(sound: PracticeSound) {
    setSelectedSound(sound)
    setSelectedWord(sound.examples[0])
    resetRecordingResult()
  }

  function selectGroup(group: SoundGroup) {
    const firstSound = PRACTICE_SOUNDS.find((sound) => sound.group === group)

    if (firstSound === undefined) {
      return
    }

    setSelectedGroup(group)
    selectSound(firstSound)
  }

  async function uploadAudio(audioBlob: Blob) {
    try {
      const wavBlob = await convertToWav(audioBlob)
      const formData = new FormData()
      formData.append('file', wavBlob, 'recording.wav')
      formData.append('target_word', selectedWord.word)

      const response = await fetch('/api/analyze-pronunciation', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errorBody: unknown = await response.json().catch(() => null)
        throw new Error(responseErrorMessage(errorBody, response.status))
      }

      const responseBody: unknown = await response.json()

      if (isPhonemeResponse(responseBody)) {
        setPhonemeResult(responseBody)
        setResult(null)
        setStatus('done')
        return
      }

      const analysisResult = responseBody as AnalysisResult

      if (
        typeof analysisResult !== 'object'
        || analysisResult === null
        || typeof analysisResult.observedIPA !== 'string'
      ) {
        throw new Error('発音判定APIのレスポンス形式が想定と異なります。')
      }
      const historyEntry: HistoryEntry = {
        ...analysisResult,
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        recordedAt: new Date().toISOString(),
      }

      setResult(analysisResult)
      setHistory((currentHistory) => {
        const nextHistory = [historyEntry, ...currentHistory]

        try {
          localStorage.setItem(
            HISTORY_STORAGE_KEY,
            JSON.stringify(nextHistory),
          )
        } catch (error) {
          console.error('録音履歴を保存できませんでした。', error)
        }

        return nextHistory
      })
      setStatus('done')
    } catch (error) {
      console.error(error)
      setErrorMessage(
        error instanceof Error
          ? error.message
          : '発音判定中に不明なエラーが発生しました。',
      )
      setStatus('error')
    }
  }

  function exportHistoryAsJson() {
    downloadFile(
      'pronunciation-history.json',
      JSON.stringify(history, null, 2),
      'application/json;charset=utf-8',
    )
  }

  function exportHistoryAsCsv() {
    const fixedHeaders = [
      'recordedAt',
      'targetWord',
      'expectedIPA',
      'observedIPA',
      'targetVowel',
      'bestCandidateVowel',
      'canEvaluate',
      'evaluationStatus',
      'scoreConfidenceStatus',
      'scoreMargin',
      'scoreMarginThreshold',
    ]
    const scoreHeaders = CANDIDATE_VOWELS.map(
      (vowel) => `${vowel}RelativeScorePercent`,
    )
    const headers = [...fixedHeaders, ...scoreHeaders]
    const rows = history.map((entry) => {
      const fixedValues = [
        entry.recordedAt,
        entry.targetWord,
        entry.expectedIPA,
        entry.observedIPA,
        entry.targetVowel,
        entry.bestCandidateVowel,
        entry.canEvaluate,
        entry.evaluationStatus,
        entry.scoreConfidenceStatus,
        entry.scoreMargin,
        entry.scoreMarginThreshold,
      ]
      const scoreValues = CANDIDATE_VOWELS.map((vowel) => (
        entry.vowelCandidateScores.find(
          (candidate) => candidate.vowel === vowel,
        )?.relativeScorePercent ?? ''
      ))

      return [...fixedValues, ...scoreValues]
        .map(csvCell)
        .join(',')
    })
    const csv = [
      headers.map(csvCell).join(','),
      ...rows,
    ].join('\n')

    downloadFile(
      'pronunciation-history.csv',
      `\uFEFF${csv}`,
      'text/csv;charset=utf-8',
    )
  }

  return (
    <section>
      <fieldset className="mb-8" disabled={isBusy}>
        <legend className="mb-3 text-lg font-bold">
          練習する発音記号と単語を選択
        </legend>

        <div
          className="flex overflow-x-auto border-b border-slate-200"
          role="tablist"
          aria-label="発音記号の分類"
        >
          {soundGroups.map((group) => {
            const isSelected = selectedGroup === group.id

            return (
              <button
                key={group.id}
                type="button"
                role="tab"
                aria-selected={isSelected}
                onClick={() => selectGroup(group.id)}
                className={[
                  'min-h-12 shrink-0 border-b-2 px-4 py-3 font-semibold',
                  isSelected
                    ? 'border-blue-700 text-blue-700'
                    : 'border-transparent text-slate-600 hover:text-slate-950',
                ].join(' ')}
              >
                {group.title}
                <span className="ml-1 text-xs">
                  {PRACTICE_SOUNDS.filter(
                    (sound) => sound.group === group.id,
                  ).length}
                </span>
              </button>
            )
          })}
        </div>

        <div className="mt-5 grid grid-cols-5 gap-2 sm:grid-cols-8 lg:grid-cols-12">
          {visibleSounds.map((sound) => {
            const isSelected = selectedSound.slug === sound.slug

            return (
              <button
                key={sound.slug}
                type="button"
                aria-pressed={isSelected}
                aria-label={`/${sound.symbol}/ ${sound.name}`}
                onClick={() => selectSound(sound)}
                className={[
                  'aspect-square min-w-0 border text-lg font-bold',
                  'focus-visible:outline-2 focus-visible:outline-offset-2',
                  isSelected
                    ? 'border-blue-700 bg-blue-700 text-white'
                    : 'border-slate-300 bg-white text-slate-900 hover:border-blue-500',
                ].join(' ')}
              >
                <span lang="en">/{sound.symbol}/</span>
              </button>
            )
          })}
        </div>

        <div className="mt-5">
          <p className="font-bold text-slate-950">
            <span lang="en">/{selectedSound.symbol}/</span>
            <span className="ml-2">{selectedSound.name}</span>
          </p>
          <div className="mt-3 grid max-w-xl grid-cols-2 gap-2">
            {selectedSound.examples.map((practiceWord) => {
              const isSelected = (
                selectedWord.soundSlug === practiceWord.soundSlug
                && selectedWord.word === practiceWord.word
              )

              return (
                <button
                  key={`${practiceWord.soundSlug}-${practiceWord.word}`}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => {
                    setSelectedWord(practiceWord)
                    resetRecordingResult()
                  }}
                  className={[
                    'border px-3 py-3 text-center',
                    isSelected
                      ? 'border-blue-600 bg-blue-600 text-white'
                      : 'border-gray-300 bg-white text-gray-900',
                  ].join(' ')}
                >
                  <span lang="en" className="block font-bold">
                    {practiceWord.word}
                  </span>
                  <span lang="en" className="block text-sm">
                    /{practiceWord.ipa}/
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </fieldset>

      <div className="max-w-xl rounded-xl border border-gray-200 bg-gray-50 p-5">
        <p className="text-sm font-semibold text-gray-600">
          発音する単語
        </p>
        <p className="mt-1 text-3xl font-bold">
          <span lang="en" className="mr-3 text-xl text-blue-700">
            /{selectedWord.symbol}/
          </span>
          <span lang="en">{selectedWord.word}</span>
          <span lang="en" className="ml-3 text-xl font-normal text-gray-600">
            /{selectedWord.ipa}/
          </span>
        </p>

        <button
          type="button"
          onClick={status === 'recording' ? stopRecording : startRecording}
          disabled={status === 'uploading'}
          className={[
            'mt-5 flex min-h-16 w-full items-center justify-center gap-3',
            'rounded-xl px-6 py-4 text-lg font-bold text-white shadow-sm',
            'transition-colors focus-visible:outline-4 focus-visible:outline-offset-2',
            'disabled:opacity-80',
            recordingButtonClassName,
          ].join(' ')}
        >
          <span
            aria-hidden="true"
            className={[
              'inline-block h-4 w-4',
              status === 'recording'
                ? 'rounded-sm bg-white'
                : 'rounded-full bg-white',
            ].join(' ')}
          />
          {recordingButtonLabel}
        </button>

        <div
          className="mt-4 flex items-start gap-3"
          role="status"
          aria-live="polite"
        >
          <span
            aria-hidden="true"
            className={[
              'mt-1.5 inline-block h-3 w-3 shrink-0 rounded-full',
              status === 'recording'
                ? 'animate-pulse bg-red-600'
                : status === 'error'
                  ? 'bg-red-600'
                  : status === 'uploading'
                    ? 'animate-pulse bg-amber-500'
                    : 'bg-green-600',
            ].join(' ')}
          />
          <div>
            <p className="font-bold">{statusLabel}</p>
            <p className="text-sm text-gray-600">{statusDescription}</p>
          </div>
        </div>
      </div>

      {audioUrl !== null && (
        <div className="mt-5 max-w-xl">
          <p className="mb-2 font-semibold">録音した音声</p>
          <audio className="w-full" controls src={audioUrl} />
        </div>
      )}

      {phonemeResult !== null && (
        <div className="mt-6 max-w-xl rounded-lg border border-gray-200 p-5">
          <h2 className="text-xl font-bold">発音認識結果</h2>
          <dl className="mt-4 grid grid-cols-2 gap-2">
            <dt className="font-semibold">練習単語</dt>
            <dd>
              {selectedWord.word} / {selectedWord.ipa}
            </dd>
            <dt className="font-semibold">認識された音素</dt>
            <dd>
              {Array.isArray(phonemeResult.phonemes)
                ? phonemeResult.phonemes.join(' ')
                : phonemeResult.phonemes}
            </dd>
          </dl>
          <details className="mt-6">
            <summary className="cursor-pointer font-semibold">
              開発・研究用の詳細データ
            </summary>
            <pre className="mt-2 overflow-x-auto text-sm">
              {JSON.stringify(phonemeResult, null, 2)}
            </pre>
          </details>
        </div>
      )}

      {result !== null && (
        <div className="mt-6 max-w-xl rounded-lg border border-gray-200 p-5">
          <h2 className="text-xl font-bold">判定結果</h2>

          <p className="mt-2">{result.message}</p>

          <dl className="mt-4 grid grid-cols-2 gap-2">
            <dt className="font-semibold">練習単語</dt>
            <dd>
              {result.targetWord} / {result.expectedIPA}
            </dd>

            <dt className="font-semibold">読み取り結果</dt>
            <dd>{result.observedIPA || '読み取れませんでした'}</dd>

            <dt className="font-semibold">最有力候補</dt>
            <dd>/{result.bestCandidateVowel}/</dd>

            <dt className="font-semibold">1位と2位の差</dt>
            <dd>{formatNumber(result.scoreMargin)}ポイント</dd>

            <dt className="font-semibold">候補差の状態</dt>
            <dd>
              {result.scoreConfidenceStatus === 'clear'
                ? '明確'
                : result.scoreConfidenceStatus === 'ambiguous'
                  ? '曖昧'
                  : '判定不能'}
            </dd>

            <dt className="font-semibold">暫定基準</dt>
            <dd>{result.scoreMarginThreshold}ポイント以上</dd>
          </dl>

          {result.vowelComponentAnalysis !== null && (
            <div className="mt-6">
              <h3 className="font-bold">母音の構成要素</h3>

              <div className="mt-3 overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr>
                      <th className="border border-gray-300 p-2">
                        構成要素
                      </th>
                      <th className="border border-gray-300 p-2">
                        目標 /{result.vowelComponentAnalysis.target.ipa}/
                      </th>
                      <th className="border border-gray-300 p-2">
                        最有力 /
                        {result.vowelComponentAnalysis.bestCandidate.ipa}/
                      </th>
                      <th className="border border-gray-300 p-2">
                        状態
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.vowelComponentAnalysis.comparison.map((item) => {
                      const statusLabel = item.matches === null
                        ? '未判定'
                        : item.matches
                          ? '一致'
                          : '不一致'

                      const statusClassName = item.matches === null
                        ? 'text-gray-600'
                        : item.matches
                          ? 'text-green-700'
                          : 'font-bold text-red-700'

                      return (
                        <tr key={item.component}>
                          <th className="border border-gray-300 p-2">
                            {COMPONENT_LABELS[item.component] ?? item.component}
                          </th>
                          <td className="border border-gray-300 p-2">
                            {componentValueLabel(item.target)}
                          </td>
                          <td className="border border-gray-300 p-2">
                            {componentValueLabel(item.bestCandidate)}
                          </td>
                          <td
                            className={[
                              'border border-gray-300 p-2',
                              statusClassName,
                            ].join(' ')}
                          >
                            {statusLabel}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              <p className="mt-2 text-sm text-gray-600">
                算出方法：最有力母音から推定（直接計測ではありません）
              </p>
            </div>
          )}

          <div className="mt-6">
            <h3 className="font-bold">
              候補内相対スコア
              <span className="ml-2 text-sm font-normal text-gray-600">
                （正解確率ではありません）
              </span>
            </h3>

            <div className="mt-3 space-y-3">
              {result.vowelCandidateScores.map((candidate) => (
                <div key={candidate.vowel}>
                  <div className="mb-1 flex justify-between">
                    <span>
                      /{candidate.vowel}/（{candidate.candidateIPA}）
                    </span>
                    <span>
                      {formatNumber(candidate.relativeScorePercent)}%
                    </span>
                  </div>

                  <div
                    className="h-3 overflow-hidden rounded-full bg-gray-200"
                    role="progressbar"
                    aria-label={`/${candidate.vowel}/ の候補内相対スコア`}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={normalizedPercentage(
                      candidate.relativeScorePercent,
                    )}
                  >
                    <div
                      className="h-full rounded-full bg-blue-500"
                      style={{
                        width: `${normalizedPercentage(
                          candidate.relativeScorePercent,
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <p className="mt-3 text-sm text-gray-600">
              {result.scoreMeaning}
            </p>
          </div>

          <details className="mt-6">
            <summary className="cursor-pointer font-semibold">
              開発・研究用の詳細データ
            </summary>
            <pre className="mt-2 overflow-x-auto text-sm">
              {JSON.stringify(result, null, 2)}
            </pre>
          </details>
        </div>
      )}

      <details className="mt-8 max-w-4xl rounded-xl border border-gray-200 bg-gray-50 p-4">
        <summary className="cursor-pointer font-semibold text-gray-700">
          開発・研究用：録音履歴とデータ出力
        </summary>
        <section className="mt-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold">録音履歴</h2>
            <p className="text-sm text-gray-600">
              このブラウザ内に保存：{history.length}件
            </p>
          </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={exportHistoryAsJson}
                disabled={history.length === 0}
                className="rounded border border-gray-400 bg-white px-3 py-2 disabled:opacity-50"
              >
                JSON出力
              </button>
              <button
                type="button"
                onClick={exportHistoryAsCsv}
                disabled={history.length === 0}
                className="rounded border border-gray-400 bg-white px-3 py-2 disabled:opacity-50"
              >
                CSV出力
              </button>
            </div>
          </div>

          {history.length === 0 ? (
            <p className="mt-4">録音結果はまだありません。</p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr>
                    <th className="border border-gray-300 p-2">日時</th>
                    <th className="border border-gray-300 p-2">単語</th>
                    <th className="border border-gray-300 p-2">読取IPA</th>
                    <th className="border border-gray-300 p-2">最有力</th>
                    <th className="border border-gray-300 p-2">候補差</th>
                    <th className="border border-gray-300 p-2">状態</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((entry) => (
                    <tr key={entry.id}>
                      <td className="border border-gray-300 p-2">
                        {new Date(entry.recordedAt).toLocaleString('ja-JP')}
                      </td>
                      <td className="border border-gray-300 p-2">
                        {entry.targetWord}
                      </td>
                      <td className="border border-gray-300 p-2">
                        {entry.observedIPA || 'なし'}
                      </td>
                      <td className="border border-gray-300 p-2">
                        /{entry.bestCandidateVowel}/
                      </td>
                      <td className="border border-gray-300 p-2">
                        {formatNumber(entry.scoreMargin)}
                      </td>
                      <td className="border border-gray-300 p-2">
                        {entry.scoreConfidenceStatus === 'clear'
                          ? '明確'
                          : entry.scoreConfidenceStatus === 'ambiguous'
                            ? '曖昧'
                            : '判定不能'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </details>
    </section>
  )
}
