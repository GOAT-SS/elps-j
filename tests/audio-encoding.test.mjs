import {test} from 'node:test';
import assert from 'node:assert/strict';
import {encodeWav} from '../app/practice/audio.ts';
test('WAV encoding produces a valid mono PCM header and signed 16-bit samples',async()=>{
 const blob=encodeWav(new Float32Array([-2,-1,-0.5,0,0.5,1,2]),16000);
 assert.equal(blob.type,'audio/wav');
 const data=new DataView(await blob.arrayBuffer());
 const ascii=(start,count)=>String.fromCharCode(...new Uint8Array(data.buffer,start,count));
 assert.equal(ascii(0,4),'RIFF');assert.equal(ascii(8,4),'WAVE');assert.equal(ascii(12,4),'fmt ');assert.equal(ascii(36,4),'data');
 assert.equal(data.getUint32(4,true),blob.size-8);assert.equal(data.getUint16(20,true),1);assert.equal(data.getUint16(22,true),1);
 assert.equal(data.getUint32(24,true),16000);assert.equal(data.getUint32(28,true),32000);assert.equal(data.getUint16(34,true),16);assert.equal(data.getUint32(40,true),14);
 assert.deepEqual(Array.from({length:7},(_,i)=>data.getInt16(44+i*2,true)),[-32768,-32768,-16384,0,16383,32767,32767]);
});
