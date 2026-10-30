// HK MTR Next Train — Scriptable (original implementation, 2026)
// Uses the MTR official open-data API. No API key; no third-party server.
// Note: this is a fresh public-repo implementation, not a copy of a private script.
// Widget refreshAfterDate is an earliest request, not an iOS scheduling guarantee.

const BASE = 'https://rt.data.gov.hk/v1/transport/mtr/getSchedule.php';
const HK_OFFSET = 8 * 3600000;
const DAY_MS = 86400000;
const DAY_NAMES = ['日','一','二','三','四','五','六'];
const LINE_DATA = {
  TWL: { name:'荃灣綫', color:'#FA5962', stations:'CEN:中環,ADM:金鐘,TST:尖沙咀,JOR:佐敦,YMT:油麻地,MOK:旺角,PRE:太子,SSP:深水埗,CSW:長沙灣,LCK:荔枝角,MEF:美孚,LAK:荔景,KWF:葵芳,KWH:葵興,TWH:大窩口,TSW:荃灣' },
  ISL: { name:'港島綫', color:'#438ACD', stations:'KET:堅尼地城,HKU:香港大學,SYP:西營盤,SHW:上環,CEN:中環,ADM:金鐘,WAC:灣仔,CAB:銅鑼灣,TIH:天后,FOH:炮台山,NOP:北角,QUB:鰂魚涌,TAK:太古,SWH:西灣河,SKW:筲箕灣,HFC:杏花邨,CHW:柴灣' },
  KTL: { name:'觀塘綫', color:'#56AD67', stations:'WHA:黃埔,HOM:何文田,YMT:油麻地,MOK:旺角,PRE:太子,SKM:石硤尾,KOT:九龍塘,LOF:樂富,WTS:黃大仙,DIH:鑽石山,CHH:彩虹,KOB:九龍灣,NTK:牛頭角,KWT:觀塘,LAT:藍田,YAT:油塘,TIK:調景嶺' },
  TCL: { name:'東涌綫', color:'#EE9A46', stations:'HOK:香港,KOW:九龍,OLY:奧運,NAC:南昌,LAK:荔景,TSY:青衣,SUN:欣澳,TUC:東涌' },
  TKL: { name:'將軍澳綫', color:'#A56DA8', stations:'NOP:北角,QUB:鰂魚涌,YAT:油塘,TIK:調景嶺,TKO:將軍澳,HAH:坑口,POA:寶琳,LHP:康城' },
  EAL: { name:'東鐵綫', color:'#73B9B0', stations:'ADM:金鐘,EXC:會展,HUH:紅磡,MKK:旺角東,KOT:九龍塘,TAW:大圍,SHT:沙田,FOT:火炭,RAC:馬場,UNI:大學,TAP:大埔墟,TWO:太和,FAN:粉嶺,SHS:上水,LOW:羅湖,LMC:落馬洲' },
  TML: { name:'屯馬綫', color:'#A88960', stations:'WKS:烏溪沙,MOS:馬鞍山,HEO:恆安,TSH:大水坑,SHM:石門,CIO:第一城,STW:沙田圍,CKT:車公廟,TAW:大圍,HIK:顯徑,DIH:鑽石山,KAT:啟德,SUW:宋皇臺,TKW:土瓜灣,HOM:何文田,HUH:紅磡,ETS:尖東,AUS:柯士甸,NAC:南昌,MEF:美孚,TWW:荃灣西,KSR:錦上路,YUL:元朗,LOP:朗屏,TIS:天水圍,SIH:兆康,TUM:屯門' },
  SIL: { name:'南港島綫', color:'#B6CB48', stations:'ADM:金鐘,OCP:海洋公園,WCH:黃竹坑,LET:利東,SOH:海怡半島' },
  AEL: { name:'機場快綫', color:'#4593A6', stations:'HOK:香港,KOW:九龍,TSY:青衣,AIR:機場,AWE:博覽館' },
  DRL: { name:'迪士尼綫', color:'#DC8EA6', stations:'SUN:欣澳,DIS:迪士尼' }
};
const stations = Object.fromEntries(Object.entries(LINE_DATA).map(([code,line]) =>
  [code,line.stations.split(',').map(part => { const i=part.indexOf(':'); return { code:part.slice(0,i),name:part.slice(i+1) }; })]));
const stationNames = {};
for (const ss of Object.values(stations)) for (const s of ss) stationNames[s.code]=s.name;
const fm=FileManager.local();
const root=fm.joinPath(fm.documentsDirectory(),'HKMTR');
if (!fm.fileExists(root)) fm.createDirectory(root,true);
const own=fm.joinPath(root,Script.name().replace(/[\\/:*?"<>|]/g,'_'));
if (!fm.fileExists(own)) fm.createDirectory(own,true);
const favoriteFile=fm.joinPath(own,'favourite.json');
const settingsFile=fm.joinPath(own,'adaptive.json');
function readJSON(path,other){try{return fm.fileExists(path)?JSON.parse(fm.readString(path)):other;}catch(_){return other;}}
function saveJSON(path,obj){fm.writeString(path,JSON.stringify(obj));}
const defaults={adaptive:true,workdays:[1,2,3,4,5],morning:{start:'07:30',end:'09:30'},evening:{start:'18:00',end:'20:00'}};
let pref=readJSON(settingsFile,defaults);
if(!pref||typeof pref!=='object')pref={...defaults};
let favorite=readJSON(favoriteFile,null);
function hhmm(v){const d=v instanceof Date?v:new Date(v); if(isNaN(d.getTime()))return '--:--'; const k=new Date(d.getTime()+HK_OFFSET);return String(k.getUTCHours()).padStart(2,'0')+':'+String(k.getUTCMinutes()).padStart(2,'0');}
function parseHK(s){if(typeof s!=='string')return null;const m=/^(\d{4})-(\d\d)-(\d\d) (\d\d):(\d\d):(\d\d)$/.exec(s);if(!m)return null;const d=new Date(Date.UTC(+m[1],+m[2]-1,+m[3],+m[4]-8,+m[5],+m[6]));return isNaN(d.getTime())?null:d;}
function clockMin(v){const p=String(v).split(':').map(Number);return p[0]*60+p[1];}
function goodClock(v){return /^([01]\d|2[0-3]):[0-5]\d$/.test(String(v));}
function windowOkay(w){return w&&goodClock(w.start)&&goodClock(w.end)&&clockMin(w.start)<clockMin(w.end);}
function activeCommute(now){const hk=new Date(now.getTime()+HK_OFFSET);const day=hk.getUTCDay();const minutes=hk.getUTCHours()*60+hk.getUTCMinutes();const workdays=Array.isArray(pref.workdays)?pref.workdays:defaults.workdays;
  return workdays.includes(day)&&[pref.morning,pref.evening].some(w=>windowOkay(w)&&minutes>=clockMin(w.start)-10&&minutes<clockMin(w.end));}
function refreshPlan(now=new Date()){
  if(!pref.adaptive)return {mode:'固定',next:new Date(now.getTime()+60000)};
  const hk=new Date(now.getTime()+HK_OFFSET), day=hk.getUTCDay(), minute=hk.getUTCHours()*60+hk.getUTCMinutes();
  const workdays=Array.isArray(pref.workdays)?pref.workdays:defaults.workdays;
  const active=activeCommute(now);
  const interval=active?60000:(workdays.includes(day)&&minute>=7*60&&minute<20*60?5*60000:15*60000);
  let next=now.getTime()+interval;
  const midnight=Date.UTC(hk.getUTCFullYear(),hk.getUTCMonth(),hk.getUTCDate());
  for(let offset=0;offset<8;offset++){
    const dayMs=midnight+offset*DAY_MS,weekday=new Date(dayMs).getUTCDay();
    if(!workdays.includes(weekday))continue;
    for(const w of [pref.morning,pref.evening]){
      if(!windowOkay(w))continue;
      const wake=dayMs+clockMin(w.start)*60000-HK_OFFSET-10*60000;
      if(wake>now.getTime())next=Math.min(next,wake);
    }
  }
  return {mode:active?'通勤':'低頻',next:new Date(next)};
}
async function menu(title,items,description=''){
 const a=new Alert();a.title=title;a.message=description;for(const s of items)a.addAction(s);a.addCancelAction('取消');const index=await a.presentSheet();return index>=0&&index<items.length?index:-1;
}
async function prompt(title,initial,placeholder=''){
 const a=new Alert();a.title=title;a.addTextField(placeholder||title,String(initial));a.addAction('儲存');a.addCancelAction('取消');return await a.presentAlert()===0?a.textFieldValue(0).trim():null;
}
async function info(title,message){const a=new Alert();a.title=title;a.message=message;a.addAction('知道');await a.presentAlert();}
async function selectFavorite(){
 const lines=Object.keys(LINE_DATA),li=await menu('選擇港鐵路線',lines.map(c=>LINE_DATA[c].name+' '+c));if(li<0)return false;
 const line=lines[li],ss=stations[line],st=await menu('選擇車站',ss.map(s=>s.name+' '+s.code));if(st<0)return false;
 const direction=await menu('選擇方向',['UP — 上行','DOWN — 下行','BOTH — 兩方向']);if(direction<0)return false;
 favorite={line,station:ss[st].code,direction:['UP','DOWN','BOTH'][direction]};saveJSON(favoriteFile,favorite);return true;
}
async function getTrain(){
 if(!favorite)throw Error('請先設定車站');
 const r=new Request(`${BASE}?line=${encodeURIComponent(favorite.line)}&sta=${encodeURIComponent(favorite.station)}&lang=TC`);r.timeoutInterval=config.runsInWidget?8:15;
 const json=await r.loadJSON();if(!json||Number(json.status)!==1)throw Error(json?.message||'港鐵服務資料暫不可用');
 const key=favorite.line+'-'+favorite.station,obj=json.data?.[key]||{},direction=favorite.direction||'UP';
 const rows=direction==='BOTH'?['UP','DOWN'].flatMap(d=>(obj[d]||[]).map(t=>({...t,direction:d}))):(obj[direction]||[]).map(t=>({...t,direction}));
 const trains=rows.map(t=>({...t,arrival:parseHK(t.time)})).filter(t=>t.arrival&&t.arrival.getTime()>=Date.now()-30000)
 .sort((a,b)=>a.arrival-b.arrival).slice(0,3);
 const stamp=parseHK(obj.sys_time)||parseHK(json.sys_time)||parseHK(obj.curr_time)||parseHK(json.curr_time);
 const stale=!!stamp&&(Date.now()-stamp.getTime()>120000);
 return {trains,stamp,stale,delayed:String(json.isdelay||'').toUpperCase()==='Y',checked:new Date()};
}
const C={bg:'#132534',panel:'#1E3648',fg:'#F7FAFC',mute:'#9FB1C4',accent:'#FF646B',blue:'#8AD8FC'};
function t(parent,s,size,color=C.fg,bold=false){const v=parent.addText(String(s));v.font=bold?Font.boldSystemFont(size):Font.systemFont(size);v.textColor=new Color(color);v.lineLimit=1;v.minimumScaleFactor=.75;return v;}
function rowTrain(w,x,i,primary){
 const r=w.addStack();r.centerAlignContent();
 if(primary){
   const left=r.addStack();left.layoutVertically();
   t(left,'下一班 · '+(x?.direction==='UP'?'上行':'下行'),11,C.accent,true);
   left.addSpacer(4);
   t(left,x?String(Math.max(0,Math.ceil((x.arrival.getTime()-Date.now())/60000))):'—',32,C.fg,true);
   t(left,'分鐘',14,C.fg,true);
   r.addSpacer();
   const right=r.addStack();right.layoutVertically();
   t(right,x?'往 '+(stationNames[x.dest]||x.dest||'—'):'未有班次',12,C.mute);
   right.addSpacer(3);t(right,x?hhmm(x.arrival):'--:--',22,C.fg,true);
 }else{
   t(r,(i+1)+' 班 · '+(x?'往 '+(stationNames[x.dest]||x.dest||'—'):'未有班次'),12,C.mute);
   r.addSpacer();
   t(r,x?Math.max(0,Math.ceil((x.arrival.getTime()-Date.now())/60000))+' 分鐘':'—',19,C.fg,true);
 }
}
async function showWidget(){
 const w=new ListWidget();w.backgroundColor=new Color(C.bg);w.setPadding(10,12,9,12);
 w.url=URLScheme.forRunningScript();w.refreshAfterDate=refreshPlan().next;
 if(!favorite){t(w,'🚇 港鐵 ETA',20,C.fg,true);w.addSpacer(10);t(w,'開啟 Scriptable 設定車站',11,C.mute);Script.setWidget(w);Script.complete();return;}
 const line=LINE_DATA[favorite.line],station=stations[favorite.line]?.find(s=>s.code===favorite.station)?.name||favorite.station;
 const head=w.addStack();head.centerAlignContent();t(head,'🚇  '+station,22,C.fg,true);head.addSpacer();t(head,'↻',22,C.blue,true);
 const route=w.addStack();t(route,line.name,14,line.color,true);route.addSpacer(6);t(route,favorite.direction==='BOTH'?'雙方向':favorite.direction==='UP'?'上行':'下行',14,C.fg,true);
 w.addSpacer(6);
 try{
   const record=await getTrain();
   const card=w.addStack();card.backgroundColor=new Color(C.panel);card.cornerRadius=12;card.setPadding(8,11,8,11);card.layoutVertically();
   if(record.trains.length){rowTrain(card,record.trains[0],0,true);w.addSpacer(8);rowTrain(w,record.trains[1],1,false);w.addSpacer(6);rowTrain(w,record.trains[2],2,false);}
   else{t(card,'目前未有列車預報',14,C.fg);w.addSpacer(8);t(w,'可能已收車或資料未提供',10,C.mute);}
   w.addSpacer(6);
   t(w,(record.stale?'⚠ 資料可能延遲 · ':activeCommute(new Date())?'⚡ 通勤 · ':'')+'更新 '+(record.stamp?hhmm(record.stamp):hhmm(record.checked)),10,C.mute);
 }catch(e){w.addSpacer(10);t(w,'⚠ '+String(e.message||e).slice(0,27),11,C.accent);}
 Script.setWidget(w);Script.complete();
}
async function chooseWorkdays(){
 let days=Array.isArray(pref.workdays)?pref.workdays.slice():defaults.workdays.slice();
 while(true){const order=[1,2,3,4,5,6,0],i=await menu('選擇返工日',order.map(d=>(days.includes(d)?'✓ ':'○ ')+'星期'+DAY_NAMES[d]).concat('✅ 完成'));
  if(i<0)return;if(i===7){pref.workdays=days;saveJSON(settingsFile,pref);return;}
  const d=order[i];days=days.includes(d)?days.filter(x=>x!==d):[...days,d];
 }
}
async function editWindow(which){
 const old=windowOkay(pref[which])?pref[which]:defaults[which];
 const start=await prompt('開始時間 (HH:MM)',old.start);if(start===null)return;
 const end=await prompt('結束時間 (HH:MM)',old.end);if(end===null)return;
 const candidate={start,end};if(!windowOkay(candidate)){await info('時間格式錯誤','請用 24 小時 HH:MM 格式，開始需早於結束。');return;}
 pref[which]=candidate;saveJSON(settingsFile,pref);
}
async function settings(){
 while(true){const i=await menu('⚙ 通勤模式',[`智能刷新：${pref.adaptive?'開啟':'關閉'}`,'工作日：'+(pref.workdays||[]).map(d=>'週'+DAY_NAMES[d]).join('、'),`返工 ${pref.morning.start}–${pref.morning.end}`,`放工 ${pref.evening.start}–${pref.evening.end}`,'完成'], '智能刷新只影響最早可刷新時間；iOS 可能延遲。');
 if(i===-1||i===4)return;if(i===0){pref.adaptive=!pref.adaptive;saveJSON(settingsFile,pref);}if(i===1)await chooseWorkdays();if(i===2)await editWindow('morning');if(i===3)await editWindow('evening');
 }
}
async function showApp(){
 if(!favorite&&!(await selectFavorite())){Script.complete();return;}
 while(true){
  let record;try{record=await getTrain();}catch(e){record={error:String(e.message||e),trains:[]};}
  const line=LINE_DATA[favorite.line],station=stations[favorite.line].find(s=>s.code===favorite.station)?.name||favorite.station;
  const summary=record.error?'⚠ '+record.error:(record.trains.length?record.trains.map((x,i)=>`${i+1}. 往${stationNames[x.dest]||x.dest} ${Math.max(0,Math.ceil((x.arrival-Date.now())/60000))}分鐘 / ${hhmm(x.arrival)}`).join('\n'):'暫無列車資料');
  const i=await menu(`🚇 ${station} · ${line.name}`,[ '🔄 即時查詢','🚉 更改路線／站／方向','⚙ 智能刷新／工作日／時段','關閉'],summary);
  if(i<0||i===3)break;
  if(i===1)await selectFavorite();
  if(i===2)await settings();
 }
 Script.complete();
}
if(config.runsInWidget)await showWidget();else try{await showApp();}catch(e){await info('港鐵 ETA 錯誤',String(e.message||e));Script.complete();}