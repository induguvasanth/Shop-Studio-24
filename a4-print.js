/* Shop Studio A4 Print Workspace — standalone from legacy editors. */
(()=>{'use strict';
const $=id=>document.getElementById(id), canvas=$('a4Canvas');if(!canvas)return;
const ctx=canvas.getContext('2d'),stage=$('a4Stage'),overlay=$('a4Overlay'),itemList=$('a4Items');
const W=840,H=1188;
let pages=[{w:W,h:H,items:[]}],pageIndex=0,selected=new Set(),active=-1,drag=null,cropMode=false,cropRect=null;
const current=()=>pages[pageIndex],status=t=>{$('a4Status').textContent=t};
function clamp(v,a,b){return Math.min(b,Math.max(a,v))}
function selItem(){return current().items[active]||null}
function fromClient(e){const r=canvas.getBoundingClientRect();return {x:(e.clientX-r.left)*current().w/r.width,y:(e.clientY-r.top)*current().h/r.height}}
function dims(){const p=current();canvas.width=p.w;canvas.height=p.h;canvas.style.aspectRatio=p.w+'/'+p.h}
function draw(){dims();const p=current();ctx.fillStyle='#fff';ctx.fillRect(0,0,p.w,p.h);
 p.items.forEach(it=>{ctx.save();ctx.translate(it.x+it.w/2,it.y+it.h/2);ctx.rotate(it.angle*Math.PI/180);
 try{const s=it.crop||{x:0,y:0,w:1,h:1};ctx.drawImage(it.img,it.img.width*s.x,it.img.height*s.y,it.img.width*s.w,it.img.height*s.h,-it.w/2,-it.h/2,it.w,it.h)}catch(e){}
 ctx.restore()});paintOverlay();}
function boxFor(it){const r=canvas.getBoundingClientRect(),p=current();return {x:it.x/p.w*r.width,y:it.y/p.h*r.height,w:it.w/p.w*r.width,h:it.h/p.h*r.height}}
function rotateVector(x,y,angle){const a=angle*Math.PI/180,c=Math.cos(a),s=Math.sin(a);return {x:x*c-y*s,y:x*s+y*c}}
// Project a point in the item's unrotated local frame onto the displayed, rotated canvas.
function screenPoint(b,it,u,v){const offset=rotateVector((u-.5)*b.w,(v-.5)*b.h,it.angle);return {x:b.x+b.w/2+offset.x,y:b.y+b.h/2+offset.y}}
function paintOverlay(){overlay.replaceChildren();const items=current().items;
 selected.forEach(idx=>{const it=items[idx];if(!it)return;const b=boxFor(it);const o=document.createElement('div');o.className='a4-outline'+(idx!==active?' other':'');o.style.cssText=`left:${b.x}px;top:${b.y}px;width:${b.w}px;height:${b.h}px;transform:rotate(${it.angle}deg)`;overlay.append(o)});
 const it=selItem();if(!it)return;const b=boxFor(it);
 const cr=cropMode?(cropRect||{x:.1,y:.1,w:.8,h:.8}):{x:0,y:0,w:1,h:1};
 const mid=screenPoint(b,it,cr.x+cr.w/2,cr.y+cr.h/2);
 if(cropMode){const c=document.createElement('div');c.className='a4-crop-box';c.style.cssText=`left:${mid.x-b.w*cr.w/2}px;top:${mid.y-b.h*cr.h/2}px;width:${b.w*cr.w}px;height:${b.h*cr.h}px;transform:rotate(${it.angle}deg)`;c.setAttribute('title','Drag to move crop area');c.addEventListener('pointerdown',e=>startDrag(e,'move-crop'));overlay.append(c)}
 const points={nw:[0,0],n:[.5,0],ne:[1,0],e:[1,.5],se:[1,1],s:[.5,1],sw:[0,1],w:[0,.5]};
 Object.entries(points).forEach(([key,[px,py]])=>{const pos=screenPoint(b,it,cr.x+px*cr.w,cr.y+py*cr.h);const h=document.createElement('div');h.className='a4-handle';h.dataset.h=key;h.dataset.mode=cropMode?'crop':'resize';h.style.left=pos.x+'px';h.style.top=pos.y+'px';h.addEventListener('pointerdown',e=>startDrag(e,key));overlay.append(h)})}
function inItem(pt,it){const cx=it.x+it.w/2,cy=it.y+it.h/2,a=-it.angle*Math.PI/180,dx=pt.x-cx,dy=pt.y-cy;const x=dx*Math.cos(a)-dy*Math.sin(a)+it.w/2,y=dx*Math.sin(a)+dy*Math.cos(a)+it.h/2;return x>=0&&y>=0&&x<=it.w&&y<=it.h}
function choose(e,idx){
 if(e.ctrlKey||e.metaKey){selected.has(idx)?selected.delete(idx):selected.add(idx)}
 else if(e.shiftKey&&active>=0){const a=Math.min(idx,active),b=Math.max(idx,active);for(let i=a;i<=b;i++)selected.add(i)}
 else selected=new Set([idx]);
 active=selected.has(idx)?idx:(selected.values().next().value??-1);
 cropMode=false;cropRect=null;syncCrop();paintOverlay();renderItems();
 status(active>=0?`${current().items[active].name} selected (${selected.size} total)`:'Selection cleared');
} 
function renderItems(){
 if(!itemList)return;
 itemList.replaceChildren();
 current().items.forEach((it,i)=>{
  const b=document.createElement('button');b.type='button';
  b.className='a4-item-entry'+(selected.has(i)?' selected':'')+(active===i?' focused':'');
  b.title=`Select ${it.name} for independent resizing or cropping`;
  const n=document.createElement('span');n.className='a4-item-num';n.textContent=String(i+1);
  const name=document.createElement('span');name.className='a4-item-name';name.textContent=it.name;
  b.append(n,name);b.addEventListener('click',ev=>choose(ev,i));itemList.append(b);
 });
 if(!current().items.length){const m=document.createElement('span');m.className='a4-items-empty';m.textContent='Add images or PDF pages';itemList.append(m)}
}

function syncCrop(){$('a4ApplyCrop').hidden=!cropMode;$('a4CancelCrop').hidden=!cropMode;$('a4Crop').hidden=cropMode}
function startDrag(e,handle){e.preventDefault();e.stopPropagation();if(active<0)return;const pt=fromClient(e),it=selItem();drag={mode:cropMode?(handle==='move-crop'?'move-crop':'crop'):'resize',handle,start:pt,original:{x:it.x,y:it.y,w:it.w,h:it.h},origCrop:cropRect?{...cropRect}:null};stage.setPointerCapture(e.pointerId)}
canvas.addEventListener('pointerdown',e=>{if(drag||cropMode)return;const pt=fromClient(e),items=current().items;let found=-1;for(let i=items.length-1;i>=0;i--){if(inItem(pt,items[i])){found=i;break}}if(found<0){if(!e.ctrlKey)selected.clear();active=-1;cropMode=false;cropRect=null;syncCrop();paintOverlay();renderItems();return}if(!selected.has(found)||e.ctrlKey||e.shiftKey)choose(e,found);drag={mode:'move',start:pt,snapshots:[...selected].map(i=>({i,x:items[i].x,y:items[i].y}))};stage.setPointerCapture(e.pointerId)});
stage.addEventListener('pointermove',e=>{if(!drag)return;const pt=fromClient(e),dx=pt.x-drag.start.x,dy=pt.y-drag.start.y,p=current();
 if(drag.mode==='move'){for(const q of drag.snapshots){const it=p.items[q.i];if(it){it.x=clamp(q.x+dx,0,p.w-it.w);it.y=clamp(q.y+dy,0,p.h-it.h)}}}
 if(drag.mode==='resize'){
  const it=selItem(),b=drag.original,h=drag.handle;if(!it)return;
  // Resize in the object's own coordinate frame, then rotate the centre offset
  // back into page coordinates.  This keeps all eight handles correct at 90/180/270°.
  const delta=rotateVector(dx,dy,-it.angle),minSize=25;
  let left=-b.w/2,top=-b.h/2,right=b.w/2,bottom=b.h/2;
  if(h.includes('w'))left=Math.min(left+delta.x,right-minSize);
  if(h.includes('e'))right=Math.max(right+delta.x,left+minSize);
  if(h.includes('n'))top=Math.min(top+delta.y,bottom-minSize);
  if(h.includes('s'))bottom=Math.max(bottom+delta.y,top+minSize);
  const shift=rotateVector((left+right)/2,(top+bottom)/2,it.angle);
  it.w=right-left;it.h=bottom-top;
  it.x=b.x+b.w/2+shift.x-it.w/2;
  it.y=b.y+b.h/2+shift.y-it.h/2;
 }
 if(drag.mode==='crop'||drag.mode==='move-crop'){
  const it=selItem(),b=drag.original,c=drag.origCrop||{x:.1,y:.1,w:.8,h:.8};
  const delta=rotateVector(dx,dy,-it.angle);
  let x=c.x,y=c.y,w=c.w,hh=c.h,ux=delta.x/b.w,uy=delta.y/b.h;
  if(drag.mode==='move-crop'){x=clamp(c.x+ux,0,1-c.w);y=clamp(c.y+uy,0,1-c.h)}
  else{const h=drag.handle;let left=c.x,top=c.y,right=c.x+c.w,bottom=c.y+c.h;
   if(h.includes('w'))left=clamp(c.x+ux,0,right-.025);if(h.includes('e'))right=clamp(c.x+c.w+ux,left+.025,1);
   if(h.includes('n'))top=clamp(c.y+uy,0,bottom-.025);if(h.includes('s'))bottom=clamp(c.y+c.h+uy,top+.025,1);
   x=left;y=top;w=right-left;hh=bottom-top;}
  cropRect={x,y,w,h:hh};
 }
 draw()});
function endDrag(){if(drag){drag=null;renderThumbs()}}stage.addEventListener('pointerup',endDrag);stage.addEventListener('pointercancel',endDrag);
function renderThumbs(){renderItems();const wrap=$('a4Pages');wrap.replaceChildren();pages.forEach((p,i)=>{const btn=document.createElement('button');btn.type='button';btn.className='a4-page-thumb'+(i===pageIndex?' active':'');const cv=document.createElement('canvas');cv.width=80;cv.height=p.h/p.w*80;const c=cv.getContext('2d');c.fillStyle='#fff';c.fillRect(0,0,cv.width,cv.height);p.items.forEach(it=>{const sx=cv.width/p.w,sy=cv.height/p.h;c.save();c.translate((it.x+it.w/2)*sx,(it.y+it.h/2)*sy);c.rotate(it.angle*Math.PI/180);const s=it.crop||{x:0,y:0,w:1,h:1};try{c.drawImage(it.img,it.img.width*s.x,it.img.height*s.y,it.img.width*s.w,it.img.height*s.h,-it.w*sx/2,-it.h*sy/2,it.w*sx,it.h*sy)}catch{}c.restore()});btn.append(cv,document.createTextNode(`Page ${i+1}`));btn.onclick=()=>{pageIndex=i;selected.clear();active=-1;cropMode=false;syncCrop();draw();renderThumbs()};wrap.append(btn)})}
function insert(img,name){const p=current(),maxW=p.w*.68,maxH=p.h*.45,scale=Math.min(maxW/img.width,maxH/img.height,1.6);const w=Math.max(25,img.width*scale),h=Math.max(25,img.height*scale),delta=(p.items.length%5)*26;const it={img,name,x:clamp((p.w-w)/2+delta,0,p.w-w),y:clamp((p.h-h)/2+delta,0,p.h-h),w,h,angle:0,crop:{x:0,y:0,w:1,h:1}};p.items.push(it);active=p.items.length-1;selected=new Set([active]);draw();renderThumbs()}
async function loadFile(f){if(f.type==='application/pdf'||/\.pdf$/i.test(f.name)){if(!window.pdfjsLib)throw Error('PDF.js unavailable; check internet connection.');const pdf=await pdfjsLib.getDocument({data:new Uint8Array(await f.arrayBuffer())}).promise;for(let n=1;n<=pdf.numPages;n++){const pg=await pdf.getPage(n),base=pg.getViewport({scale:1}),factor=Math.min(1.6,Math.sqrt(3500000/(base.width*base.height))),vp=pg.getViewport({scale:factor}),c=document.createElement('canvas');c.width=Math.ceil(vp.width);c.height=Math.ceil(vp.height);await pg.render({canvasContext:c.getContext('2d'),viewport:vp}).promise;insert(c,`${f.name} page ${n}`)}}else if(f.type.startsWith('image/')){const url=URL.createObjectURL(f);try{const img=new Image();await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=()=>reject(Error('Cannot decode '+f.name));img.src=url});insert(img,f.name)}finally{URL.revokeObjectURL(url)}}else throw Error('Unsupported file: '+f.name)}
$('a4Upload').addEventListener('change',async e=>{const files=[...e.target.files];e.target.value='';status('Loading files…');let ok=0;for(const file of files){try{await loadFile(file);ok++}catch(err){status('Could not load '+file.name+': '+err.message);console.error(err)}}if(ok)status(`${ok} file(s) loaded. Select, move, resize, crop, or add a new A4 page.`)});
$('a4Blank').onclick=()=>{pages.splice(pageIndex+1,0,{w:W,h:H,items:[]});pageIndex++;selected.clear();active=-1;cropMode=false;syncCrop();draw();renderThumbs();status('New blank A4 page. You can upload more images into it.')};
$('a4RotatePage').onclick=()=>{const p=current();const ow=p.w;p.w=p.h;p.h=ow;p.items.forEach(it=>{const centerX=it.x+it.w/2,centerY=it.y+it.h/2;it.x=p.w-centerY-it.w/2;it.y=centerX-it.h/2;it.angle=(it.angle+90)%360});draw();renderThumbs();status('A4 page rotated')};
for(const [id,d] of [['a4RotateLeft',-90],['a4RotateRight',90]])$(id).onclick=()=>{if(!selected.size)return status('Select an item first');for(const i of selected){const it=current().items[i];it.angle=(it.angle+d+360)%360}draw();renderThumbs()};
$('a4Delete').onclick=()=>{if(!selected.size)return status('Select image(s) to remove');current().items=current().items.filter((_,i)=>!selected.has(i));selected.clear();active=-1;cropMode=false;syncCrop();draw();renderThumbs();status('Selected item(s) removed')};
$('a4Crop').onclick=()=>{if(active<0)return status('Select an image to crop');cropMode=true;cropRect={x:.1,y:.1,w:.8,h:.8};syncCrop();paintOverlay();status(`Cropping ${selItem().name} — drag yellow handles, then Apply Crop`)};
$('a4CancelCrop').onclick=()=>{cropMode=false;cropRect=null;syncCrop();paintOverlay()};
$('a4ApplyCrop').onclick=()=>{const it=selItem();if(!it||!cropRect)return;const src=it.crop||{x:0,y:0,w:1,h:1},r=cropRect;it.crop={x:src.x+r.x*src.w,y:src.y+r.y*src.h,w:src.w*r.w,h:src.h*r.h};const centerShift=rotateVector(it.w*(r.x+r.w/2-.5),it.h*(r.y+r.h/2-.5),it.angle);const centerX=it.x+it.w/2+centerShift.x,centerY=it.y+it.h/2+centerShift.y;it.w*=r.w;it.h*=r.h;it.x=centerX-it.w/2;it.y=centerY-it.h/2;cropMode=false;cropRect=null;syncCrop();draw();renderThumbs();status(`Crop applied to ${it.name}`)};
$('a4Clean').onclick=()=>{if(!selected.size)return status('Select image(s) first');for(const i of selected){const it=current().items[i],c=document.createElement('canvas');c.width=it.img.width;c.height=it.img.height;const g=c.getContext('2d',{willReadFrequently:true});g.drawImage(it.img,0,0);try{const data=g.getImageData(0,0,c.width,c.height);for(let j=0;j<data.data.length;j+=4){const r=data.data[j],b=data.data[j+1],bb=data.data[j+2];if(Math.min(r,b,bb)>205&&Math.max(r,b,bb)-Math.min(r,b,bb)<36){data.data[j]=data.data[j+1]=data.data[j+2]=255}}g.putImageData(data,0,0);it.img=c}catch(e){status('Could not clean selected image: '+e.message)}}draw();renderThumbs();status('Light background areas cleaned on selection')};
async function makePdf(){if(!window.PDFLib)throw Error('PDF export library unavailable. Check internet connection.');const doc=await PDFLib.PDFDocument.create(),old=pageIndex,oldSelected=selected,oldActive=active;selected=new Set();active=-1;for(let i=0;i<pages.length;i++){pageIndex=i;draw();const p=current();const bytes=await (await fetch(canvas.toDataURL('image/png'))).arrayBuffer();const image=await doc.embedPng(bytes);const w=p.w===W?595.28:841.89,h=p.w===W?841.89:595.28;const pg=doc.addPage([w,h]);pg.drawImage(image,{x:0,y:0,width:w,height:h})}pageIndex=old;selected=oldSelected;active=oldActive;draw();const pdf=await doc.save();return new Blob([pdf],{type:'application/pdf'})}
$('a4ExportPdf').onclick=async()=>{try{status('Preparing PDF…');const blob=await makePdf(),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='Shop-Studio-A4-Sheets.pdf';a.click();setTimeout(()=>URL.revokeObjectURL(url),20000);status('PDF exported')}catch(e){status('Export failed: '+e.message)}};
$('a4Print').onclick=async()=>{try{status('Preparing pages for printing…');const blob=await makePdf(),url=URL.createObjectURL(blob),tab=window.open(url,'_blank');if(!tab)status('Allow popups to open the print-ready PDF');else status('Print-ready PDF opened. Print from the PDF viewer.');setTimeout(()=>URL.revokeObjectURL(url),120000)}catch(e){status('Print preparation failed: '+e.message)}};
window.addEventListener('keydown',e=>{if(!document.getElementById('a4print').classList.contains('active'))return;if(!['Delete','Backspace'].includes(e.key)||/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName))return;e.preventDefault();$('a4Delete').click()});
renderThumbs();draw();
})();
