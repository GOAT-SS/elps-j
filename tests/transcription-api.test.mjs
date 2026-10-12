import {test} from 'node:test';
import assert from 'node:assert/strict';
import {soundLessons} from '../app/data/american-english.ts';
import {candidateTranscriptions, resolvePractice, normalizeIPA, isTranscriptionResponse, transcriptionToAnalysis} from '../app/api/analyze-pronunciation/transcription.ts';
import {proxyAnalysis} from '../app/api/analyze-pronunciation/proxy.ts';
import {isAnalysisResult} from '../app/practice/analysis.ts';
import {compareAttempts,feedbackGroups} from '../app/practice/feedback.ts';
import {parseHistory} from '../app/practice/history.ts';
const env={NEXT_PUBLIC_PRONUNCIATION_API_URL:'https://test.example'};
const response=phonemes=>({phonemes,sample_rate:16000,filename:'recording.wav',device:'test GPU'});
function upload(word='cap',slug='ae',audio=new Blob(['audio'],{type:'audio/webm'})){
 const form=new FormData();form.append('file',audio,'recording.webm');form.append('target_word',word);form.append('sound_slug',slug);
 return new Request('http://localhost/api/analyze-pronunciation',{method:'POST',body:form});
}

test('new transcription API uses /analyze and audio field without requiring a legacy API key',async()=>{
 const result=await proxyAnalysis(upload(),env,async(url,options)=>{
  assert.equal(String(url),'https://test.example/analyze');
  assert.equal(options.headers.has('Content-Type'),false);
  assert.equal(options.headers.has('X-Pronunciation-Api-Key'),false);
  assert.deepEqual([...options.body.keys()],['audio']);
  assert.equal(options.body.get('audio').name,'recording.webm');
  assert.equal(await options.body.get('audio').text(),'audio');
  return Response.json(response('k ʌ p'));
 });
 assert.equal(result.status,200);
 const body=await result.json();assert(isAnalysisResult(body));
 assert.equal(body.targetWord,'cap');assert.equal(body.targetSound,'æ');assert.equal(body.observedSound,'ʌ');
 assert.equal(body.scoreConfidenceStatus,'not_provided');assert.equal(body.scoreMargin,null);
 assert.deepEqual(body.soundCandidateScores,[]);assert.equal(body.bestCandidateSound,null);
 assert.deepEqual(feedbackGroups(body).change.map(item=>item.component),['height','backness']);
 assert.deepEqual(feedbackGroups(body).maintain.map(item=>item.component),['rounding','tenseness']);
});

test('explicit mode supports private base URL and optional authentication while invalid mode is rejected',async()=>{
 const result=await proxyAnalysis(upload(),{PRONUNCIATION_API_BASE_URL:'https://private.example',PRONUNCIATION_API_MODE:'transcription',PRONUNCIATION_API_KEY:'server-only'},async(url,options)=>{
  assert.equal(String(url),'https://private.example/analyze');assert.equal(options.headers.get('X-Pronunciation-Api-Key'),'server-only');
  return Response.json(response('kæp'));
 });
 assert.equal(result.status,200);
 assert.equal((await proxyAnalysis(upload(),{...env,PRONUNCIATION_API_MODE:'unknown'},()=>assert.fail())).status,503);
});

test('all 82 targets map their own phonemes and all within-group substitutions to the shared dictionary',()=>{
 for(const lesson of soundLessons)for(const example of lesson.examples){
  const practice=resolvePractice(example.word,lesson.slug);assert(practice);
  const own=candidateTranscriptions(practice).find(item=>item.lesson.slug===lesson.slug);
  assert.equal(own.ipa,normalizeIPA(example.ipa));
  for(const candidate of candidateTranscriptions(practice)){
   const result=transcriptionToAnalysis(response(candidate.ipa),practice);assert(isAnalysisResult(result));
   assert.equal(result.observedSound,candidate.lesson.symbol);assert.equal(result.scoreConfidenceStatus,'not_provided');
   for(const item of result.soundComponentAnalysis)assert.equal(item.inferred,candidate.lesson.structure[item.component]??null);
  }
 }
 assert.equal(normalizeIPA('/ˈbɜːɹd/'),'bɝd');
 assert(candidateTranscriptions(resolvePractice('teacher','er-unstressed')).every(item=>item.ipa.startsWith('titʃ')));
 assert(resolvePractice('hut','uh'));assert(resolvePractice('cap',''));
 assert.equal(resolvePractice('cap','h'),null);assert.equal(resolvePractice('see',''),null);
});

test('empty or mismatched transcripts ask for retry; missing or malformed responses do not yield feedback',async()=>{
 const practice=resolvePractice('cap','ae');
 for(const ipa of ['', 'æ','bæp','kæpi','ɾæp']){
  const result=transcriptionToAnalysis(response(ipa),practice);
  assert.equal(result.evaluationStatus,'retry');assert.equal(result.canEvaluate,false);assert.equal(result.soundComponentAnalysis,null);assert(isAnalysisResult(result));
 }
 for(const data of [null,{phonemes:'kæp'},{phonemes:[],sample_rate:16000},response('kæp'.repeat(2000)),{phonemes:'kæp',sample_rate:0}]){
  assert(!isTranscriptionResponse(data));
  assert.equal((await proxyAnalysis(upload(),env,async()=>Response.json(data))).status,502);
 }
});

test('invalid targets and empty/malformed uploads are rejected before inference, and remote errors are recoverable',async()=>{
 const noCall=()=>assert.fail('must not send invalid input');
 assert.equal((await proxyAnalysis(upload('cap','h'),env,noCall)).status,400);
 assert.equal((await proxyAnalysis(upload('cap','ae',new Blob()),env,noCall)).status,422);
 const malformed=new Request('http://localhost/api/analyze-pronunciation',{method:'POST',body:'invalid multipart',headers:{'Content-Type':'multipart/form-data; boundary=missing'}});
 assert.equal((await proxyAnalysis(malformed,env,noCall)).status,400);
 const failed=await proxyAnalysis(upload(),env,async()=>Response.json({detail:'音声を読み取れませんでした'},{status:422}));
 assert.equal(failed.status,422);assert.equal((await failed.json()).error,'音声を読み取れませんでした');
 const retry=await proxyAnalysis(upload(),env,async()=>Response.json(response('kæp')));assert.equal(retry.status,200);
});

test('unscored feedback supports a reference comparison and persists without turning missing confidence into clear',()=>{
 const practice=resolvePractice('cap','ae');
 const before=transcriptionToAnalysis(response('kʌp'),practice);
 const after=transcriptionToAnalysis(response('kæp'),practice);
 assert.deepEqual(compareAttempts(after,before),{previousSound:'ʌ',currentSound:'æ',previousDifferences:2,currentDifferences:0});
 assert.equal(after.evaluationStatus,'ambiguous');assert.equal(after.scoreConfidenceStatus,'not_provided');
 const entry={...after,id:'test',recordedAt:'2026-10-12T12:00:00Z'};
 assert.deepEqual(parseHistory(JSON.stringify([entry])),[entry]);
 assert.equal(compareAttempts(after,{...before,scoreConfidenceStatus:'ambiguous'}),null);
});
