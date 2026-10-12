// Requires the verification Next.js server pointing to the local FastAPI.
import assert from 'node:assert/strict';
import {isAnalysisResult} from '../app/practice/analysis.ts';
const base=process.env.BROWSER_CHECK_BASE_URL ?? 'http://127.0.0.1:3100';
function wav(volume=0.1) {
  const buffer=new ArrayBuffer(44+32000); const view=new DataView(buffer);
  const text=(offset,value)=>[...value].forEach((char,index)=>view.setUint8(offset+index,char.charCodeAt(0)));
  text(0,'RIFF');view.setUint32(4,buffer.byteLength-8,true);text(8,'WAVE');text(12,'fmt ');view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,1,true);view.setUint32(24,16000,true);view.setUint32(28,32000,true);view.setUint16(32,2,true);view.setUint16(34,16,true);text(36,'data');view.setUint32(40,32000,true);
  for(let i=0;i<16000;i++)view.setInt16(44+i*2,32767*volume*Math.sin(2*Math.PI*220*i/16000),true);
  return new Blob([buffer],{type:'audio/wav'});
}
async function post(sound,word,audio) {
  const form=new FormData();form.append('sound_slug',sound);form.append('target_word',word);form.append('file',audio,'recording.wav');
  const response=await fetch(base+'/api/analyze-pronunciation',{method:'POST',body:form,signal:AbortSignal.timeout(105000)});
  return {status:response.status,body:await response.json()};
}
for(const [sound,word] of [['i','see'],['h','hat'],['ay','day'],['er-stressed','bird']]) {
  const response=await post(sound,word,wav());assert.equal(response.status,200,JSON.stringify(response.body));assert(isAnalysisResult(response.body));assert.equal(response.body.soundSlug,sound);assert.equal(response.body.targetWord,word);assert(response.body.soundCandidateScores.length>=2);assert.notEqual(response.body.evaluationStatus,'matched');
  console.log(`${sound}: Next.js -> FastAPI -> cached model -> validated response OK`);
}
const silence=await post('h','hat',wav(0));assert.equal(silence.status,422);assert(silence.body.error.includes('声を確認'));
const retry=await post('h','hat',wav());assert.equal(retry.status,200);assert(isAnalysisResult(retry.body));
console.log('Silence rejected with retry guidance; following request succeeds.');
