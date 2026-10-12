import { isAnalysisResult, responseErrorMessage } from '../../practice/analysis.ts';
import { isTranscriptionResponse, resolvePractice, transcriptionToAnalysis, type PracticeTarget } from './transcription.ts';
export const MAX_REQUEST_BYTES = 4_000_000;
export const UPSTREAM_TIMEOUT_MS = 95_000;
const errorResponse = (error: string, status: number) => Response.json({ error }, { status });

async function readBoundedBody(request: Request) {
  const reader = request.body?.getReader();
  if (!reader) return new Uint8Array();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const {value, done} = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_REQUEST_BYTES) {
        await reader.cancel();
        return null;
      }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const body = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { body.set(chunk, offset); offset += chunk.byteLength; }
  return body;
}

export async function proxyAnalysis(request: Request, environment = process.env, upstreamFetch: typeof fetch = fetch, timeoutMs = UPSTREAM_TIMEOUT_MS) {
  const configuredBaseUrl = environment.PRONUNCIATION_API_BASE_URL?.trim();
  const apiBaseUrl = configuredBaseUrl || environment.NEXT_PUBLIC_PRONUNCIATION_API_URL?.trim();
  const mode = environment.PRONUNCIATION_API_MODE?.trim() || (configuredBaseUrl ? 'scored' : 'transcription');
  const apiKey = environment.PRONUNCIATION_API_KEY?.trim();
  if (!apiBaseUrl || (mode === 'scored' && !apiKey)) return errorResponse('発音解析の接続設定が不完全です。', 503);
  if (!['scored', 'transcription'].includes(mode)) return errorResponse('発音解析の接続方式が正しく設定されていません。', 503);
  const contentType = request.headers.get('content-type');
  if (!contentType?.startsWith('multipart/form-data')) return errorResponse('音声データの形式が正しくありません。', 415);
  if (Number(request.headers.get('content-length')) > MAX_REQUEST_BYTES) return errorResponse('録音データが大きすぎます。', 413);
  let endpoint: URL;
  try {
    endpoint = new URL(mode === 'transcription' ? 'analyze' : 'analyze-pronunciation', `${apiBaseUrl.replace(/\/+$/, '')}/`);
    if (!['http:', 'https:'].includes(endpoint.protocol)) throw new Error('Unsupported protocol');
  } catch { return errorResponse('発音解析の接続先が正しく設定されていません。', 503); }
  const headers = new Headers({'Content-Type': contentType});
  if (apiKey) headers.set('X-Pronunciation-Api-Key', apiKey);
  const clientId = environment.CLOUDFLARE_ACCESS_CLIENT_ID?.trim();
  const clientSecret = environment.CLOUDFLARE_ACCESS_CLIENT_SECRET?.trim();
  if (clientId || clientSecret) {
    if (!clientId || !clientSecret) return errorResponse('Cloudflare Accessの設定が不完全です。', 503);
    headers.set('CF-Access-Client-Id', clientId);
    headers.set('CF-Access-Client-Secret', clientSecret);
  }
  try {
    const body = await readBoundedBody(request);
    if (body === null) return errorResponse('録音データが大きすぎます。', 413);
    let upload: BodyInit = body;
    let practice: PracticeTarget | null = null;
    if (mode === 'transcription') {
      let form: FormData;
      try { form = await new Response(body, {headers: {'Content-Type': contentType}}).formData(); }
      catch { return errorResponse('音声データの形式が正しくありません。', 400); }
      const audio = form.get('file');
      const word = form.get('target_word');
      const slug = form.get('sound_slug');
      if (!(audio instanceof Blob) || audio.size === 0) return errorResponse('録音データが空です。もう一度録音してください。', 422);
      if (typeof word !== 'string' || (slug !== null && typeof slug !== 'string')) return errorResponse('練習する単語と発音記号を選んでください。', 400);
      practice = resolvePractice(word, slug ?? '');
      if (!practice) return errorResponse('選択した発音記号の例語を選んでください。', 400);
      const transcriptionUpload = new FormData();
      transcriptionUpload.append('audio', audio, audio instanceof File ? audio.name : 'recording');
      upload = transcriptionUpload;
      // fetch generates the new multipart boundary for the renamed audio field.
      headers.delete('Content-Type');
    }
    const signal = AbortSignal.any([request.signal, AbortSignal.timeout(timeoutMs)]);
    const response = await upstreamFetch(endpoint, { method: 'POST', headers, body: upload, cache: 'no-store', signal });
    const data: unknown = await response.json().catch(() => null);
    if (signal.aborted) return errorResponse('解析に時間がかかりすぎました。もう一度録音してください。', 504);
    if (!response.ok) {
      const forwardedHeaders = response.status === 429 ? {'Retry-After': '3'} : undefined;
      return Response.json({error: response.status === 401 ? '発音解析の接続設定を確認してください。' : responseErrorMessage(data, response.status)}, { status: response.status === 401 ? 502 : response.status, headers: forwardedHeaders });
    }
    if (mode === 'transcription') {
      if (!isTranscriptionResponse(data) || !practice) return errorResponse('解析結果を読み取れませんでした。もう一度お試しください。', 502);
      return Response.json(transcriptionToAnalysis(data, practice));
    }
    if (!isAnalysisResult(data)) return errorResponse('解析結果を読み取れませんでした。もう一度お試しください。', 502);
    return Response.json(data);
  } catch (error) {
    if (error instanceof Error && ['TimeoutError', 'AbortError'].includes(error.name)) return errorResponse('解析に時間がかかりすぎました。もう一度録音してください。', 504);
    return errorResponse('発音解析サーバーへ接続できませんでした。もう一度お試しください。', 502);
  }
}
