// Encode the browser recording as mono 16 kHz PCM WAV for the transcription API.
// Audio decoding runs locally; only the resulting WAV is sent for analysis.
export function encodeWav(samples: Float32Array, sampleRate: number): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  const writeText = (offset: number, value: string) => {
    for (let index = 0; index < value.length; index++) view.setUint8(offset + index, value.charCodeAt(index));
  };
  writeText(0, 'RIFF'); view.setUint32(4, buffer.byteLength - 8, true);
  writeText(8, 'WAVE'); writeText(12, 'fmt '); view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true); view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true); view.setUint16(34, 16, true);
  writeText(36, 'data'); view.setUint32(40, samples.length * 2, true);
  for (let index = 0; index < samples.length; index++) {
    const value = Math.max(-1, Math.min(1, samples[index]));
    view.setInt16(44 + index * 2, value < 0 ? value * 32768 : value * 32767, true);
  }
  return new Blob([buffer], {type: 'audio/wav'});
}

export async function recordingToWav(recording: Blob): Promise<Blob> {
  if (typeof AudioContext === 'undefined' || typeof OfflineAudioContext === 'undefined') {
    throw new Error('このブラウザーでは録音音声を変換できません。別のブラウザーでお試しください。');
  }
  const decoder = new AudioContext();
  try {
    const decoded = await decoder.decodeAudioData(await recording.arrayBuffer());
    if (!Number.isFinite(decoded.duration) || decoded.duration < 0.25) throw new Error('録音が短すぎます。単語全体をもう一度録音してください。');
    if (decoded.duration > 15.5) throw new Error('録音が長すぎます。15秒以内で録音してください。');
    const renderer = new OfflineAudioContext(1, Math.ceil(decoded.duration * 16000), 16000);
    const source = renderer.createBufferSource();
    source.buffer = decoded; source.connect(renderer.destination); source.start();
    const mono = await renderer.startRendering();
    const samples = mono.getChannelData(0);
    const rms = Math.sqrt(samples.reduce((sum, value) => sum + value * value, 0) / samples.length);
    if (!Number.isFinite(rms) || rms < 0.003) throw new Error('声を確認できませんでした。マイクに近づいて、もう一度録音してください。');
    const clipping = samples.reduce((count, value) => count + (Math.abs(value) >= 0.995 ? 1 : 0), 0) / samples.length;
    if (clipping > 0.1) throw new Error('録音の音量が大きすぎます。マイクから少し離れて、もう一度録音してください。');
    return encodeWav(samples, 16000);
  } catch (failure) {
    if (failure instanceof Error && failure.name === 'EncodingError') throw new Error('録音音声を読み取れませんでした。もう一度録音してください。');
    throw failure;
  } finally {
    await decoder.close();
  }
}
