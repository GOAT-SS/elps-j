import assert from 'node:assert/strict';
import fs from 'node:fs';
import { test } from 'node:test';
import { soundLessons, featureDefinitions } from '../app/data/american-english.ts';
import { createSoundExercise } from '../app/data/american-english-structures.ts';
import { isAnalysisResult, requestAnalysis } from '../app/practice/analysis.ts';
import { parseHistory, historyCsv, HISTORY_LIMIT } from '../app/practice/history.ts';
import { proxyAnalysis, MAX_REQUEST_BYTES } from '../app/api/analyze-pronunciation/proxy.ts';
import { componentAdvice, feedbackGroups, compareAttempts } from '../app/practice/feedback.ts';
const fixture = JSON.parse(fs.readFileSync(new URL('./fixtures/analysis.json', import.meta.url)));
const environment = {PRONUNCIATION_API_BASE_URL: 'http://127.0.0.1:8000', PRONUNCIATION_API_KEY: 'server-only-key'};
function request(body = 'audio', extra = {}) {
  return new Request('http://localhost/api/analyze-pronunciation', { method: 'POST', headers: {'Content-Type': 'multipart/form-data; boundary=demo', ...extra}, body });
}

test('all 82 examples use the shared curriculum and exercise target definitions', () => {
  assert.equal(soundLessons.flatMap(sound => sound.examples).length, 82);
  assert.equal(new Set(soundLessons.map(sound => sound.slug)).size, 41);
  for (const sound of soundLessons) {
    const exercise = createSoundExercise(sound);
    for (const [key, value] of Object.entries(sound.structure)) {
      assert.equal(exercise.values[key], value);
      assert(featureDefinitions[key].options.some(([option]) => option === value));
    }
    assert(soundLessons.some(other => other.slug === sound.comparison));
    assert(sound.examples.every(example => example.ipa.includes(sound.symbol)));
  }
});

test('response validation rejects missing arrays, invalid nested fields and nonfinite scores', () => {
  assert(isAnalysisResult(fixture));
  for (const result of [null, {observedIPA:'hæt'}, {...fixture, schemaVersion:2}, {...fixture, feedbackBasis:undefined}, {...fixture, observedSound:null}, {...fixture, soundComponentAnalysis: undefined}, {...fixture, soundCandidateScores: [{...fixture.soundCandidateScores[0], relativeScorePercent:NaN}]}, {...fixture,soundComponentAnalysis:[{component:'height',target:'low'}]}]) {
    assert(!isAnalysisResult(result));
  }
});

test('upload carries the selected sound, rejects malformed/stale success responses, and reports API errors', async () => {
  const oldFetch = globalThis.fetch;
  try {
    globalThis.fetch = async (_url, options) => {
      assert.equal(options.body.get('sound_slug'), 'h');
      assert.equal(options.body.get('target_word'), 'hat');
      assert(options.body.get('file') instanceof Blob);
      return Response.json(fixture);
    };
    assert.equal((await requestAnalysis(new Blob(['audio']), 'hat', 'h', new AbortController().signal)).targetSound, 'h');
    globalThis.fetch = async () => Response.json({observedIPA: 'hæt'});
    await assert.rejects(requestAnalysis(new Blob(['audio']), 'hat', 'h', new AbortController().signal), /読み取れ/);
    globalThis.fetch = async () => Response.json(fixture);
    await assert.rejects(requestAnalysis(new Blob(['audio']), 'see', 'i', new AbortController().signal), /一致しません/);
    globalThis.fetch = async () => Response.json({error:'声を確認できませんでした'}, {status:422});
    await assert.rejects(requestAnalysis(new Blob(['audio']), 'hat', 'h', new AbortController().signal), /声を確認/);
  } finally { globalThis.fetch = oldFetch; }
});

test('proxy forwards audio and private authentication, handles optional blank Cloudflare values', async () => {
  let called = false;
  const response = await proxyAnalysis(request(), {...environment, CLOUDFLARE_ACCESS_CLIENT_ID:'', CLOUDFLARE_ACCESS_CLIENT_SECRET:''}, async (url, options) => {
    called = true;
    assert.equal(String(url), 'http://127.0.0.1:8000/analyze-pronunciation');
    assert.equal(options.headers.get('X-Pronunciation-Api-Key'), 'server-only-key');
    assert.equal(options.headers.has('CF-Access-Client-Id'), false);
    assert.equal(new TextDecoder().decode(options.body), 'audio');
    return Response.json(fixture);
  });
  assert(called); assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), fixture);
  assert(!response.headers.has('X-Pronunciation-Api-Key'));
});

test('proxy rejects invalid settings, non-audio bodies and oversize streamed uploads before upstream work', async () => {
  const noFetch = async () => { assert.fail('must not call upstream'); };
  for (const [env, status] of [[{},503],[{...environment,PRONUNCIATION_API_BASE_URL:'bad url'},503],[{...environment,CLOUDFLARE_ACCESS_CLIENT_ID:'id'},503]]) {
    assert.equal((await proxyAnalysis(request(),env,noFetch)).status,status);
  }
  assert.equal((await proxyAnalysis(request('text',{'Content-Type':'text/plain'}),environment,noFetch)).status,415);
  assert.equal((await proxyAnalysis(request('x',{'Content-Length':String(MAX_REQUEST_BYTES+1)}),environment,noFetch)).status,413);
  let canceled = false;
  const stream = new ReadableStream({start(controller){controller.enqueue(new Uint8Array(MAX_REQUEST_BYTES+1));}, cancel(){canceled=true;}});
  const upload = new Request('http://localhost/api/analyze-pronunciation', {method:'POST',headers:{'Content-Type':'multipart/form-data; boundary=demo'},body:stream,duplex:'half'});
  assert.equal((await proxyAnalysis(upload,environment,noFetch)).status,413);
  assert(canceled);
});

test('proxy bounds slow upstream calls and returns useful errors for malformed or failed responses', async () => {
  for (const [response, status] of [[Response.json({observedIPA:'hæt'}),502],[new Response('bad html'),502],[Response.json({detail:'busy'},{status:429}),429],[Response.json({detail:'Unauthorized'},{status:401}),502]]) {
    assert.equal((await proxyAnalysis(request(),environment,async()=>response)).status,status);
  }
  const slowFetch = (_url,{signal}) => new Promise((resolve,reject)=>{
    const timer = setTimeout(()=>resolve(Response.json(fixture)),1000);
    signal.addEventListener('abort',()=>{clearTimeout(timer);reject(signal.reason);},{once:true});
  });
  assert.equal((await proxyAnalysis(request(),environment,slowFetch,5)).status,504);
  assert.equal((await proxyAnalysis(request(),environment,async()=>{throw new Error('offline');})).status,502);
});

test('history drops corrupt data, limits retention, migrates legacy results and exports selected targets', () => {
  const entry = {...fixture,id:'test',recordedAt:'2026-09-30T12:00:00Z'};
  assert.deepEqual(parseHistory('invalid json'),[]);
  assert.deepEqual(parseHistory(JSON.stringify([entry,{id:'bad'}])),[entry]);
  assert.equal(parseHistory(JSON.stringify(Array.from({length:300},(_,id)=>({...entry,id:String(id)})))).length,HISTORY_LIMIT);
  const csv=historyCsv([{...entry,targetWord:'a"b,c'}]);
  assert(csv.includes('"targetSound"')); assert(csv.includes('"a""b,c"'));
  const legacy={id:'old',recordedAt:entry.recordedAt,observedIPA:'kæp',targetWord:'cap',expectedIPA:'kæp',targetVowel:'æ',observedVowel:'æ',canEvaluate:true,evaluationStatus:'correct',message:'過去の結果',vowelCandidateScores:[{vowel:'æ',candidateIPA:'kæp',relativeScorePercent:90}],bestCandidateVowel:'æ',scoreMargin:80,scoreConfidenceStatus:'clear',scoreMarginThreshold:15,scoreMarginThresholdStatus:'provisional',scoreMeaning:'相対スコア',vowelComponentAnalysis:null};
  const migrated=parseHistory(JSON.stringify([legacy]));
  assert.equal(migrated.length,1); assert.equal(migrated[0].soundSlug,'ae'); assert.equal(migrated[0].schemaVersion,3);
  const oldComponents = fixture.soundComponentAnalysis.map(({inferred, ...item})=>({...item,bestCandidate:inferred}));
  const previous = parseHistory(JSON.stringify([{...entry,schemaVersion:2,feedbackBasis:undefined,soundComponentAnalysis:oldComponents}]));
  assert.equal(previous.length,1);
  assert.equal(previous[0].soundComponentAnalysis,null);
  assert.equal(previous[0].feedbackBasis,null);
  assert.deepEqual(previous[0].legacySoundComponentAnalysis,oldComponents);
  assert(csv.includes('"soundComponentAnalysis"'));
});

test('paper feedback provides directional changes and common elements using the shared curriculum', () => {
  const mismatch = JSON.parse(fs.readFileSync(new URL('./fixtures/ae-mismatch.json',import.meta.url)));
  const groups = feedbackGroups(mismatch);
  assert.deepEqual(groups.change.map(item=>item.component),['height','backness']);
  assert.deepEqual(groups.maintain.map(item=>item.component),['rounding','tenseness']);
  assert(componentAdvice(groups.change[0]).includes('舌を低く'));
  assert(componentAdvice(groups.change[1]).includes('舌を前へ'));
  assert(componentAdvice(groups.maintain[0]).includes('丸めない'));
  assert(componentAdvice({component:'tenseness',target:'lax',inferred:'unspecified',matches:null}).includes('比較できません'));
});

test('repeat feedback compares only clear results for the same target and preserves uncertainty', () => {
  const mismatch = JSON.parse(fs.readFileSync(new URL('./fixtures/ae-mismatch.json',import.meta.url)));
  const matched = JSON.parse(fs.readFileSync(new URL('./fixtures/ae-matched.json',import.meta.url)));
  const ambiguous = JSON.parse(fs.readFileSync(new URL('./fixtures/ae-ambiguous.json',import.meta.url)));
  assert.deepEqual(compareAttempts(matched,mismatch),{previousSound:'ʌ',currentSound:'æ',previousDifferences:2,currentDifferences:0});
  assert.equal(compareAttempts(matched,ambiguous),null);
  assert.equal(compareAttempts(ambiguous,mismatch),null);
  assert.equal(compareAttempts(matched,{...mismatch,targetWord:'cat'}),null);
  assert.equal(compareAttempts(matched,undefined),null);
  assert.deepEqual(feedbackGroups(ambiguous),feedbackGroups(mismatch));
  assert(isAnalysisResult(ambiguous));
});
