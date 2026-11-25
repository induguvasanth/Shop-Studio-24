/* Shop Studio OCR Pro: isolated, browser-side OCR; supersedes legacy OCR handlers. */
(()=>{'use strict';
const by=id=>document.getElementById(id);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function ready(){
 const section=by('ocr'), input=by('ocrInput'),preview=by('ocrPreview'), wrap=by('ocrImageWrap'), empty=by('ocrPreviewEmpty'),box=by('ocrSelectBox'), text=by('ocrText'), status=by('ocrStatus');
 if(!section||!input||!preview||!wrap||!box||!text||!status)return;
 const panel=section.querySelector('.compact-tool');
 input.accept='image/*,application/pdf,.pdf'; input.multiple=false;
 const controls=document.createElement('div');controls.className='ocr-pro-options';
 controls.innerHTML='<label>Language<select id="ocrProLang"><option value="eng">English</option><option value="eng+tel">English + Telugu</option><option value="eng+hin">English + Hindi</option><option value="eng+tam">English + Tamil</option><option value="eng+kan">English + Kannada</option><option value="tel">Telugu</option><option value="hin">Hindi</option><option value="tam">Tamil</option><option value="kan">Kannada</option></select></label><label>Text layout<select id="ocrProLayout"><option value="3">Automatic</option><option value="6">Paragraph / block</option><option value="11">Sparse text</option><option value="4">Single column</option></select></label><label>Image processing<select id="ocrProProcessing"><option value="auto">Auto (recommended)</option><option value="enhance">Enhanced document</option><option value="original">Original</option></select></label><label class="ocr-pro-check"><input type="checkbox" id="ocrProAllPages" checked> All PDF pages</label>';
 section.querySelector('.workspace-head')?.after(controls);
 const message=document.createElement('p');message.className='ocr-pro-tip';message.textContent='Upload an image or PDF. Drag across the preview to read a selected region, or choose Extract Text for the full file.';
 by('ocrDragHelp')?.replaceWith(message);
 let file=null, url='',pdf=null, pdfPage=1, busy=false, selected=null, drag=null, imageLoad=null, worker=null, workerLang='', serial=0;
 const setStatus=s=>{status.textContent=s;};
 const setBusy=v=>{busy=v;by('ocrBtn').disabled=v;};
 function reset(){selected=null;box.hidden=true;text.value='';pdf=null;pdfPage=1;if(url)URL.revokeObjectURL(url);url='';}
 const pager=document.createElement('div');pager.className='ocr-pro-pager';pager.hidden=true;
 pager.innerHTML='<button type="button" id="ocrProPrev">Previous page</button><span id="ocrProPageLabel"></span><button type="button" id="ocrProNext">Next page</button>';
 by('ocrPreviewShell')?.after(pager);
 const next=by('ocrProNext'),prev=by('ocrProPrev');
 prev.onclick=()=>renderPage(pdfPage-1);next.onclick=()=>renderPage(pdfPage+1);
 async function renderPage(n){
  if(!pdf||n<1||n>pdf.numPages)return;
  const page=await pdf.getPage(n),v=page.getViewport({scale:Math.min(2.1,1800/page.getViewport({scale:1}).width)}),c=document.createElement('canvas');
  c.width=Math.round(v.width);c.height=Math.round(v.height);
  await page.render({canvasContext:c.getContext('2d',{alpha:false}),viewport:v}).promise;
  pdfPage=n;await new Promise((ok,fail)=>{preview.onload=ok;preview.onerror=()=>fail(new Error('PDF page preview failed'));preview.src=c.toDataURL('image/jpeg',.91);});
  showPreview();selected=null;box.hidden=true;by('ocrProPageLabel').textContent=`Page ${n} of ${pdf.numPages}`;prev.disabled=n===1;next.disabled=n===pdf.numPages;
 }
 function showPreview(){preview.style.display='block';wrap.style.display='inline-block';by('ocrPreviewShell')?.classList.add('has-image');if(empty)empty.style.display='none';}
 input.addEventListener('change',async e=>{
  e.stopImmediatePropagation();reset();file=input.files?.[0]||null;const id=++serial;
  if(!file){preview.removeAttribute('src');wrap.style.display='none';if(empty)empty.style.display='grid';pager.hidden=true;setStatus('Ready');return;}
  try{
   if(file.type==='application/pdf'||/\.pdf$/i.test(file.name)){
    if(!window.pdfjsLib)throw new Error('PDF reader not loaded. Check your internet connection.');
    pdf=await pdfjsLib.getDocument({data:new Uint8Array(await file.arrayBuffer())}).promise;
    if(id!==serial)return;
    pager.hidden=false;await renderPage(1);
    setStatus(`${file.name} • ${pdf.numPages} PDF page(s) ready`);
   }else if(file.type.startsWith('image/')||/\.(png|jpe?g|webp|bmp|gif)$/i.test(file.name)){
    pager.hidden=true;url=URL.createObjectURL(file);preview.src=url;
    await new Promise((ok,fail)=>{preview.onload=ok;preview.onerror=()=>fail(new Error('Image cannot be decoded'));});
    if(id!==serial)return;showPreview();setStatus(`${file.name} • ready for text extraction`);
   }else throw new Error('Select an image or PDF.');
  }catch(err){setStatus(`File error: ${err.message}`);console.error(err);}
 },true);
 function pxPoint(e){const r=preview.getBoundingClientRect();return{x:clamp(e.clientX-r.left,0,r.width),y:clamp(e.clientY-r.top,0,r.height),w:r.width,h:r.height};}
 wrap.addEventListener('pointerdown',e=>{if(e.button!==0||!file||!preview.naturalWidth)return;e.stopImmediatePropagation();e.preventDefault();drag=pxPoint(e);selected=null;wrap.setPointerCapture?.(e.pointerId);box.hidden=false;box.style.left=drag.x+'px';box.style.top=drag.y+'px';box.style.width='0px';box.style.height='0px';},true);
 wrap.addEventListener('pointermove',e=>{if(!drag)return;e.stopImmediatePropagation();const p=pxPoint(e),x=Math.min(p.x,drag.x),y=Math.min(p.y,drag.y),w=Math.abs(p.x-drag.x),h=Math.abs(p.y-drag.y);selected={x,y,w,h,viewW:p.w,viewH:p.h};Object.assign(box.style,{left:x+'px',top:y+'px',width:w+'px',height:h+'px'});},true);
 wrap.addEventListener('pointerup',async e=>{if(!drag)return;e.stopImmediatePropagation();e.preventDefault();drag=null;if(!selected||selected.w<8||selected.h<8){selected=null;box.hidden=true;return;}await run(true);},true);
 wrap.addEventListener('pointercancel',()=>drag=null,true);
 function imageFromPreview(selection){const full=document.createElement('canvas');full.width=preview.naturalWidth;full.height=preview.naturalHeight;full.getContext('2d').drawImage(preview,0,0);if(!selection)return full;
  const sx=full.width/selection.viewW,sy=full.height/selection.viewH;const c=document.createElement('canvas');c.width=Math.round(selection.w*sx);c.height=Math.round(selection.h*sy);c.width=Math.max(1,c.width);c.height=Math.max(1,c.height);
  c.getContext('2d').drawImage(full,selection.x*sx,selection.y*sy,selection.w*sx,selection.h*sy,0,0,c.width,c.height);return c;
 }
 function prepared(source,mode){if(mode==='original')return source;
  let scale=Math.min(3,Math.max(1,1800/Math.max(source.width,1)));scale=Math.min(scale,3200/Math.max(source.width,source.height));scale=Math.max(.8,scale);
  const c=document.createElement('canvas');c.width=Math.max(1,Math.round(source.width*scale));c.height=Math.max(1,Math.round(source.height*scale));const ctx=c.getContext('2d',{willReadFrequently:true});ctx.fillStyle='#fff';ctx.fillRect(0,0,c.width,c.height);ctx.imageSmoothingQuality='high';ctx.drawImage(source,0,0,c.width,c.height);
  const im=ctx.getImageData(0,0,c.width,c.height),d=im.data;
  let low=255,high=0;const hist=new Uint32Array(256);
  for(let i=0;i<d.length;i+=4){const v=Math.round(.299*d[i]+.587*d[i+1]+.114*d[i+2]);hist[v]++;}
  const total=d.length/4;let sum=0;for(let v=0;v<256;v++){sum+=hist[v];if(sum>=total*.02){low=v;break;}}
  sum=0;for(let v=255;v>=0;v--){sum+=hist[v];if(sum>=total*.98){high=v;break;}}
  const den=Math.max(45,high-low);
  for(let i=0;i<d.length;i+=4){const v=(.299*d[i]+.587*d[i+1]+.114*d[i+2]-low)*255/den;const n=clamp(Math.round((v-128)*1.12+128),0,255);d[i]=d[i+1]=d[i+2]=n;d[i+3]=255;}
  ctx.putImageData(im,0,0);return c;
 }
 async function ensureWorker(lang){if(worker&&workerLang===lang)return worker;
  if(worker){await worker.terminate().catch(()=>{});worker=null;}
  if(!window.Tesseract?.createWorker)throw new Error('OCR engine unavailable. Check internet access.');
  const l=lang.split('+');worker=await Tesseract.createWorker(l.length>1?l:lang,1,{logger:m=>{if(m.progress&&busy)setStatus(`${m.status}: ${Math.round(m.progress*100)}%`);}});workerLang=lang;return worker;
 }
 async function extractPDFText(page){const content=await page.getTextContent(),items=content.items.filter(x=>typeof x.str==='string');if(!items.length)return '';
  let out='',lastY=null;
  for(const item of items){const y=item.transform?.[5];if(lastY!==null&&Number.isFinite(y)&&Math.abs(y-lastY)>4)out+='\n';else if(out&&!out.endsWith('\n')&&!out.endsWith(' ')&&!item.str.startsWith(' '))out+=' ';
   out+=item.str;if(item.hasEOL)out+='\n';if(Number.isFinite(y))lastY=y;}
  return out.trim();
 }
 async function recognize(canvas,label){
  const lang=by('ocrProLang').value,layout=by('ocrProLayout').value,mode=by('ocrProProcessing').value;
  const engine=await ensureWorker(lang);
  await engine.setParameters({tessedit_pageseg_mode:layout,preserve_interword_spaces:'1',user_defined_dpi:'300'});
  const src=mode==='original'?canvas:prepared(canvas,mode);
  setStatus(`Recognizing ${label}...`);
  let r=await engine.recognize(src),best=r.data;
  if(mode==='auto'&&best.confidence<75&&src!==canvas){
   setStatus(`Checking original image for ${label}...`);const alt=(await engine.recognize(canvas)).data;
   if((alt.text||'').trim()&&alt.confidence>best.confidence+2)best=alt;
  }
  return {text:(best.text||'').trim(),confidence:best.confidence};
 }
 async function run(onlySelection=false){if(busy)return;
  if(!file){setStatus('Upload an image or PDF first.');return;}
  setBusy(true);const results=[];let confidence=[];
  try{
   if(pdf&&!onlySelection){
    const pages=by('ocrProAllPages').checked?Array.from({length:pdf.numPages},(_,i)=>i+1):[pdfPage];
    for(let i=0;i<pages.length;i++){
     const n=pages[i],pg=await pdf.getPage(n);setStatus(`Reading PDF page ${n} (${i+1}/${pages.length})...`);
     let extracted=await extractPDFText(pg).catch(()=>''),method='PDF text';
     if(extracted.replace(/\s/g,'').length<25){
      const view=pg.getViewport({scale:Math.min(2.5,2500/pg.getViewport({scale:1}).width)}),c=document.createElement('canvas');c.width=Math.ceil(view.width);c.height=Math.ceil(view.height);
      await pg.render({canvasContext:c.getContext('2d',{alpha:false}),viewport:view}).promise;
      const res=await recognize(c,`PDF page ${n}`);extracted=res.text;confidence.push(res.confidence);method='OCR';
     }
     results.push(`--- Page ${n} (${method}) ---\n${extracted||'[No readable text found]'}`);
    }
   }else{
    if(!preview.naturalWidth)throw new Error('Image preview not ready');
    const res=await recognize(imageFromPreview(onlySelection?selected:null),onlySelection?'selection':'image');confidence.push(res.confidence);results.push(res.text);
   }
   text.value=results.join('\n\n');const avg=confidence.length?Math.round(confidence.reduce((a,b)=>a+b,0)/confidence.length):null;
   setStatus(`Finished • ${results.length} ${results.length===1?'part':'parts'} • ${text.value.length} characters${avg!==null?' • OCR confidence '+avg+'%':''}. Review text for recognition errors.`);
  }catch(err){console.error('OCR Pro',err);setStatus(`OCR error: ${err.message||'Recognition failed'}`);}finally{setBusy(false);}
 }
 by('ocrBtn').addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();run(false);},true);
 by('copyOcr').addEventListener('click',async e=>{e.stopImmediatePropagation();e.preventDefault();try{await navigator.clipboard.writeText(text.value);setStatus('Text copied.');}catch{ text.focus();text.select();setStatus('Select the text and press Ctrl+C to copy.');}},true);
 window.addEventListener('beforeunload',()=>{if(worker)worker.terminate().catch(()=>{});if(url)URL.revokeObjectURL(url);});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready);else ready();
})();
