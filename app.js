(() => {
"use strict";
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const NS="http://www.w3.org/2000/svg";
const fmt=v=>{if(!Number.isFinite(v))return"undefined";v=Math.abs(v)<.005?0:v;return Number.isInteger(v)?String(v):v.toFixed(2).replace(/0+$/,"").replace(/\.$/,"")};

// local progress only
let progress;
try{progress=JSON.parse(localStorage.getItem("graphlab-progress"))}catch(e){}
if(!progress)progress={visited:[],attempts:0,correct:0};
function save(){localStorage.setItem("graphlab-progress",JSON.stringify(progress));updateProgress()}
function updateProgress(){
 const n=Math.min(5,progress.visited.length);
 $("#progressBar").style.width=`${n/5*100}%`; $("#progressText").textContent=`${n} of 5 spaces explored`;
 $("#challengeScore").textContent=`${progress.correct} / ${progress.attempts}`;
}
function mark(route){if(route!=="home"&&!progress.visited.includes(route)){progress.visited.push(route);save()}}

// routing
function navigate(route){
 $$(".screen").forEach(s=>s.classList.toggle("active",s.id===`screen-${route}`));
 $$(".nav-item,.mobile-nav button").forEach(b=>b.classList.toggle("active",b.dataset.route===route));
 window.scrollTo({top:0,behavior:"smooth"});mark(route);
 if(route==="anatomy")renderAnatomy(); if(route==="transform")renderTransform();
 if(route==="special")renderSpecial(); if(route==="families")renderFamily();
 if(route==="challenge")renderChallenge();
}
$$("[data-route]").forEach(x=>x.addEventListener("click",e=>{e.preventDefault();navigate(x.dataset.route)}));
$$(".mode-btn").forEach(btn=>btn.addEventListener("click",()=>{
 $$(".mode-btn").forEach(x=>x.classList.toggle("active",x===btn));
 if(btn.dataset.mode==="practice")navigate("challenge");
}));
$("#resetProgressBtn").addEventListener("click",()=>{
 if(confirm("Reset progress stored on this device?")){progress={visited:[],attempts:0,correct:0};save()}
});

// SVG engine
const V={w:720,h:460,xmin:-6,xmax:6,ymin:-6,ymax:6,pad:32};
const sx=(x,v=V)=>v.pad+(x-v.xmin)/(v.xmax-v.xmin)*(v.w-2*v.pad);
const sy=(y,v=V)=>v.h-v.pad-(y-v.ymin)/(v.ymax-v.ymin)*(v.h-2*v.pad);
function node(n,a={}){const e=document.createElementNS(NS,n);Object.entries(a).forEach(([k,v])=>e.setAttribute(k,v));return e}
function clear(svg){while(svg.firstChild)svg.removeChild(svg.firstChild)}
function grid(svg,v=V){
 for(let x=Math.ceil(v.xmin);x<=v.xmax;x++){
  svg.appendChild(node("line",{x1:sx(x,v),x2:sx(x,v),y1:v.pad,y2:v.h-v.pad,class:x===0?"axis-line":"grid-line"}));
  if(x&&x%2===0){const t=node("text",{x:sx(x,v)+3,y:sy(0,v)+14,class:"tick-text"});t.textContent=x;svg.appendChild(t)}
 }
 for(let y=Math.ceil(v.ymin);y<=v.ymax;y++){
  svg.appendChild(node("line",{x1:v.pad,x2:v.w-v.pad,y1:sy(y,v),y2:sy(y,v),class:y===0?"axis-line":"grid-line"}));
  if(y&&y%2===0){const t=node("text",{x:sx(0,v)+5,y:sy(y,v)-4,class:"tick-text"});t.textContent=y;svg.appendChild(t)}
 }
}
function fnPath(fn,v=V,steps=520,x0=v.xmin,x1=v.xmax){
 let d="",pen=false,prev=null;
 for(let i=0;i<=steps;i++){
  const x=x0+(x1-x0)*i/steps; let y; try{y=fn(x)}catch(e){y=NaN}
  const ok=Number.isFinite(y)&&y>v.ymin-3&&y<v.ymax+3, jump=prev!==null&&ok&&Math.abs(y-prev)>3;
  if(!ok||jump){pen=false;prev=ok?y:null;continue}
  d+=`${pen?"L":"M"}${sx(x,v).toFixed(1)},${sy(y,v).toFixed(1)} `; pen=true; prev=y;
 } return d;
}
function paramPath(fn,v=V,steps=500,t0=0,t1=Math.PI*2){
 let d="",pen=false,prev=null;
 for(let i=0;i<=steps;i++){
  const t=t0+(t1-t0)*i/steps,p=fn(t); if(!p||!Number.isFinite(p[0])||!Number.isFinite(p[1])){pen=false;continue}
  const jump=prev&&Math.hypot(p[0]-prev[0],p[1]-prev[1])>2.5;if(jump)pen=false;
  d+=`${pen?"L":"M"}${sx(p[0],v).toFixed(1)},${sy(p[1],v).toFixed(1)} `;pen=true;prev=p;
 } return d;
}
function drawFn(svg,fn,cls="main-curve",v=V){svg.appendChild(node("path",{d:fnPath(fn,v),class:cls}))}
function drawParam(svg,fn,cls="main-curve",v=V,t0=0,t1=Math.PI*2){svg.appendChild(node("path",{d:paramPath(fn,v,500,t0,t1),class:cls}))}
function line(svg,x1,y1,x2,y2,cls="helper-line",v=V){svg.appendChild(node("line",{x1:sx(x1,v),y1:sy(y1,v),x2:sx(x2,v),y2:sy(y2,v),class:cls}))}
function point(svg,x,y,cls="feature-point",v=V){if(Number.isFinite(x)&&Number.isFinite(y)&&y>=v.ymin&&y<=v.ymax)svg.appendChild(node("circle",{cx:sx(x,v),cy:sy(y,v),r:6,class:cls}))}
function label(svg,x,y,text,v=V){const X=sx(x,v),Y=sy(y,v),g=node("g"),w=Math.max(48,text.length*6.5);g.appendChild(node("rect",{x:X+8,y:Y-25,width:w,height:22,rx:8,class:"label-bg"}));const t=node("text",{x:X+16,y:Y-10,class:"svg-label"});t.textContent=text;g.appendChild(t);svg.appendChild(g)}
const baseF=x=>.035*(x+3)*(x+.5)*(x-2.5);

// hero
{const svg=$("#heroGraph"),v={...V,h:420};clear(svg);grid(svg,v);drawFn(svg,baseF,"base-curve",v);drawFn(svg,x=>1.4*baseF(.8*(x-1))+1,"main-curve",v)}

// Anatomy
let anatomy="rational";const features=new Set();
const anatomyData={
 rational:{title:"Linear rational function",prompt:"What happens near x = 2?",insight:"Trace both branches. Which x- and y-values seem impossible?",
  draw(svg){drawFn(svg,x=>(2*x+1)/(x-2));if(features.has("asymptotes")){line(svg,2,-6,2,6);line(svg,-6,2,6,2);label(svg,2,5,"x = 2");label(svg,4.3,2,"y = 2")}if(features.has("axes")){point(svg,-.5,0);point(svg,0,-.5)}if(features.has("symmetry")){point(svg,2,2);label(svg,2,2,"centre (2,2)")}},
  facts:{axes:"Intersections: x = −1/2 and y = −1/2.",symmetry:"Rotational symmetry about the intersection of the asymptotes, (2, 2).",asymptotes:"Asymptotes: x = 2 and y = 2.",restrictions:"Restrictions: x ≠ 2 and y ≠ 2."}},
 ellipse:{title:"Ellipse",prompt:"Which features are forced by the equation?",insight:"Notice symmetry and the extreme x- and y-values before calculating.",
  draw(svg){drawParam(svg,t=>[4*Math.cos(t),2.5*Math.sin(t)]);if(features.has("axes")){[-4,4].forEach(x=>point(svg,x,0));[-2.5,2.5].forEach(y=>point(svg,0,y))}if(features.has("symmetry")){line(svg,0,-6,0,6,"symmetry-line");line(svg,-6,0,6,0,"symmetry-line")}},
  facts:{axes:"For this example: (±4,0) and (0,±2.5).",symmetry:"Symmetric about both coordinate axes, hence also about the origin.",asymptotes:"An ellipse has no asymptotes.",restrictions:"Here, −4 ≤ x ≤ 4 and −2.5 ≤ y ≤ 2.5."}},
 hyperbola:{title:"Hyperbola",prompt:"Why can the curve approach lines it never reaches?",insight:"Compare each branch with the dashed asymptote directions.",
  draw(svg){const a=2.5,b=1.7,T=1.45;drawParam(svg,t=>[a*Math.cosh(t),b*Math.sinh(t)],"main-curve",V,-T,T);drawParam(svg,t=>[-a*Math.cosh(t),b*Math.sinh(t)],"main-curve",V,-T,T);if(features.has("asymptotes")){line(svg,-6,-6*b/a,6,6*b/a);line(svg,-6,6*b/a,6,-6*b/a)}if(features.has("axes")){point(svg,-a,0);point(svg,a,0)}if(features.has("symmetry")){line(svg,0,-6,0,6,"symmetry-line");line(svg,-6,0,6,0,"symmetry-line")}},
  facts:{axes:"For x²/a² − y²/b² = 1, the graph meets the x-axis at (±a,0).",symmetry:"Symmetric about both axes and the origin.",asymptotes:"Oblique asymptotes: y = ±(b/a)x.",restrictions:"For this orientation, |x| ≥ a."}},
 parabola:{title:"Sideways parabola",prompt:"What changes when x and y swap roles?",insight:"This curve is a graph, but not y as a single-valued function of x.",
  draw(svg){drawParam(svg,t=>[.45*t*t,t],"main-curve",V,-3.6,3.6);if(features.has("axes"))point(svg,0,0);if(features.has("symmetry"))line(svg,-6,0,6,0,"symmetry-line")},
  facts:{axes:"For y² = ax, the curve passes through the origin.",symmetry:"The x-axis is the axis of symmetry.",asymptotes:"A parabola has no asymptotes.",restrictions:"If a > 0, x ≥ 0; if a < 0, x ≤ 0."}}
};
$("#anatomyFamily").addEventListener("click",e=>{const b=e.target.closest("button");if(!b)return;anatomy=b.dataset.family;features.clear();$$(".feature-chip").forEach(x=>x.classList.remove("active"));$$("#anatomyFamily button").forEach(x=>x.classList.toggle("active",x===b));renderAnatomy()});
$$(".feature-chip").forEach(b=>b.addEventListener("click",()=>{const f=b.dataset.feature;features.has(f)?features.delete(f):features.add(f);b.classList.toggle("active",features.has(f));renderAnatomy()}));
function renderAnatomy(){const d=anatomyData[anatomy],svg=$("#anatomyGraph");clear(svg);grid(svg);d.draw(svg);$("#anatomyTitle").textContent=d.title;$("#anatomyPrompt").textContent=d.prompt;$("#anatomyInsight").textContent=d.insight;$("#anatomyFacts").innerHTML=[...features].map(f=>`<div class="fact">${d.facts[f]}</div>`).join("")}
renderAnatomy();

// Transform Lab
const tr={a:1,b:1,h:0,k:0,ghosts:[]}, sliders={a:$("#aSlider"),b:$("#bSlider"),h:$("#hSlider"),k:$("#kSlider")};
function equation(){const a=tr.a===1?"":tr.a===-1?"−":`${fmt(tr.a)}·`;let inside=tr.h===0?"x":`(x ${tr.h>0?"−":"+"} ${fmt(Math.abs(tr.h))})`;if(tr.b!==1)inside=`${fmt(tr.b)}${inside.startsWith("(")?"":"·"}${inside}`;return`y = ${a}f(${inside})${tr.k===0?"":` ${tr.k>0?"+":"−"} ${fmt(Math.abs(tr.k))}`}`}
function explain(){
 $("#aExplain").textContent=tr.a===1?"No vertical scaling.":`${tr.a<0?"Reflect in the x-axis; ":""}vertical scale factor ${fmt(Math.abs(tr.a))}.`;
 $("#bExplain").textContent=tr.b===1?"No horizontal scaling.":`${tr.b<0?"Reflect in the y-axis; ":""}horizontal scale factor ${fmt(1/Math.abs(tr.b))}.`;
 $("#hExplain").textContent=tr.h===0?"No horizontal translation.":`Translate ${fmt(Math.abs(tr.h))} ${tr.h>0?"right":"left"}.`;
 $("#kExplain").textContent=tr.k===0?"No vertical translation.":`Translate ${fmt(Math.abs(tr.k))} ${tr.k>0?"up":"down"}.`;
}
function renderTransform(){
 const svg=$("#transformGraph");clear(svg);grid(svg);drawFn(svg,baseF,"base-curve");
 tr.ghosts.forEach(g=>drawFn(svg,x=>g.a*baseF(g.b*(x-g.h))+g.k,"frozen-curve"));
 drawFn(svg,x=>tr.a*baseF(tr.b*(x-tr.h))+tr.k);
 ["a","b","h","k"].forEach(k=>{$(`#${k}Val`).textContent=fmt(tr[k]);sliders[k].value=tr[k]});
 $("#transformEquation").textContent=equation();$("#ghostCount").textContent=`${tr.ghosts.length} frozen`;explain()
}
Object.entries(sliders).forEach(([k,s])=>s.addEventListener("input",()=>{let v=Number(s.value);if((k==="a"||k==="b")&&Math.abs(v)<.24)v=v<0?-.25:.25;tr[k]=v;renderTransform()}));
$("#resetTransform").addEventListener("click",()=>{Object.assign(tr,{a:1,b:1,h:0,k:0});renderTransform()});
$("#freezeBtn").addEventListener("click",()=>{tr.ghosts.push({a:tr.a,b:tr.b,h:tr.h,k:tr.k});if(tr.ghosts.length>4)tr.ghosts.shift();renderTransform()});
$("#clearGhostsBtn").addEventListener("click",()=>{tr.ghosts=[];renderTransform()});
$$(".concept-card").forEach(b=>b.addEventListener("click",()=>{Object.assign(tr,{a:1,b:1,h:0,k:0});if(b.dataset.preset==="vertical")tr.a=-1.5;if(b.dataset.preset==="up")tr.k=2;if(b.dataset.preset==="horizontal")tr.b=2;if(b.dataset.preset==="right")tr.h=2;renderTransform()}));
renderTransform();

// Special transformations
let special="abs";const sf=x=>.16*(x+2)*(x-1);
$("#specialTabs").addEventListener("click",e=>{const b=e.target.closest("button");if(!b)return;special=b.dataset.special;$$("#specialTabs button").forEach(x=>x.classList.toggle("active",x===b));renderSpecial()});
$("#xProbe").addEventListener("input",renderSpecial);
function renderSpecial(){
 const svg=$("#specialGraph"),x=Number($("#xProbe").value),y=sf(x),fn=special==="abs"?(z=>Math.abs(sf(z))):(z=>1/sf(z));
 clear(svg);grid(svg);drawFn(svg,sf,"base-curve");drawFn(svg,fn);point(svg,x,y,"probe-point");const yy=fn(x);if(Number.isFinite(yy)&&Math.abs(yy)<=6)point(svg,x,yy);
 $("#xProbeVal").textContent=x.toFixed(1);$("#fxValue").textContent=fmt(y);
 if(special==="abs"){
  $("#specialValueLabel").textContent="|f(x)|";$("#specialValue").textContent=fmt(Math.abs(y));$("#specialHeadline").textContent="Only the negative y-values move.";$("#specialCopy").textContent="Any part of f(x) below the x-axis reflects upward. Zeros stay fixed.";$("#specialQuestion").textContent="Which parts of the original graph remain exactly where they are?"
 }else{
  $("#specialValueLabel").textContent="1/f(x)";$("#specialValue").textContent=Math.abs(y)<.025?"very large / undefined":fmt(1/y);$("#specialHeadline").textContent="Zeros of f(x) become barriers.";$("#specialCopy").textContent="As f(x) approaches 0, its reciprocal grows in magnitude. This is how vertical asymptotes emerge.";$("#specialQuestion").textContent="Where should you expect vertical asymptotes before drawing 1/f(x)?"
 }
}
renderSpecial();

// Family studio
let studio="ellipse", fam={a:4,b:2.5,p:2,q:1,d:2},timer=null;
const meta={
 ellipse:{eye:"ELLIPSE",eq:"x²/a² + y²/b² = 1",desc:"Change a and b. The centre stays fixed while the horizontal and vertical radii respond.",prompt:"What remains true for every positive value of a and b?"},
 hyperbola:{eye:"HYPERBOLA",eq:"x²/a² − y²/b² = 1",desc:"Watch the vertices and oblique asymptotes respond together.",prompt:"Can you predict the gradients of the asymptotes from a and b?"},
 rational:{eye:"RATIONAL",eq:"y = (px + q)/(x − d)",desc:"Move p, q and d. Watch the asymptotes track the algebra.",prompt:"Which parameter directly fixes the vertical asymptote?"},
 parametric:{eye:"PARAMETRIC",eq:"x = a cos t,   y = b sin t",desc:"A point moves while t changes. The graph is the trace left by that moving point.",prompt:"What does one complete interval 0 ≤ t ≤ 2π produce?"}
};
$("#familyTabs").addEventListener("click",e=>{const b=e.target.closest("button");if(!b)return;studio=b.dataset.studio;$$("#familyTabs button").forEach(x=>x.classList.toggle("active",x===b));buildControls();renderFamily()});
function sliderHTML(k,min,max,step,label){return`<div class="param-row"><label>${label}<b id="fv-${k}">${fmt(fam[k])}</b></label><input data-fam="${k}" type="range" min="${min}" max="${max}" step="${step}" value="${fam[k]}"></div>`}
function buildControls(){
 let h="";
 if(studio==="ellipse"||studio==="hyperbola"||studio==="parametric")h=sliderHTML("a",1,5,.25,"a")+sliderHTML("b",1,5,.25,"b");
 if(studio==="rational")h=sliderHTML("p",-3,3,.25,"p")+sliderHTML("q",-3,3,.25,"q")+sliderHTML("d",-3,3,.25,"d");
 $("#familyControls").innerHTML=h;$$("[data-fam]").forEach(s=>s.addEventListener("input",()=>{fam[s.dataset.fam]=Number(s.value);renderFamily()}))
}
function renderFamily(){
 const m=meta[studio],svg=$("#familyGraph");$("#familyEyebrow").textContent=m.eye;$("#familyEquation").textContent=m.eq;$("#familyDescription").textContent=m.desc;$("#familyPrompt").textContent=m.prompt;$("#parametricTimeline").classList.toggle("hidden",studio!=="parametric");
 $$("[data-fam]").forEach(s=>{const o=$(`#fv-${s.dataset.fam}`);if(o)o.textContent=fmt(fam[s.dataset.fam])});clear(svg);grid(svg);
 if(studio==="ellipse")drawParam(svg,t=>[fam.a*Math.cos(t),fam.b*Math.sin(t)]);
 if(studio==="hyperbola"){const T=1.45;drawParam(svg,t=>[fam.a*Math.cosh(t),fam.b*Math.sinh(t)],"main-curve",V,-T,T);drawParam(svg,t=>[-fam.a*Math.cosh(t),fam.b*Math.sinh(t)],"main-curve",V,-T,T);line(svg,-6,-6*fam.b/fam.a,6,6*fam.b/fam.a);line(svg,-6,6*fam.b/fam.a,6,-6*fam.b/fam.a)}
 if(studio==="rational"){drawFn(svg,x=>(fam.p*x+fam.q)/(x-fam.d));line(svg,fam.d,-6,fam.d,6);line(svg,-6,fam.p,6,fam.p)}
 if(studio==="parametric"){const t=Number($("#tSlider").value),f=u=>[fam.a*Math.cos(u),fam.b*Math.sin(u)];drawParam(svg,f,"base-curve");drawParam(svg,f,"partial-curve",V,0,t);const p=f(t);point(svg,p[0],p[1],"param-point");$("#tVal").textContent=t.toFixed(2)}
}
buildControls();renderFamily();
$("#tSlider").addEventListener("input",renderFamily);
$("#paramPlay").addEventListener("click",()=>{if(timer){clearInterval(timer);timer=null;$("#paramPlay").textContent="▶";return}$("#paramPlay").textContent="Ⅱ";timer=setInterval(()=>{let t=Number($("#tSlider").value)+.04;if(t>6.283)t=0;$("#tSlider").value=t;renderFamily()},30)});

// Challenge lab
const bank=[
 {type:"HORIZONTAL TRANSLATION",eq:"y = f(x + 2)",correct:{a:1,b:1,h:-2,k:0},options:[
  {a:1,b:1,h:-2,k:0,reason:"Correct. f(x + 2) = f(x − (−2)), so the graph translates 2 units left."},
  {a:1,b:1,h:2,k:0,reason:"Classic sign trap: a shift 2 units right would be f(x − 2)."},
  {a:1,b:1,h:0,k:2,reason:"That changes the output. Adding outside f gives a vertical translation."}]},
 {type:"HORIZONTAL SCALING",eq:"y = f(2x)",correct:{a:1,b:2,h:0,k:0},options:[
  {a:1,b:2,h:0,k:0,reason:"Correct. Multiplying the input by 2 gives horizontal scale factor 1/2."},
  {a:1,b:.5,h:0,k:0,reason:"That would stretch horizontally by factor 2. For f(2x), the scale factor is 1/2."},
  {a:2,b:1,h:0,k:0,reason:"That changes y-values vertically. f(2x) changes the input."}]},
 {type:"VERTICAL SCALING",eq:"y = −2f(x)",correct:{a:-2,b:1,h:0,k:0},options:[
  {a:-2,b:1,h:0,k:0,reason:"Correct. Vertical scale factor 2 and reflection in the x-axis."},
  {a:2,b:1,h:0,k:0,reason:"You captured the scale factor but missed the reflection from the negative sign."},
  {a:1,b:-2,h:0,k:0,reason:"A negative multiplier inside f acts horizontally and reflects in the y-axis."}]},
 {type:"VERTICAL TRANSLATION",eq:"y = f(x) − 2",correct:{a:1,b:1,h:0,k:-2},options:[
  {a:1,b:1,h:0,k:-2,reason:"Correct. Subtracting 2 from the output moves every y-value down 2."},
  {a:1,b:1,h:-2,k:0,reason:"That is a horizontal shift. It comes from changing the input."},
  {a:1,b:1,h:0,k:2,reason:"Check the sign: +2 moves up; −2 moves down."}]},
 {type:"COMBINATION",eq:"y = −f(2(x − 1)) + 1",correct:{a:-1,b:2,h:1,k:1},options:[
  {a:-1,b:2,h:1,k:1,reason:"Correct: reflect in x-axis, horizontal scale factor 1/2, right 1, up 1."},
  {a:-1,b:.5,h:-1,k:1,reason:"Both horizontal effects are reversed. Read the input as 2(x − 1)."},
  {a:1,b:2,h:1,k:-1,reason:"The horizontal effects are right, but the outside negative and +1 are misread."}]}
];
let qIndex=Math.floor(Math.random()*bank.length),selected=null,committed=false;
const same=(a,b)=>["a","b","h","k"].every(k=>a[k]===b[k]);
function mini(svg,p){const v={...V,w:360,h:230,pad:24};svg.setAttribute("viewBox","0 0 360 230");clear(svg);grid(svg,v);drawFn(svg,baseF,"base-curve",v);drawFn(svg,x=>p.a*baseF(p.b*(x-p.h))+p.k,"main-curve",v)}
function renderChallenge(){
 const q=bank[qIndex];selected=null;committed=false;$("#challengeType").textContent=q.type;$("#challengeEquation").textContent=q.eq;$("#challengeFeedback").className="feedback-panel hidden";$("#commitChallenge").disabled=true;$("#selectionStatus").textContent="Select one graph.";
 const order=[0,1,2].sort(()=>Math.random()-.5),wrap=$("#challengeOptions");wrap.innerHTML="";
 order.forEach((idx,i)=>{const b=document.createElement("button");b.className="graph-option";b.dataset.idx=idx;b.innerHTML=`<div class="option-label"><span>OPTION ${String.fromCharCode(65+i)}</span><span></span></div><svg></svg>`;b.addEventListener("click",()=>{if(committed)return;selected=idx;$$(".graph-option").forEach(x=>x.classList.toggle("selected",x===b));$("#commitChallenge").disabled=false;$("#selectionStatus").textContent=`Option ${String.fromCharCode(65+i)} selected.`});wrap.appendChild(b);mini($("svg",b),q.options[idx])});
 updateProgress()
}
$("#newChallengeBtn").addEventListener("click",()=>{qIndex=(qIndex+1)%bank.length;renderChallenge()});
$("#commitChallenge").addEventListener("click",()=>{
 if(selected===null||committed)return;committed=true;const q=bank[qIndex],ans=q.options[selected],ok=same(ans,q.correct);progress.attempts++;if(ok)progress.correct++;save();
 const p=$("#challengeFeedback");p.className=`feedback-panel ${ok?"correct":"incorrect"}`;p.innerHTML=`<h3>${ok?"✓ Your prediction holds.":"Not yet — inspect what moved."}</h3><p>${ans.reason}</p>`;$("#commitChallenge").disabled=true;$("#selectionStatus").textContent=ok?"Correct. Now explain it in words.":"Compare the feedback with your sketch."
});
renderChallenge();updateProgress();navigate("home");
})();