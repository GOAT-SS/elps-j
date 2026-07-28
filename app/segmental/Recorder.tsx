'use client'

import { useRef, useState } from 'react'

type Status = 'idle' | 'recording' | 'uploading' | 'done' | 'error'

export default function Recorder() {
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

  const [status, setStatus] = useState<Status>('idle')
  const [result, setResult] = useState<unknown>(null)

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      })

      const recorder = new MediaRecorder(stream)
      chunksRef.current = []

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }

      recorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, {
          type: recorder.mimeType,
        })

        stream.getTracks().forEach((track) => track.stop())
        await uploadAudio(audioBlob)
      }

      recorderRef.current = recorder
      recorder.start()
      setStatus('recording')
    } catch (error) {
      console.error(error)
      setStatus('error')
    }
  }

  function stopRecording() {
    recorderRef.current?.stop()
    setStatus('uploading')
  }

  async function uploadAudio(audioBlob: Blob) {
    //音声処理とかは特にTryCathch使った方が良い．プログラムが動いているときに，録音が止まった後に，サーバーが落ちているとか，ネットワークが切れているとか，そういうことが起こる可能性がある．a
    //Nullぽ　a

    try {
      const formData = new FormData()
      formData.append('file', audioBlob, 'recording.webm')
      // WebM は効率が良いらしいMP4とかと比べて効率が段違いらしい．a

      const response = await fetch(
        'http://127.0.0.1:8000/analyze-pronunciation',
        {
          method: 'POST',
          body: formData,
        },
      )

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      setResult(await response.json())
      setStatus('done')
      } catch (error) {
      console.error(error)
      setStatus('error')
    }
  }

  return (
    <section>
      <button
        onClick={status === 'recording' ? stopRecording : startRecording}
        disabled={status === 'uploading'}
      >
        {status === 'recording' ? '録音停止' : '録音開始'}
      </button>

      <p>状態: {status}</p>

      {result !== null && (
        <pre>{JSON.stringify(result, null, 2)}</pre>
      )}
    </section>
  )
}
