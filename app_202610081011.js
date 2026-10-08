const $=s=>document.querySelector(s);
const esc=v=>String(v??'—').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const short=n=>n.includes('知識問答')?'資訊科技知識問答':n.includes('手機網站')?'手機網站技術技能':n.includes('人工智能')?'AI 未來創新競賽':n;
const ids=t=>String(t??'').match(/[^\s、/：:]+_\d+_[^\s、/；;]+/g)||[];
const student=t=>{const a=t.split('_');return `<span class="student">${esc(a[2]||t)}<small>${esc(a[0])}${a[1]&&a[1]!=='0'?' · '+esc(a[1])+' 號':''}</small></span>`;};
// 公開版而且不公開姓名時，才隱藏名單及成績。
const closed=()=>data.publicMode&&!data.showNames;
const url=v=>{try{const u=new URL(v);return ['https:','http:'].includes(u.protocol)?u.href:null;}catch{return null;}};
const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Macau',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const titles={admissions:['升學加分','澳門・香港・內地｜依原指南保留官方來源與核實日期。'],overview:['比賽資訊','先看重要日期，按需要展開詳情。'],attendance:['我的出席位置','搜尋姓名或班級，查看比賽課室。'],results:['榮譽榜','學生和學長的獎項、入圍及晉級，由近到遠。'],rules:['章程與資料','通知、追蹤紀錄及來源檔案。']};
const publicTitles={attendance:['到場時間及課室','各組最遲到場時間、比賽時間及課室。'],results:['榮譽榜','學生和學長的獎項、入圍及晉級，由近到遠。'],rules:['官方資料','各項比賽的官方網站及公告。']};
let data,view='overview',query='',group='',staticMode=Boolean(document.querySelector('meta[name="site-mode"][content="static"]')),refreshing=false;
let resultYear='all',lastSync=0;
const opened=new Set();
const kv=entries=>`<dl class="kv">${entries.filter(x=>x[1]!==null&&x[1]!==undefined&&x[1]!=='').map(([k,v])=>`<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl>`;
const match=r=>JSON.stringify(r).toLowerCase().includes(query.toLowerCase());
function quizTeams(){return data.details.filter(r=>r['比賽名稱'].includes('知識問答'));}
function arrival(r){return r['最遲到場時間（澳門）']||'待確認';}
function notification(r){return `${ids(r['報名學生(Class_No_Name)']).map(s=>s.split('_')[2]).join('、')}同學：\n你們參加「2026年全澳中學生資訊科技知識問答比賽」${r['組別']}初賽。\n日期：${r['比賽日期']}（${new Date(r['比賽日期']+'T12:00:00+08:00').toLocaleDateString('zh-Hant',{weekday:'long',timeZone:'Asia/Macau'})}）\n最遲到場：${arrival(r)}\n比賽時間：${r['初賽時間（澳門）']}（澳門時間）\n地點：${r['比賽地點']}（澳門士多鳥拜斯大馬路）\n請帶備學生證或身份證明文件。兩名隊員都必須出席，共同作答一份試卷；任何一人缺席，該隊將作棄權處理。逾時不獲補時。`;
}
function dateBadge(date){if(!/^\d{4}-\d{2}-\d{2}$/.test(date||''))return '<div class="date-block"><small>日期</small><strong>—</strong></div>';return `<div class="date-block"><small>${Number(date.slice(5,7))} 月</small><strong>${Number(date.slice(8,10))}</strong></div>`;}
function nextEvent(c,rows){const out=[];if(/^\d{4}-\d{2}-\d{2}$/.test(c['報名截止日期']))out.push([c['報名截止日期'],c['比賽名稱'].includes('CSP')?'第二輪回覆截止':'報名截止']);for(const r of rows){for(const key of ['比賽日期','決賽日期'])if(/^\d{4}-\d{2}-\d{2}$/.test(r[key]))out.push([r[key],key==='比賽日期'?(c['比賽名稱'].includes('CSP')?'第一輪':'初賽／初評'):(c['比賽名稱'].includes('CSP')?'第二輪認證':'決賽')]);}out.sort((a,b)=>a[0].localeCompare(b[0]));return out.find(e=>e[0]>=today())||out.at(-1)||['','日期待公布'];}
function competition(c,i){const rows=data.details.filter(r=>r['比賽名稱']===c['比賽名稱']),next=nextEvent(c,rows),key=`competition-${i}`;
 const teamList=rows.map(r=>`<div class="team-row"><div class="students">${ids(r['報名學生(Class_No_Name)']).map(student).join('')||esc(r['報名學生(Class_No_Name)'])}</div><p>${esc(r['學部'])} · ${esc(r['組別'])}${r['參賽作品名稱']?' · '+esc(r['參賽作品名稱']):''}</p><p>${esc(r['比賽結果'])}</p></div>`).join('');
 const stages=new Map();for(const r of rows){for(const [d,t,p,label] of [['比賽日期','初賽時間（澳門）','比賽地點','初賽／初評'],['決賽日期','決賽時間（澳門）','決賽地點',c['比賽名稱'].includes('CSP')?'第二輪':'決賽']]){if(!r[d])continue;const k=[r[d],r[t],label].join('|');if(!stages.has(k))stages.set(k,`${label}：${r[d]} ${r[t]||''}\n${r[p]||''}`);}}
 const official=url(rows[0]?._links?.['今年官方網站'])||url(rows[0]?.['今年官方網站']);
 return `<details class="card" data-open-key="${key}" ${opened.has(key)?'open':''}><summary>${dateBadge(next[0])}<div class="competition-title"><h2>${esc(short(c['比賽名稱']))}</h2><p>${esc(next[0])} · ${esc(next[1])}</p></div><span class="chevron">›</span></summary><div class="detail-body">${kv([['舉辦機構',c['舉辦機構']],['賽程',c['比賽日期']||Array.from(stages.values()).join('\n\n')],['地點',c['比賽地點']],['報名截止',c['報名截止日期']],['費用',c['費用']],['指導老師',c['指導老師']],['目前進度',String(c['比賽結果']||'').replace(/[^\s、/：:_]+_0_([^\s、/；;]+)/g,'$1')]])}${c['比賽名稱'].includes('知識問答')?`<button class="primary" data-go="attendance">${closed()?'查看各組時間及課室':'查詢出席位置'}</button>`:''}${c['比賽名稱'].includes('CSP')&&!closed()?'<button class="primary" data-go="results">查看個人成績</button>':''}${official?` <a class="text-button" href="${esc(official)}" target="_blank" rel="noopener">官方網站</a>`:''}<details class="subdetail" ${closed()?'hidden':''}><summary>參賽名單與結果<span class="chevron">›</span></summary>${teamList}</details><details class="subdetail"><summary>參賽規則及其他安排<span class="chevron">›</span></summary>${kv([['參賽資格',c['可接受報名級別及人數']],['其他階段',[...new Set(rows.map(r=>r['其他階段']).filter(Boolean))].join('\n')],['待確認事項',[...new Set(rows.map(r=>r['差異及待確認事項']).filter(Boolean))].join('\n')]])}</details></div></details>`;
}
function overview(){const q=quizTeams()[0],date=q?.['比賽日期']||'',d=new Date(date+'T12:00:00+08:00');const label=date?`${Number(date.slice(5,7))} 月 ${Number(date.slice(8,10))} 日 · ${d.toLocaleDateString('zh-Hant',{weekday:'long',timeZone:'Asia/Macau'})}`:'初賽安排';const times=[...new Map(quizTeams().map(r=>[r['組別'],r])).values()].map(r=>`${r['組別']} ${arrival(r)} 到場`).join(' · ');return `${date>=today()?`<section class="featured card"><div><p class="eyebrow">${esc(label)}</p><h2>資訊科技知識問答初賽</h2><p>高美士中葡中學 · ${esc(times)}</p></div><button class="primary" data-go="attendance">${closed()?'查看時間及課室':'查詢出席位置'}</button></section>`:''}<div class="section-heading"><h2>本年度比賽</h2><small>點開查看詳情</small></div>${data.competitions.map(competition).join('')}`;}
function searchbar(options,label='搜尋姓名或班級',filterLabel='篩選組別'){return `<div class="searchbar"><input id="search" type="search" placeholder="${label}" aria-label="${label}" value="${esc(query)}"><select id="group" aria-label="${esc(filterLabel)}">${options.map(([v,t])=>`<option value="${esc(v)}" ${v===group?'selected':''}>${esc(t)}</option>`).join('')}</select></div>`;}
function attendance(){if(closed())return publicAttendance();const first=quizTeams()[0], date=first?.['比賽日期']||'待公布';const groups=[...new Map(quizTeams().map(r=>[r['組別'],r])).values()];const teams=quizTeams().filter(r=>match(r)&&(!group||r['組別']===group));return `<section class="card venue"><h2>${esc(date)} · 高美士中葡中學</h2><p>主大樓二樓 · 澳門士多鳥拜斯大馬路</p><div class="times">${groups.map(r=>`<div><strong>${esc(arrival(r))}</strong>${esc(r['組別'].replace('組',''))}到場</div>`).join('')}</div><p class="notice-rule">帶備學生證或身份證明文件。兩位隊員均須出席，任何一人缺席將作棄權處理。</p></section>${searchbar([['','所有組別'],['初中組','初中組'],['高中組','高中組']])}<div class="attendance-grid">${teams.map(r=>`<article class="card"><div class="room-heading"><div class="room-number">${esc(String(r['比賽地點']).match(/(\d+)室/)?.[1]||'待確認')} <small>室 · 二樓</small></div><span class="pill">${esc(r['組別'])}</span></div><div class="attend-body"><div class="students">${ids(r['報名學生(Class_No_Name)']).map(student).join('')}</div><p class="muted">最遲 ${esc(arrival(r))} 到場 · 比賽 ${esc(r['初賽時間（澳門）'])}</p><button class="text-button" data-copy="${r._row}">複製這隊的通知</button>${r['負責老師']?`<details class="subdetail"><summary>老師及公告來源<span class="chevron">›</span></summary><p class="muted">老師：${esc(r['負責老師'])}</p><p class="muted">${esc(r['初賽公告來源'])}</p></details>`:''}</div></article>`).join('')||'<p class="empty">找不到相符同學，請試試姓名或班級。</p>'}</div>${data.publicMode?`<div class="card document public-notices"><div class="document-body"><p>以官方初賽公告為準。</p>${notices(quizTeams())}</div></div>`+otherCompetitions():''}`;}
const weekday=d=>/^\d{4}-\d{2}-\d{2}$/.test(d||'')?`${d}（${new Date(d+'T12:00:00+08:00').toLocaleDateString('zh-Hant',{weekday:'long',timeZone:'Asia/Macau'})}）`:(d||'待公布');
const notices=rows=>[...new Map(rows.filter(r=>url(r['公告連結'])).map(r=>[r['公告連結'],r])).values()].map(r=>`<a class="source-link" href="${esc(url(r['公告連結']))}" target="_blank" rel="noopener">${esc(short(r['比賽名稱']))} · ${r['比賽名稱'].includes('知識問答')?esc(r['組別'])+'初賽公告（PDF，含各課室名單）':'官方公告／通知'}</a>`).join('');
function publicAttendance(){
 const quiz=quizTeams(),first=quiz[0],groups=[...new Map(quiz.map(r=>[r['組別'],r])).values()],named=quiz.some(r=>r['隊員']);
 const room=r=>String(r['比賽地點']).match(/(\d+)室/)?.[1]||'待確認';
 const quizHtml=first?`<section class="card venue"><h2>資訊科技知識問答初賽</h2><p>${esc(weekday(first['比賽日期']))}<br>高美士中葡中學主大樓二樓 · 澳門士多鳥拜斯大馬路</p><div class="times">${groups.map(r=>`<div><strong>${esc(arrival(r))}</strong>${esc(r['組別'])}到場<small>比賽 ${esc(r['初賽時間（澳門）'])}</small></div>`).join('')}</div><p class="notice-rule">${esc(first['初賽出席須知']||'帶備學生證或身份證明文件。兩位隊員均須出席。')}</p></section>${groups.map(g=>`<div class="section-heading"><h2>${esc(g['組別'])} · ${esc(g['初賽時間（澳門）'])}</h2><small>最遲 ${esc(arrival(g))} 到場</small></div><div class="attendance-grid">${quiz.filter(r=>r['組別']===g['組別']).map(r=>`<article class="card"><div class="room-heading"><div class="room-number">${esc(room(r))} <small>室 · 二樓</small></div><span class="pill">${esc(r['學部'])}</span></div>${r['隊員']?`<div class="attend-body"><div class="students">${String(r['隊員']).split('、').map(n=>`<span class="student">${esc(n)}</span>`).join('')}</div></div>`:''}</article>`).join('')}</div>`).join('')}<div class="card document public-notices"><div class="document-body"><p>${named?'以官方初賽公告為準。':'公開版不列學生姓名；自己的課室請看官方初賽公告內的名單，或向負責老師查詢。'}</p>${notices(quiz)}</div></div>`:'';
 return quizHtml+otherCompetitions();
}
function otherCompetitions(){
 const others=[...new Map(data.details.filter(r=>!r['比賽名稱'].includes('知識問答')).map(r=>[r['比賽名稱']+'|'+r['組別'],r])).values()];
 const stage=(r,d,t,p)=>r[d]?[weekday(r[d]),r[t],r[p]].filter(Boolean).join('\n'):'';
 // 同一比賽同一組別可能有多隊：合併各隊的參賽及決賽學生。
 const people=(r,key)=>{const rows=data.details.filter(x=>x['比賽名稱']===r['比賽名稱']&&x['組別']===r['組別']);const list=[...new Set(rows.flatMap(x=>ids(x[key])))];return list.length?`<div class="students">${list.map(student).join('')}</div>`:'';};
 return `<div class="section-heading"><h2>其他比賽</h2><small>時間及地點</small></div>`+others.map(r=>{const csp=r['比賽名稱'].includes('CSP'),finalists=people(r,'決賽學生(Class_No_Name)');return `<div class="card venue"><h2>${esc(short(r['比賽名稱']))}${r['組別']&&r['組別']!=='中學生'?' · '+esc(r['組別']):''}</h2>${kv([[csp?'第一輪':'初賽／初評',stage(r,'比賽日期','初賽時間（澳門）','比賽地點')],[csp?'第二輪':'決賽',stage(r,'決賽日期','決賽時間（澳門）','決賽地點')]])}${finalists?`<p class="roster-label">${csp?'可晉級第二輪':'已入圍決賽'}</p>${finalists}`:''}</div>`;}).join('');
}
function resultRecords(){
 const records=[];
 const validDate=v=>/^\d{4}-\d{2}-\d{2}$/.test(v||'')?v:'';
 const yearOf=date=>{const y=Number(date.slice(0,4));return `${Number(date.slice(5,7))>=9?y:y-1}–${Number(date.slice(5,7))>=9?y+1:y}`;};
 const add=row=>{if(row.number==='0')row.number='';row.period=row.date?yearOf(row.date):(row.period||'2026–2027');row.periodYear=Number(row.period.match(/\d{4}/)?.[0])||0;row.sortYear=row.date?Number(row.date.slice(0,4)):(row.eventYear||0);row.schoolYear=row.date?(row.date>='2026-09-01'?'2627':'2526'):(row.periodYear>=2026?'2627':'2526');records.push(row);};
 for(const [index,r] of data.history.entries()){
  const original=String(r['競賽成績']||'');const at=original.lastIndexOf(' - ');
  const competition=at>=0?original.slice(0,at):original;
  const award=(at>=0?original.slice(at+3):'').replace(/\s*[（(]\s*([^）)]+)[）)]\s*$/,'').trim();
  const date=validDate(r['日期']||r.Date||r['比賽日期']);const eventYear=Number(competition.match(/(?:^|\D)(20\d{2})(?:年|\D|$)/)?.[1])||0;
  const period=String(r['學年']||r['SchoolYear']||'2025–2026').replace(/[-/]/g,'–');
  const isAward=/(?:冠軍|亞軍|季軍|[金銀銅]奬|[金銀銅]獎|[特優一二三等異]奬|獎)/.test(award);
  add({id:'history-'+index,period,date,eventYear,competition,name:r.Name,className:r.Class||'',number:r.Number||'',score:null,award:award||'結果未記錄',kind:isAward?'award':'result',note:original,stage:'',source:'歷年成績'});
 }
 for(const [index,r] of data.csp.entries()){
  const detail=data.details.find(d=>d['比賽名稱'].includes('CSP')&&d['組別'].startsWith(r['組別']));
  const [className,number,name]=String(r['學生(Class_No_Name)']).split('_');const date=validDate(detail?.['比賽日期']);
  const confirmed=r['確認報名(Y/N)']==='Y'?'已確認第二輪':r['確認報名(Y/N)']==='N'?'不參加第二輪':'第二輪待回覆';
  add({id:'csp-'+index,period:date?yearOf(date):'2026–2027',date,eventYear:2026,competition:r['組別'],stage:'第一輪',name,className,number,score:r['第一輪成績'],award:r['第二輪資格']||'待確認',kind:'score',note:`${confirmed}；第一輪：${detail?.['比賽地點']||'地點待確認'}`,source:'本年度成績'});
 }
 for(const r of data.details){
  if(r['比賽名稱'].includes('CSP'))continue;
  const outcome=String(r['比賽結果']||'');const date=validDate(r['比賽日期']);
  if(!outcome||/未舉行|尚未評審|尚未公布|入圍未公布/.test(outcome)||!date||date>today())continue;
  for(const id of ids(r['報名學生(Class_No_Name)'])){
   const [className,number,name]=id.split('_');
   const award=String(r['獎項']||outcome);const isAward=/冠軍|亞軍|季軍|[金銀銅]奬|[金銀銅]獎|優異[奬獎]/.test(award);
   add({id:'current-'+r._row+'-'+id,period:yearOf(date),date,eventYear:0,competition:r['比賽名稱'],stage:r['組別']||'',name,className,number,score:r['成績']??null,award,kind:isAward?'award':'result',note:r['隊伍識別']||'',source:'本年度紀錄'});
  }
 }
 return records.sort((a,b)=>b.periodYear-a.periodYear||(Boolean(b.date)-Boolean(a.date))||(b.date||'').localeCompare(a.date||'')||b.sortYear-a.sortYear||a.competition.localeCompare(b.competition,'zh-Hant')||a.name.localeCompare(b.name,'zh-Hant'));
}
// 榮譽榜：按賽事列出獎項、得獎同學、年/月及主辦單位；學生和學長同一張榜，由近到遠。
const LEVEL_OPTIONS=[['','所有級別'],['澳門','澳門'],['港澳・大灣區','港澳・大灣區'],['全國・國際','全國・國際']];
function monthText(e){const m=[...e.months].sort((a,b)=>a[0]-b[0]||a[1]-b[1]);if(!m.length)return e.yearOnly?`${e.yearOnly} 年（月份未記錄）`:'日期未記錄';const f=m[0],l=m.at(-1);if(f[0]===l[0]&&f[1]===l[1])return `${f[0]} 年 ${f[1]} 月`;return f[0]===l[0]?`${f[0]} 年 ${f[1]} 月 – ${l[1]} 月`:`${f[0]} 年 ${f[1]} 月 – ${l[0]} 年 ${l[1]} 月`;}
function honourEvents(){
 const out=(data.honours||[]).map(h=>({year:h['學年'],name:h['賽事'],award:h['成績'],students:h['得獎學生'],organiser:h['主辦單位'],level:h['級別'],months:h['月份']||[],yearOnly:h['年份']||0}));
 // 本學年：由 Excel 的入圍、晉級及獎項紀錄整理，同一賽事同一結果合為一項。
 const current=new Map();
 for(const r of resultRecords()){
  if(r.schoolYear!=='2627'||!r.date||/未|待/.test(r.award)||!(r.kind==='award'||/入圍|晉級/.test(r.award)))continue;
  const csp=r.source==='本年度成績',name=csp?`CSP-J/S 2026 · ${r.competition} 第一輪`:r.competition,award=csp?'可晉級第二輪':r.award,key=name+'|'+award;
  if(!current.has(key)){const d=data.details.find(x=>csp?x['比賽名稱'].includes('CSP'):x['比賽名稱']===r.competition);current.set(key,{year:'2627',name,award,people:[],organiser:d?.['舉辦機構']||'',level:'',months:[[Number(r.date.slice(0,4)),Number(r.date.slice(5,7))]],yearOnly:0});}
  current.get(key).people.push(r);
 }
 for(const e of current.values()){e.students=e.people.map(p=>p.name+(p.className?`（${p.className}）`:'')).join('、');out.push(e);}
 for(const e of out){const last=[...e.months].sort((a,b)=>b[0]-a[0]||b[1]-a[1])[0];e.sortKey=last?last[0]*100+last[1]:(e.yearOnly||0)*100;e.dateText=monthText(e);}
 return out.sort((a,b)=>b.year.localeCompare(a.year)||b.sortKey-a.sortKey||a.name.localeCompare(b.name,'zh-Hant'));
}
function results(){if(closed())return '<div class="card venue"><h2>榮譽榜僅供校內查閱</h2><p>公開網站不提供學生姓名、班級、名單或個人成績。</p></div>';
 const all=honourEvents(),years=[...new Set(all.map(e=>e.year))],q=query.toLowerCase();
 const list=all.filter(e=>(resultYear==='all'||e.year===resultYear)&&(!group||e.level===group)&&(!q||[e.name,e.award,e.students,e.organiser,e.dateText].join('\n').toLowerCase().includes(q)));
 const tab=(v,label)=>`<button type="button" data-result-year="${v}" class="${resultYear===v?'active':''}" aria-pressed="${resultYear===v}">${label}</button>`;
 const yearName=y=>`20${y.slice(0,2)}–20${y.slice(2)} 學年`;
 const card=e=>`<article class="card honour"><div class="honour-top"><span class="honour-date">${esc(e.dateText)}</span>${e.level?`<span class="pill">${esc(e.level)}</span>`:''}</div><h3>${esc(e.name)}</h3><p><span class="award-label is-award">${esc(e.award)}</span></p>${e.students?`<p class="honour-students">${esc(e.students)}</p>`:''}${e.organiser?`<p class="honour-org">主辦：${esc(e.organiser)}</p>`:''}</article>`;
 const body=[...new Set(list.map(e=>e.year))].map(y=>{const items=list.filter(e=>e.year===y);return `<div class="section-heading"><h2>${yearName(y)}</h2><small>${items.length} 項 · 由近到遠</small></div>${items.map(card).join('')}`;}).join('')||'<p class="empty">找不到相符紀錄。</p>';
 return `<div class="tabs result-years" role="group" aria-label="選擇學年">${tab('all','全部')}${years.map(y=>tab(y,y)).join('')}</div>`+searchbar(LEVEL_OPTIONS,'搜尋姓名、比賽或獎項','篩選賽事級別')+body+(data.publicMode?'':detailTable());
}
// 本機版另附逐人明細（含分數及未入圍紀錄），不會匯出到公開網站。
function detailTable(){
 const rows=resultRecords().filter(r=>(resultYear==='all'||r.schoolYear===resultYear)&&match(r));
 const hasScore=r=>typeof r.score==='number';
 return `<div class="section-heading"><h2>個人成績明細（校內）</h2><small>${rows.length} 筆 · 只在本機版顯示</small></div><div class="card results-table-wrap"><table class="results-table"><caption class="sr-only">${resultYear} 學年由近到遠的競賽成績與獎項</caption><thead><tr><th scope="col">日期／學年</th><th scope="col">同學</th><th scope="col">比賽</th><th scope="col">成績</th><th scope="col">獎項／結果</th></tr></thead><tbody>${rows.map(r=>`<tr data-record="${esc(r.id)}"><td class="result-date" data-label="日期／學年"><strong>${esc(r.date||(r.eventYear?r.eventYear+' 年':'日期未記錄'))}</strong><small>${esc(r.period)} 學年${!r.date&&r.eventYear?' · 月日未記錄':''}</small></td><td class="result-person" data-label="同學"><span class="student">${esc(r.name)}<small>${r.className?esc(r.className)+(r.number?' · '+esc(r.number)+' 號':''):'班級未記錄'}</small></span></td><td class="result-competition" data-label="比賽">${esc(r.competition)}${r.stage?`<small>${esc(r.stage)}</small>`:''}</td><td class="result-score-cell" data-label="成績">${hasScore(r)?`<strong>${esc(r.score)}</strong><small>分</small>`:(data.publicMode?'':'<span class="muted">—</span>')}</td><td class="result-award" data-label="獎項／結果"><span class="award-label ${r.kind==='award'?'is-award':''}">${esc(r.award)}</span>${r.note&&r.kind!=='award'?`<small>${esc(r.note)}</small>`:''}</td></tr>`).join('')||'<tr><td colspan="5" class="empty">找不到相符紀錄。</td></tr>'}</tbody></table></div>`;
}
function documents(){if(data.publicMode)return '<div class="card document public-notices"><div class="document-body"><h2>官方網站</h2><p>最新章程以各項比賽的官方網站為準。</p>'+[...new Map(data.details.filter(r=>url(r['今年官方網站'])).map(r=>[r['比賽名稱'],r])).values()].map(r=>'<a class="source-link" target="_blank" rel="noopener" href="'+esc(url(r['今年官方網站']))+'">'+esc(r['比賽名稱'])+'</a>').join('')+'</div></div><div class="card document public-notices"><div class="document-body"><h2>官方公告及通知</h2><p>校內報名資料、名單及成績不作公開下載。</p>'+notices(data.details)+'</div></div>';const renderMD=md=>{if(md.startsWith('## 比賽詳細紀錄'))return md.split(/(?=^### 比賽名稱：)/m).slice(1).map(b=>{const lines=b.split('\n'),title=lines.shift().replace(/^### 比賽名稱：/,'');return `<details class="subdetail"><summary>${esc(short(title))}<span class="chevron">›</span></summary>${DOMPurify.sanitize(marked.parse(lines.join('\n')))}</details>`;}).join('');return DOMPurify.sanitize(marked.parse(md));};const blocks=data.markdown.split(/(?=^## )/m);return `<details class="card document"><summary>初賽公告與學生通知<span class="chevron">›</span></summary><div class="document-body">${(data.documents||[]).map(d=>`<a class="source-link" href="${esc(d.download)}" target="_blank" rel="noopener">${esc(d.label)}</a>`).join('')}<button class="text-button" data-copy-all>複製全部隊伍通知</button></div></details>${blocks.map((b,i)=>{const name=b.match(/^##?\s+(.+)$/m)?.[1]||'追蹤紀錄';return `<details class="card document" data-open-key="doc-${i}" ${opened.has('doc-'+i)?'open':''}><summary>${esc(name)}<span class="chevron">›</span></summary><div class="document-body">${renderMD(b)}</div></details>`;}).join('')}<details class="card document"><summary>原始資料與更新<span class="chevron">›</span></summary><div class="document-body"><p>${staticMode?'此頁為 GitHub Pages 靜態版；原始檔案更新並重新匯出、上傳後，網頁才會更新。':'本機版每 5 秒讀取三份來源檔案的更新。請儲存 Excel 修改後再查看。'}</p>${data.sources.map(s=>`<a class="source-link" href="${esc(s.download)}">${esc(s.filename)}</a>`).join('')}</div></details>`;}
function render(){if(!data)return;const focus=document.activeElement?.id,position=$('#search')?.selectionStart;$('#page-kicker').textContent=view==='results'?'歷年榮譽':'2026–2027 學年';const title=(data.publicMode&&(view!=='attendance'||closed())&&publicTitles[view])||titles[view];$('#page-title').textContent=title[0];$('#page-description').textContent=title[1];document.querySelector('.nav[data-view="attendance"]').textContent=closed()?'時間課室':'出席位置';document.querySelectorAll('.nav').forEach(b=>{b.classList.toggle('active',b.dataset.view===view);b.setAttribute('aria-current',b.dataset.view===view?'page':'false');});$('#content').innerHTML=({overview,attendance,results,rules:documents,admissions}[view])();document.querySelectorAll('[data-open-key]').forEach(d=>d.addEventListener('toggle',()=>d.open?opened.add(d.dataset.openKey):opened.delete(d.dataset.openKey)));if(focus==='search'){$('#search')?.focus();try{$('#search').setSelectionRange(position,position);}catch{}}}
function navigate(v){const aliases={schedule:'attendance',csp:'results',history:'results'};v=aliases[v]||v;if(!titles[v])v='overview';view=v;query='';group='';history.replaceState(null,'','#'+v);render();window.scrollTo({top:0});}
function toast(t){$('#toast').textContent=t;$('#toast').hidden=false;clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('#toast').hidden=true,3500);}
async function copy(t){try{await navigator.clipboard.writeText(t);toast('通知已複製，可以轉發給同學。');}catch{const a=document.createElement('textarea');a.value=t;a.style.position='fixed';a.style.top='0';document.body.append(a);a.select();const ok=document.execCommand('copy');a.remove();toast(ok?'通知已複製。':'無法複製，請下載資料頁的學生通知。');}}
async function refresh(force=false){if(refreshing)return;refreshing=true;lastSync=Date.now();try{let r;if(staticMode)r=await fetch('./data_202610081011.json',{cache:'no-store'});else{r=await fetch('./api/data',{cache:'no-store'});if(!r.ok){staticMode=true;r=await fetch('./data_202610081011.json',{cache:'no-store'});}}if(!r.ok)throw Error('資料暫時無法讀取');let next=await r.json();if(next.b64)next=JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(next.b64),c=>c.charCodeAt(0))));const changed=!data||data.revision!==next.revision;data=next;if(changed||force)render();$('#status-banner').hidden=!data.syncError;$('#status-banner').textContent=data.syncError||'';$('#sync-time').textContent=(staticMode?'匯出於 ':'已同步 ')+new Date(staticMode?data.syncedAt:Date.now()).toLocaleString('zh-Hant',{timeZone:'Asia/Macau',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false});}catch(e){$('#status-banner').hidden=false;$('#status-banner').textContent=e.message;}finally{refreshing=false;}}
document.addEventListener('click',e=>{const year=e.target.closest('[data-result-year]');if(year){resultYear=year.dataset.resultYear;render();return;}const nav=e.target.closest('[data-view],[data-go]');if(nav)return navigate(nav.dataset.view||nav.dataset.go);const c=e.target.closest('[data-copy]');if(c)copy(notification(quizTeams().find(r=>String(r._row)===c.dataset.copy)));if(e.target.closest('[data-copy-all]'))copy(quizTeams().map(notification).join('\n\n──────────\n\n'));});
document.addEventListener('input',e=>{if(e.target.id==='search'){query=e.target.value;render();}});
document.addEventListener('change',e=>{if(e.target.id==='group'){group=e.target.value;render();}});
$('#refresh').onclick=()=>refresh(true);
// 背景固定為流動海浪，不設使用者選項；p5 載入失敗或腳本出錯時，內容照常顯示。
try{window.makeCompetitionBackground?.('flow',55);}catch(e){console.warn('背景未能啟動',e);}
try{window.makeClassLogo?.();}catch(e){console.warn('LOGO動畫未能啟動',e);}
navigate(location.hash.slice(1));refresh();setInterval(()=>{if(!document.hidden&&Date.now()-lastSync>=(staticMode?300000:4500))refresh();},5000);const toTop=$('#to-top');if(toTop){toTop.onclick=()=>window.scrollTo({top:0,behavior:'smooth'});window.addEventListener('scroll',()=>{toTop.hidden=window.scrollY<900;},{passive:true});}window.addEventListener('hashchange',()=>navigate(location.hash.slice(1)));

function admissions(){return '<iframe id="admissions-guide" title="升學加分問答指南" src="./guide_202610081011.html"></iframe>';}
window.addEventListener('message',e=>{if(e.origin!==location.origin||e.source!==document.getElementById('admissions-guide')?.contentWindow)return;if(e.data?.kind==='guide-height')document.getElementById('admissions-guide').style.height=Math.max(900,e.data.height+40)+'px';});
