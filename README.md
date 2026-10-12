# ELPS-J

日本人英語学習者が、英語の41項目を「知識学習 → 構成理解 → 録音練習」で学ぶ試作アプリです。

## 構成

```text
app/
├── learn/                    # 41項目の知識学習
├── components/               # 概念マップ・3母音の構造変換
├── practice/
│   ├── Recorder.tsx          # 対象選択と画面の組み立て
│   ├── useRecording.ts       # 録音・停止・通信のライフサイクル
│   ├── analysis.ts           # API契約・レスポンス検証
│   ├── AnalysisView.tsx      # 構成要素の比較・維持/変更・再発音
│   ├── feedback.ts           # 共通教材の語彙による修正の手がかり
│   └── *History* / history.ts # 履歴・移行・JSON/CSV出力
├── api/analyze-pronunciation/ # 秘密鍵を保持するプロキシ
└── data/curriculum.json       # 全画面・Python共通の教材と構成要素
backend/
├── main.py                   # 認証・入力検証・HTTPエラー
├── curriculum.py             # 対象解決・音素照合・判定
├── audio.py                  # 制限付き音声変換・品質チェック
├── engine.py                 # 専用プロセスでのモデル推論
└── tests/                    # API・教材・音声・タイムアウト回復のテスト
```

`curriculum.json` が41項目・82例語と構成要素の唯一の実行時定義です。`american-english.ts` はその型付きの参照口です。`ipa_features.json` は以前のPDF由来の参照資料で、実行時には使用しません。`practice_words.json` は旧3母音の9単語の互換入力と暫定スコア基準を保持します。

構成理解の完了状況は画面を開いている間に保持します。録音の解析結果はブラウザーに最新200件を保存し、旧履歴を読み込めます。音声自体は保存しません。PostgreSQLのCompose設定は将来用で、現時点でアプリはDBを使いません。

## 必要なもの

- Node.js **22.18以上**（TypeScriptを直接読み込むテストに必要。Node.js 24で検証）
- Python 3.11以上（Python 3.12で検証）
- FFmpeg
- Hugging Faceで `KoelLabs/xlsr-english-01` の利用条件を承認したアカウントと、保存済みモデル

## 初回セットアップ（macOS/Linux）

```bash
npm install
cp .env.example .env.local
python3 -m venv backend/.venv
backend/.venv/bin/python -m pip install -r backend/requirements.txt
backend/.venv/bin/hf auth login
backend/.venv/bin/python -c "from huggingface_hub import snapshot_download; snapshot_download('KoelLabs/xlsr-english-01')"
```

`.env.local` の `PRONUNCIATION_API_KEY` を十分に長いランダムな値へ変更してください。Next.jsとFastAPIに同じ値を設定します。モデルはローカルキャッシュからのみ読み込み、初回解析時に専用プロセスへ読み込みます。

Windowsでは `py -3.12 -m venv backend\.venv` を使い、Pythonのパスを `backend\.venv\Scripts\python.exe`、Hugging Faceのパスを `backend\.venv\Scripts\hf.exe` に読み替えます。FFmpegもPATHへ追加してください。

## ローカル起動

ターミナルを2つ使います。

```bash
# ターミナル1
backend/.venv/bin/python -m uvicorn backend.main:app --env-file .env.local --host 127.0.0.1 --port 8000

# ターミナル2
npm run dev
```

アプリ：<http://localhost:3000>。`http://127.0.0.1:8000/health` はサーバーの稼働確認です。モデルの読み込み成功は最初の解析時に確認します。

## 解析と回復

```text
ブラウザーの録音（最大15秒）
  → ブラウザー内でモノラル16kHz PCM WAVへ変換・品質確認
  → Next.js /api/analyze-pronunciation
  → FastAPI：単語とsound_slugを検証
  → FFmpeg：モノラル16kHzへ変換（最大10秒）
  → 音声品質チェック
  → 専用モデルプロセス（変換・読み込みを含む解析全体で最大90秒）
  → 音素列・同じ種類の候補比較・共通教材の構成要素
```

- 選択した音の `sound_slug` と `target_word` を送ります。同じ `hat` でも `/h/` を指定すれば子音が対象になります。
- 4MBを超えるアップロード、短すぎる録音、無音・小さすぎる音、過大入力を拒否し、再録音を案内します。
- 同時推論は1件です。処理中の別リクエストは429で再試行を案内し、ヘルスチェックは応答を継続します。
- 推論のタイムアウトではプロセスを終了し、次回解析で再作成します。プロキシは95秒、ブラウザーは105秒で待機を終了します。画面で判定中止もできます。ブラウザーで中止しても、実行中のサーバー側推論は完了または90秒の期限まで継続します。
- 対象音以外の音素列が一致して推定音を一意に特定できた場合、その推定音を共通教材の構成要素へ対応づけ、目標音と比較します。構成要素の比較元は候補スコア1位ではなく、転写された推定音です。
- フィードバックは「変更する要素（差）」「維持する要素（共通）」と、推定音・目標音の比較表を示します。例：目標 /æ/・推定 /ʌ/ では、唇の丸めと緊張性は維持し、舌を低く・前へ動かす方向を意識します。指定しない要素は一致・不一致を判定しません。
- 候補差が暫定基準を超えて推定音とスコア1位が一致する場合は通常のフィードバック、それ以外は判定を保留して条件付きの参考フィードバックを示します。対象音を特定できない場合は構成要素の修正を指示せず、再録音を案内します。
- 直前のフィードバックを見ながら同じ単語を再録音できます。根拠が明確な結果同士では、同じ単語・対象音の前回の推定音と構成要素の差の数を比較します。これは辞書上の比較で、直接の調音測定や学習効果の証明ではありません。
- 候補スコアは正解確率ではありません。音声モデルの結果から実際の舌の位置や発音の正しさを断定しません。方言差・異音・録音環境で判定を保留することがあります。41項目ごとの精度と暫定基準の妥当性は、学習者音声による評価が必要です。

APIの結果は `schemaVersion: 3` です。`feedbackBasis: inferred_phoneme` は推定音に基づく比較を示し、各構成要素の `inferred` に推定音の辞書上の値を返します。ブラウザー内のv1/v2履歴は移行して保持します。以前の候補に基づく構成要素はJSON出力に残し、新しい推定音に基づく比較には流用しません。CSV出力にも比較の根拠と構成要素を含めます。旧9単語の入力は引き続き受け付けますが、外部クライアントは新しい結果契約への更新が必要です。

## 更新後のGPU音素転写APIへの接続

更新後APIは `POST /analyze` に `audio` という名前の音声ファイルを送り、`phonemes`（IPA文字列）、`sample_rate`、`filename`、`device` を返します。ブラウザーは録音をモノラル16kHzのPCM WAVへ変換してから、従来と同じくNext.jsへ `file`・`target_word`・`sound_slug` を送り、Next.jsが新API向けに送信形式を変換します。新APIがブラウザーのWebM録音を読み込めないため、WAVへ変換します。新APIは単語や構成要素を判定しないため、Next.js側の `transcription.ts` が共通教材から目標を取得し、推定音と目標の構成要素を比較します。

`.env.local` に `NEXT_PUBLIC_PRONUNCIATION_API_URL` だけを指定した場合は、この新API方式を使用します。サーバー専用の設定にする場合は次のように指定します。

```dotenv
PRONUNCIATION_API_BASE_URL=https://your-updated-api.example
PRONUNCIATION_API_MODE=transcription
```

`PRONUNCIATION_API_BASE_URL` があれば、旧 `NEXT_PUBLIC_PRONUNCIATION_API_URL` より優先します。方式を省略した場合、サーバー専用URLは `scored`、旧公開URLだけの場合は `transcription` になります。認証のない新APIに鍵は不要です。鍵やCloudflare Accessの認証を使用する環境では既存のサーバー専用設定を指定できます。

新APIは候補スコア・認識の確かさ・録音時間を返さないため、これらの数値を補って生成しません。対象音を特定できる場合は `scoreConfidenceStatus: not_provided` とし、構成要素の維持・変更と前回との比較を参考情報として表示します。音素列が空または単語の他の部分が一致しない場合は、修正を指示せず再録音を案内します。旧スコア付きPython APIは `PRONUNCIATION_API_MODE=scored` で引き続き利用できます。

## 本番への接続

Next.jsをVercelへ置く場合、FastAPIと共通の `app/data` を常時稼働ホストに配置します。`.vercelignore` によりPythonのモデル実行環境はVercelへ送信しません。

Next.js側に `PRONUNCIATION_API_BASE_URL`（FastAPIのHTTPS接続先）と `PRONUNCIATION_API_KEY` を設定します。旧 `NEXT_PUBLIC_PRONUNCIATION_API_URL` ではなくサーバー専用変数を使ってください。Named TunnelをCloudflare Accessで保護する場合は、Next.js側に `CLOUDFLARE_ACCESS_CLIENT_ID` と `CLOUDFLARE_ACCESS_CLIENT_SECRET` を両方設定します。使わない場合は空欄で構いません。

Next.js側の実行環境は100秒の実行時間が必要です（Route Handlerで `maxDuration = 100` を指定）。FastAPIはモデルを複数読み込まないよう1ワーカーで起動します。公開運用では利用者認証・呼出回数の制限も別途必要です。

## 検証

```bash
npm run lint
npm test
npm run build

# 音声モデル不要のPythonテスト（FFmpegは必要）
python3 -m venv backend/.venv-test
backend/.venv-test/bin/python -m pip install -r backend/requirements-test.txt
backend/.venv-test/bin/python -m unittest discover -s backend/tests -t . -v

# 保存済みの実モデルを使う任意の検証。外部へ音声は送信しません。
backend/.venv/bin/python scripts/verify-model.py

# Next.jsの接続先をローカルFastAPIへ設定し、両方起動してから実行
BROWSER_CHECK_BASE_URL=http://localhost:3000 node scripts/verify-integration.mjs
```

Pythonテストは全82例語の対象解決、認識と候補の不一致、音声品質、認証、アップロード上限、推論中の稼働確認、プロセスの再利用・タイムアウト後の再試行を確認します。フロントエンドテストは構成採点、API契約、プロキシ、履歴移行を確認します。

ブラウザー検証にはPlaywrightとChromeを使います。`BROWSER_CHECK_BASE_URL` を起動中のアプリへ設定し、`node tests/browser-check.mjs` を実行してください。Playwrightが別のランタイムにある場合は `PLAYWRIGHT_MODULE`、Chromeの場所を指定する場合は `CHROME_PATH` を設定します。この検証はAPIの応答を検証用データに置き換えて録音・再試行・結果表示・履歴・判定中止・マイク停止・モバイル表示を確認します。実モデルへの接続は上記の結合検証で確認します。

## このMacでの公開APIサービス

macOSのログイン時サービスとしてAPIとCloudflare Quick Tunnelを動かすための設置スクリプトは `scripts/deployment/install-local-services.py` です。登録にはMac常駐化・Cloudflare経由の録音受付について明示的な承認が必要です。`.env.production-api` に秘密鍵を保存し、モデルを使えるPython環境でスクリプトを実行します。鍵とログはGit・Vercelへのアップロードから除外します。

APIは `127.0.0.1:8000` にだけ接続を受け付け、外部接続はトンネルから到達します。この構成はMacのログイン・起動・ネットワーク接続中に利用できます。Quick TunnelのURLはトンネルが再起動すると変わるため、その場合はVercelの `PRONUNCIATION_API_BASE_URL` を更新して再デプロイしてください。固定URLで継続運用するにはNamed Tunnelまたは常時稼働ホストへの移行が必要です。

登録後のサービス名は `com.elps-j.pronunciation-api` と `com.elps-j.pronunciation-tunnel`、ログは `tmp/com.elps-j.pronunciation-*.log` です。停止する場合はそれぞれ `launchctl bootout gui/$(id -u)/サービス名` を実行します。
