'use strict';
// TCL IPTV Starter: only free public channels and open-licensed demonstration films.
// Streams redirect directly to the broadcasters. Does not scrape premium services.
const http = require('node:http');
const {URL} = require('node:url');
const PORT = Number.parseInt(process.env.PORT || '10000', 10);
const USERNAME = process.env.IPTV_USERNAME || 'tv';
const PASSWORD = process.env.IPTV_PASSWORD || 'demo-only';
const channels = [
 {id:101,name:'TV Brasil',categoryId:'1',tvgId:'TVBrasil.br',stream:'https://tvbrasil-stream.ebc.com.br/index.m3u8'},
 {id:102,name:'TV Cultura',categoryId:'1',tvgId:'TVCultura.br',stream:'https://player-tvcultura.stream.uol.com.br/live/tvcultura.m3u8'},
 {id:103,name:'TV Câmara',categoryId:'2',tvgId:'TVCamara.br',stream:'https://stream3.camara.gov.br/tv1/manifest.m3u8'},
 {id:104,name:'Canal Gov',categoryId:'2',tvgId:'CanalGov.br',stream:'https://canalgov-stream.ebc.com.br/index.m3u8'}
];
const films = [
 {id:201,name:'Big Buck Bunny',stream:'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',year:'2008'},
 {id:202,name:'Elephants Dream',stream:'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',year:'2006'}
];
function send(res,code,data,type='application/json; charset=utf-8'){
 res.writeHead(code,{'content-type':type,'cache-control':'no-store','x-content-type-options':'nosniff'});
 res.end(typeof data==='string'?data:JSON.stringify(data));
}
function redirect(res,link){res.writeHead(302,{location:link,'cache-control':'no-store'});res.end();}
function base(req){return (process.env.RENDER_EXTERNAL_URL || 'https://'+(req.headers.host || 'localhost')).replace(/\/$/,'');}
function check(user,pass){return user===USERNAME && pass===PASSWORD;}
function unauthorized(res){send(res,401,{user_info:{auth:0,status:'Unauthorized'}});}
function liveList(){return channels.map(c=>({num:c.id,name:c.name,stream_type:'live',stream_id:c.id,stream_icon:'',epg_channel_id:c.tvgId,category_id:c.categoryId,added:'',tv_archive:0,direct_source:''}));}
function movieList(){return films.map(f=>({num:f.id,name:f.name,stream_type:'movie',stream_id:f.id,stream_icon:'',category_id:'3',container_extension:'mp4',rating:'',added:'',direct_source:''}));}
function playlist(req,user,pass){
 const b=base(req),rows=['#EXTM3U'];
 for(const c of channels){
  rows.push('#EXTINF:-1 tvg-id="'+c.tvgId+'" group-title="'+(c.categoryId==='1'?'TV pública':'Institucional')+'",'+c.name);
  rows.push(b+'/live/'+encodeURIComponent(user)+'/'+encodeURIComponent(pass)+'/'+c.id+'.m3u8');
 }
 for(const f of films){
  rows.push('#EXTINF:-1 group-title="Filmes abertos",'+f.name);
  rows.push(b+'/movie/'+encodeURIComponent(user)+'/'+encodeURIComponent(pass)+'/'+f.id+'.mp4');
 }
 return rows.join('\n')+'\n';
}
function handler(req,res){
 if(req.method!=='GET')return send(res,405,{error:'Method not allowed'});
 const url=new URL(req.url,'http://localhost');
 if(url.pathname==='/health')return send(res,200,{status:'ok',channels:channels.length,films:films.length});
 if(url.pathname==='/')return send(res,200,{service:'TCL IPTV Starter',status:'online',health:'/health',note:'Public live TV and demo films only'});
 if(url.pathname==='/player_api.php'||url.pathname==='/get.php'){
  const user=url.searchParams.get('username'),pass=url.searchParams.get('password');
  if(!check(user,pass))return unauthorized(res);
  if(url.pathname==='/get.php')return send(res,200,playlist(req,user,pass),'audio/x-mpegurl; charset=utf-8');
  const action=url.searchParams.get('action');
  if(action==='get_live_categories')return send(res,200,[{category_id:'1',category_name:'TV pública',parent_id:0},{category_id:'2',category_name:'Institucional',parent_id:0}]);
  if(action==='get_live_streams')return send(res,200,liveList());
  if(action==='get_vod_categories')return send(res,200,[{category_id:'3',category_name:'Filmes abertos',parent_id:0}]);
  if(action==='get_vod_streams')return send(res,200,movieList());
  if(action==='get_series_categories'||action==='get_series')return send(res,200,[]);
  if(action==='get_short_epg'||action==='get_simple_data_table')return send(res,200,{epg_listings:[]});
  if(action==='get_vod_info'){
   const f=films.find(x=>String(x.id)===url.searchParams.get('vod_id'));
   if(!f)return send(res,404,{error:'Not found'});
   return send(res,200,{info:{name:f.name,releasedate:f.year,plot:'Blender Foundation CC BY film',movie_image:''},movie_data:{stream_id:f.id,name:f.name,container_extension:'mp4',direct_source:''}});
  }
  const origin=new URL(base(req));
  return send(res,200,{user_info:{username:user,auth:1,status:'Active',exp_date:null,is_trial:'0',active_cons:'0',max_connections:'1',allowed_output_formats:['m3u8','ts']},server_info:{url:origin.hostname,port:'80',https_port:'443',server_protocol:origin.protocol.slice(0,-1),timezone:'America/Sao_Paulo',timestamp_now:Math.floor(Date.now()/1000),time_now:new Date().toISOString()}});
 }
 const match=url.pathname.match(/^\/(live|movie)\/([^/]+)\/([^/]+)\/(\d+)\.(m3u8|ts|mp4)$/);
 if(match){
  let user,pass;try{user=decodeURIComponent(match[2]);pass=decodeURIComponent(match[3]);}catch{return unauthorized(res);}
  if(!check(user,pass))return unauthorized(res);
  const f=(match[1]==='live'?channels:films).find(x=>String(x.id)===match[4]);
  if(!f)return send(res,404,{error:'Stream not found'});
  return redirect(res,f.stream);
 }
 return send(res,404,{error:'Not found'});
}
if(require.main===module)http.createServer(handler).listen(PORT,'0.0.0.0',()=>console.log('TCL IPTV Starter on port '+PORT));
module.exports={handler,channels,films};
