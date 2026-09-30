# ELPS-J

英語の発音知識を学び、録音した発音へフィードバックを返す学習アプリです。

## 構成

```text
elps-j/
├── app/                 # Next.jsの画面・Route Handler・教材データ
│   ├── api/             # ブラウザーとFastAPIの間のプロキシ
│   └── data/            # IPA・練習語などの共有データ
├── backend/             # FastAPIと音声モデル
│   ├── main.py
│   └── requirements.txt
├── public/              # 静的ファイル
└── tests/               # フロントエンド側のテスト
```

Pythonの仮想環境、Next.jsの生成物、依存パッケージはGitへ保存しません。

## 必要なもの

- Node.js 20以上
- Python 3.11推奨
- FFmpeg
- Hugging Faceで `KoelLabs/xlsr-english-01` の利用条件を承認したアカウント

## 初回セットアップ

### 1. フロントエンド

```bash
npm install
cp .env.example .env.local
```

`.env.local` の `PRONUNCIATION_API_KEY` を、十分に長いランダムな値へ変更してください。

### 2. バックエンド（macOS/Linux）

```bash
python3.11 -m venv backend/.venv
backend/.venv/bin/python -m pip install --upgrade pip
backend/.venv/bin/python -m pip install -r backend/requirements.txt
hf auth login
backend/.venv/bin/python -c "from huggingface_hub import snapshot_download; snapshot_download('KoelLabs/xlsr-english-01')"
```

NVIDIA GPUを使用する場合は、先にPyTorch公式の案内に従ってCUDA対応版PyTorchをインストールしてください。

### 3. バックエンド（Windows PowerShell）

```powershell
py -3.11 -m venv backend\.venv
.\backend\.venv\Scripts\python.exe -m pip install --upgrade pip
.\backend\.venv\Scripts\python.exe -m pip install -r backend\requirements.txt
hf auth login
.\backend\.venv\Scripts\python.exe -c "from huggingface_hub import snapshot_download; snapshot_download('KoelLabs/xlsr-english-01')"
```

## ローカル起動

ターミナルを2つ使います。

### ターミナル1：発音判定バックエンド

macOS/Linux:

```bash
backend/.venv/bin/python -m uvicorn backend.main:app --env-file .env.local --host 127.0.0.1 --port 8000
```

Windows PowerShell:

```powershell
.\backend\.venv\Scripts\python.exe -m uvicorn backend.main:app --env-file .env.local --host 127.0.0.1 --port 8000
```

確認URL：<http://127.0.0.1:8000/health>

### ターミナル2：Next.js

```bash
npm run dev
```

アプリ：<http://localhost:3000>

## 処理の流れ

```text
ブラウザー
  → Next.js /api/analyze-pronunciation
  → FastAPI /analyze-pronunciation
  → KoelLabs/xlsr-english-01
  → IPA・候補比較・構成要素フィードバック
```

ブラウザーからFastAPIへ直接秘密鍵を送らないため、Next.jsのRoute Handlerを経由します。

## 確認コマンド

```bash
npm run lint
npm test
npm run build
```

## メモリについて

`npm run dev` はTurbopackによる開発用監視を行います。通常、この規模のアプリだけで数十GBの実メモリを使うことはありません。VS Codeでは `.next`、`node_modules`、Python仮想環境を監視対象から除外する設定を同梱しています。

発音モデルはNext.jsとは別プロセスです。メモリが限られる端末では、不要なElectronアプリやブラウザータブを閉じてから起動してください。
