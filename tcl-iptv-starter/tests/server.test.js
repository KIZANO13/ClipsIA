'use strict';
const test=require('node:test'), assert=require('node:assert/strict'), http=require('node:http');
const {handler}=require('../server');
const username=process.env.IPTV_USERNAME || 'tv';
const password=process.env.IPTV_PASSWORD || 'demo-only';
const auth='?username='+encodeURIComponent(username)+'&password='+encodeURIComponent(password);
async function withServer(cb){const server=http.createServer(handler);await new Promise(ok=>server.listen(0,'127.0.0.1',ok));try{await cb('http://127.0.0.1:'+server.address().port);}finally{await new Promise(ok=>server.close(ok));}}
test('health and auth',async()=>withServer(async base=>{
 const r=await fetch(base+'/health');assert.equal(r.status,200);assert.equal((await r.json()).channels,4);
 assert.equal((await fetch(base+'/player_api.php?username=no&password=no')).status,401);
 assert.equal((await(await fetch(base+'/player_api.php'+auth)).json()).user_info.auth,1);
}));
test('catalog and playlist',async()=>withServer(async base=>{
 assert.equal((await(await fetch(base+'/player_api.php'+auth+'&action=get_live_streams')).json()).length,4);
 const m=await(await fetch(base+'/get.php'+auth)).text();
 assert.ok(m.includes('#EXTM3U'));assert.ok(m.includes('Big Buck Bunny'));
 const r=await fetch(base+'/live/'+encodeURIComponent(username)+'/'+encodeURIComponent(password)+'/101.m3u8',{redirect:'manual'});assert.equal(r.status,302);
}));
