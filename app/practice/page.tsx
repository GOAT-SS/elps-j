import Recorder from './Recorder'
import { soundLessons } from '../data/american-english'

type PracticePageProps = {
  searchParams: Promise<{
    sound?: string | string[]
    vowel?: string | string[]
  }>
}

export default async function PracticePage({ searchParams }: PracticePageProps) {
  const requested = await searchParams
  const requestedSound = typeof requested.sound === 'string'
    ? soundLessons.find((sound) => sound.slug === requested.sound)
    : undefined
  const requestedLegacyVowel = typeof requested.vowel === 'string'
    ? soundLessons.find((sound) => sound.symbol === requested.vowel)
    : undefined
  const initialSoundSlug = requestedSound?.slug ?? requestedLegacyVowel?.slug

  return (
    <main className="flex-1">
      <section className="border-b border-violet-100 bg-violet-50">
        <div className="mx-auto w-full max-w-6xl px-5 py-12 sm:px-8 sm:py-16">
          <p
            lang="en"
            className="text-sm font-bold tracking-[0.14em] text-violet-700"
          >
            STEP 3
          </p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight text-slate-950">
            発音練習
          </h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-700">
            41の発音項目から記号と例語を選び、録音して発音を確認します。
            単母音、二重母音、R音性母音、子音を練習できます。
          </p>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-500">
            音声AIが返す音素列は学習の手がかりです。
            一度の認識結果だけで発音の良し悪しを断定するものではありません。
          </p>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-5 py-12 sm:px-8">
        <Recorder initialSoundSlug={initialSoundSlug} />
      </section>
    </main>
  )
}
