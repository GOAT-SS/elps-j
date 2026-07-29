const MAX_REQUEST_BYTES = 4_000_000

function errorResponse(message: string, status: number) {
  return Response.json({ error: message }, { status })
}

export async function POST(request: Request) {
  const apiBaseUrl = process.env.PRONUNCIATION_API_BASE_URL
  const apiKey = process.env.PRONUNCIATION_API_KEY

  if (apiBaseUrl === undefined || apiKey === undefined) {
    return errorResponse('発音判定APIが設定されていません。', 503)
  }

  const contentType = request.headers.get('content-type')

  if (contentType?.startsWith('multipart/form-data') !== true) {
    return errorResponse('音声データの形式が正しくありません。', 415)
  }

  const declaredLength = Number(request.headers.get('content-length'))

  if (
    Number.isFinite(declaredLength)
    && declaredLength > MAX_REQUEST_BYTES
  ) {
    return errorResponse('録音データが大きすぎます。', 413)
  }

  const requestBody = await request.arrayBuffer()

  if (requestBody.byteLength > MAX_REQUEST_BYTES) {
    return errorResponse('録音データが大きすぎます。', 413)
  }

  const upstreamHeaders = new Headers({
    'Content-Type': contentType,
    'X-Pronunciation-Api-Key': apiKey,
  })
  const cloudflareClientId = process.env.CLOUDFLARE_ACCESS_CLIENT_ID
  const cloudflareClientSecret =
    process.env.CLOUDFLARE_ACCESS_CLIENT_SECRET

  if (cloudflareClientId !== undefined || cloudflareClientSecret !== undefined) {
    if (
      cloudflareClientId === undefined
      || cloudflareClientSecret === undefined
    ) {
      return errorResponse('Cloudflare Accessの設定が不完全です。', 503)
    }

    upstreamHeaders.set('CF-Access-Client-Id', cloudflareClientId)
    upstreamHeaders.set('CF-Access-Client-Secret', cloudflareClientSecret)
  }

  const endpoint = new URL(
    'analyze-pronunciation',
    `${apiBaseUrl.replace(/\/+$/, '')}/`,
  )

  try {
    const upstreamResponse = await fetch(endpoint, {
      method: 'POST',
      headers: upstreamHeaders,
      body: requestBody,
      cache: 'no-store',
    })
    const responseHeaders = new Headers()
    const responseContentType = upstreamResponse.headers.get('content-type')

    if (responseContentType !== null) {
      responseHeaders.set('Content-Type', responseContentType)
    }

    return new Response(upstreamResponse.body, {
      status: upstreamResponse.status,
      headers: responseHeaders,
    })
  } catch (error) {
    console.error('発音判定APIへ接続できませんでした。', error)
    return errorResponse('発音判定サーバーへ接続できませんでした。', 502)
  }
}
