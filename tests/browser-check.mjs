// Run against a local dev server; use PLAYWRIGHT_MODULE and CHROME_PATH when
// using a bundled runtime. No production endpoints or stored audio are used.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { encodeWav } from '../app/practice/audio.ts';
import { resolvePractice, transcriptionToAnalysis } from '../app/api/analyze-pronunciation/transcription.ts';
const require = createRequire(import.meta.url);
const {chromium} = require(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
const base = process.env.BROWSER_CHECK_BASE_URL ?? 'http://127.0.0.1:3100';
const fixture = JSON.parse(fs.readFileSync(new URL('./fixtures/analysis.json',import.meta.url)));
const feedbackFixtures = ['ae-mismatch','ae-matched','ae-ambiguous','ae-retry'].map(name=>JSON.parse(fs.readFileSync(new URL(`./fixtures/${name}.json`,import.meta.url))));
feedbackFixtures.push(...['kʌp','kæp'].map(phonemes=>transcriptionToAnalysis({phonemes,sample_rate:16000},resolvePractice('cap','ae'))));
const microphoneFolder = fs.mkdtempSync(path.join(os.tmpdir(),'elps-browser-microphone-'));
const microphoneFile = path.join(microphoneFolder,'tone.wav');
const tone = new Float32Array(3*16000);
for(let i=0;i<tone.length;i++)tone[i]=0.1*Math.sin(2*Math.PI*440*i/16000);
fs.writeFileSync(microphoneFile,new Uint8Array(await encodeWav(tone,16000).arrayBuffer()));
const browser = await chromium.launch({executablePath:process.env.CHROME_PATH,headless:true,args:['--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream',`--use-file-for-fake-audio-capture=${microphoneFile}`]});
const context = await browser.newContext({permissions:['microphone'], viewport:{width:1280,height:900}});
const page = await context.newPage();
const errors = [];
page.on('pageerror',error=>errors.push(error.message));
try {
  await page.goto(base);
  await page.getByRole('link',{name:'STEP 1 発音知識学習',exact:true}).click();
  await page.getByRole('heading',{name:'発音知識学習',exact:true}).waitFor();
  await page.goto(`${base}/practice?sound=h`);
  await page.getByRole('button',{name:'/h/ 無声声門摩擦音',exact:true}).waitFor();
  assert.equal(await page.getByRole('button',{name:'子音',exact:true}).getAttribute('aria-pressed'),'true');
  let uploads=0;
  await page.route('**/api/analyze-pronunciation',async route=>{
    uploads++;
    const body=route.request().postData();
    assert(body.includes('name="sound_slug"\r\n\r\nh'));
    assert(body.includes('name="target_word"\r\n\r\nhat'));
    assert(body.includes('Content-Type: audio/wav'));
    assert(body.includes('RIFF'));
    assert(!body.includes('local-verification-key'));
    if(uploads===1) await route.fulfill({status:422,contentType:'application/json',body:JSON.stringify({error:'声を確認できませんでした。もう一度録音してください。'})});
    else if(uploads===2) await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(fixture)});
    else if(uploads===3) await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({observedIPA:'hæt'})});
    else {
      await new Promise(resolve=>setTimeout(resolve,1000));
      await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(fixture)}).catch(()=>{});
    }
  });
  async function record() {
    await page.getByRole('button',{name:'録音を開始',exact:true}).click();
    await page.getByRole('button',{name:'録音を停止して解析',exact:true}).waitFor();
    await page.waitForTimeout(400);
    await page.getByRole('button',{name:'録音を停止して解析',exact:true}).click();
  }
  await record();
  await page.getByText('声を確認できませんでした。もう一度録音してください。',{exact:true}).waitFor();
  await record();
  await page.getByRole('heading',{name:'構成要素に基づく発音フィードバック',exact:true}).waitFor();
  await page.getByText('構成要素を比べる',{exact:true}).waitFor();
  await page.getByText('録音結果の履歴・データ出力（1件）',{exact:true}).click();
  assert.equal(await page.getByRole('cell',{name:'hat',exact:true}).count(),1);
  await page.reload();
  await page.getByText('録音結果の履歴・データ出力（1件）',{exact:true}).waitFor();
  await record();
  await page.getByText('解析結果を読み取れませんでした。もう一度お試しください。',{exact:true}).waitFor();
  await record();
  await page.getByRole('button',{name:'判定を中止',exact:true}).click();
  await page.getByText('解析を中止しました。もう一度録音できます。',{exact:true}).waitFor();
  // Leaving during recording must release the microphone, without uploading.
  await page.evaluate(()=>{
    window.__tracks=[];
    const original=navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    navigator.mediaDevices.getUserMedia=async options=>{const stream=await original(options);window.__tracks.push(...stream.getTracks());return stream;};
  });
  await page.getByRole('button',{name:'録音を開始',exact:true}).click();
  await page.getByRole('button',{name:'録音を停止して解析',exact:true}).waitFor();
  await page.getByRole('link',{name:'STEP 2 発音構成理解',exact:true}).click();
  await page.getByRole('heading',{name:'発音構成理解',exact:true}).waitFor();
  assert(await page.evaluate(()=>window.__tracks.every(track=>track.readyState==='ended')));
  // Paper example: /ae/ target, inferred /uh/, two changes and two common features.
  await page.unroute('**/api/analyze-pronunciation');
  let feedbackUploads=0;
  await page.route('**/api/analyze-pronunciation',async route=>{
    const body=route.request().postData();
    assert(body.includes('name="sound_slug"\r\n\r\nae'));
    assert(body.includes('name="target_word"\r\n\r\ncap'));
    await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(feedbackFixtures[feedbackUploads++])});
  });
  await page.goto(`${base}/practice?sound=ae`);
  await page.getByRole('button',{name:'cap /kæp/',exact:true}).click();
  await record();
  await page.getByRole('heading',{name:'変更する要素（差）',exact:true}).waitFor();
  assert.equal(await page.getByRole('cell',{name:'変更',exact:true}).count(),2);
  assert.equal(await page.getByRole('cell',{name:'維持',exact:true}).count(),2);
  assert(await page.getByText('舌を低くする方向を意識しましょう。',{exact:false}).count());
  assert(await page.getByText('舌を前へ動かす方向を意識しましょう。',{exact:false}).count());
  await page.screenshot({path:'/tmp/elps-feedback-desktop.png',fullPage:true,animations:'disabled'});
  await page.locator('section[aria-labelledby="analysis-title"]').screenshot({path:'/tmp/elps-feedback-panel.png',animations:'disabled'});
  await page.setViewportSize({width:390,height:844});
  await page.waitForTimeout(250);
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth));
  await page.screenshot({path:'/tmp/elps-feedback-mobile.png',fullPage:true,animations:'disabled'});
  await page.locator('section[aria-labelledby="analysis-title"]').screenshot({path:'/tmp/elps-feedback-panel-mobile.png',animations:'disabled'});
  await page.getByRole('button',{name:'同じ単語でもう一度録音',exact:true}).click();
  await page.getByRole('button',{name:'録音を停止して解析',exact:true}).waitFor();
  assert(await page.getByText('直前の解析結果です。今回の録音はまだ解析されていません。',{exact:true}).count());
  assert(await page.getByRole('button',{name:'同じ単語でもう一度録音',exact:true}).isDisabled());
  await page.waitForTimeout(400);
  await page.getByRole('button',{name:'録音を停止して解析',exact:true}).click();
  await page.getByRole('heading',{name:'前回の録音と比べる（同じ単語・対象音）',exact:true}).waitFor();
  assert(await page.getByText('目標と異なる構成要素 2 → 0項目',{exact:false}).count());
  assert.equal(await page.getByRole('cell',{name:'維持',exact:true}).count(),4);
  await record();
  await page.getByText('推定音が正しい場合の参考です。',{exact:false}).waitFor();
  assert.equal(await page.getByRole('cell',{name:'変更',exact:true}).count(),2);
  assert.equal(await page.getByRole('heading',{name:'前回の録音と比べる（同じ単語・対象音）',exact:true}).count(),0);
  await page.getByRole('button',{name:'白背景と黒背景を切り替える',exact:true}).click();
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth));
  await page.screenshot({path:'/tmp/elps-feedback-dark.png',fullPage:true,animations:'disabled'});
  await record();
  await page.getByText('単語全体を確認できませんでした。',{exact:false}).waitFor();
  assert.equal(await page.getByRole('heading',{name:'変更する要素（差）',exact:true}).count(),0);
  // The new API provides phonemes without a confidence score.
  await record();
  await page.getByText('確かさの数値なし・参考フィードバック',{exact:true}).waitFor();
  assert.equal(await page.getByRole('cell',{name:'変更',exact:true}).count(),2);
  await page.getByText('音素転写・候補比較の詳細',{exact:true}).click();
  await page.getByText('候補スコア・確かさの数値はありません。',{exact:false}).waitFor();
  assert.equal(await page.getByText('候補差：',{exact:false}).count(),0);
  await record();
  await page.getByText('認識の確かさの数値がないため、前回との比較も参考として確認してください。',{exact:true}).waitFor();
  assert(await page.getByText('目標と異なる構成要素 2 → 0項目',{exact:false}).count());
  await page.getByRole('link',{name:'構成要素を組み立てて確認',exact:true}).click();
  await page.getByRole('button',{name:'/æ/ の問題',exact:true}).waitFor();
  assert.equal(await page.getByRole('button',{name:'/æ/ の問題',exact:true}).getAttribute('aria-pressed'),'true');
  // Mobile layout and theme.
  await page.goto(`${base}/practice?sound=uh`);
  await page.getByRole('button',{name:'/ʌ/ 強勢のある中舌母音',exact:true}).waitFor();
  assert.equal(await page.locator('html').getAttribute('data-theme'),'dark');
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth));
  await page.waitForTimeout(250);
  const colors = await page.locator('body').evaluate(element => ({background:getComputedStyle(element).backgroundColor,color:getComputedStyle(element).color}));
  assert.equal(colors.background,'rgb(2, 6, 23)');
  assert.equal(colors.color,'rgb(248, 250, 252)');
  await page.screenshot({path:'/tmp/elps-practice-mobile.png',fullPage:true,animations:'disabled'});
  assert.deepEqual(errors,[]);
  console.log('Browser checks passed: navigation, selected target upload, retry, result/history, reload, malformed response, cancel, microphone cleanup, paper feedback, repeat comparison, ambiguity/retry, target-linked review, mobile/theme.');
} finally { await browser.close(); fs.rmSync(microphoneFolder,{recursive:true,force:true}); }
