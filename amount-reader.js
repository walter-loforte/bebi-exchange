/* Image preparation and numeric-only OCR, shared by the scanner and its tests. */
(function(root){
  function prepare(image,box){
    const width=image.naturalWidth||image.width,height=image.naturalHeight||image.height;
    const sx=Math.max(0,box.x*width),sy=Math.max(0,box.y*height),sw=Math.min(width-sx,box.w*width),sh=Math.min(height-sy,box.h*height);
    if(sw<12||sh<8)throw Error('Marcá un recuadro más grande alrededor de todos los dígitos.');
    const scale=Math.min(6,1200/sw,500/sh),canvas=document.createElement('canvas');
    canvas.width=Math.round(sw*scale);canvas.height=Math.round(sh*scale);
    const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(image,sx,sy,sw,sh,0,0,canvas.width,canvas.height);
    const pixels=ctx.getImageData(0,0,canvas.width,canvas.height),hist=new Uint32Array(256),gray=new Uint8Array(canvas.width*canvas.height);
    for(let i=0;i<gray.length;i++){gray[i]=Math.round(.299*pixels.data[i*4]+.587*pixels.data[i*4+1]+.114*pixels.data[i*4+2]);hist[gray[i]]++;}
    let sum=0;for(let i=0;i<256;i++)sum+=i*hist[i];let left=0,leftSum=0,best=-1,threshold=128;
    for(let i=0;i<255;i++){left+=hist[i];leftSum+=i*hist[i];const right=gray.length-left;if(!left||!right)continue;const delta=leftSum/left-(sum-leftSum)/right,score=left*right*delta*delta;if(score>best){best=score;threshold=i;}}
    let dark=0;for(const value of gray)if(value<=threshold)dark++;
    const invert=dark>gray.length*.5;
    // Choose the angle that best aligns horizontal strokes of a single price line.
    const points=[];for(let y=2;y<canvas.height-2;y+=2)for(let x=2;x<canvas.width-2;x+=2){const v=gray[y*canvas.width+x];if(invert?v>threshold:v<=threshold)points.push([x-canvas.width/2,y-canvas.height/2]);}
    let angle=0,quality=-1;
    for(let degrees=-12;degrees<=12;degrees++){
      const r=degrees*Math.PI/180,rows=new Float64Array(Math.ceil((canvas.height+canvas.width)/4)),offset=Math.floor(rows.length/2);
      for(const [x,y]of points){const row=Math.floor((x*Math.sin(r)+y*Math.cos(r))/4)+offset;if(row>=0&&row<rows.length)rows[row]++;}
      let score=0;for(const row of rows)score+=row*row;
      if(score>quality){quality=score;angle=degrees;}
    }
    // Percentile stretch keeps anti-aliased strokes, unlike a hard threshold alone.
    let lo=0,hi=255,total=0;for(let i=0;i<256;i++){total+=hist[i];if(total>=gray.length*.03){lo=i;break;}}
    total=0;for(let i=255;i>=0;i--){total+=hist[i];if(total>=gray.length*.03){hi=i;break;}}
    for(let i=0;i<gray.length;i++){let v=Math.max(0,Math.min(255,(gray[i]-lo)*255/Math.max(1,hi-lo)));if(invert)v=255-v;pixels.data[i*4]=pixels.data[i*4+1]=pixels.data[i*4+2]=v;pixels.data[i*4+3]=255;}
    ctx.putImageData(pixels,0,0);
    const r=angle*Math.PI/180,output=document.createElement('canvas');
    output.width=Math.ceil(Math.abs(canvas.width*Math.cos(r))+Math.abs(canvas.height*Math.sin(r)))+48;
    output.height=Math.ceil(Math.abs(canvas.height*Math.cos(r))+Math.abs(canvas.width*Math.sin(r)))+48;
    const out=output.getContext('2d',{willReadFrequently:true});out.fillStyle='#fff';out.fillRect(0,0,output.width,output.height);out.translate(output.width/2,output.height/2);out.rotate(r);out.drawImage(canvas,-canvas.width/2,-canvas.height/2);out.setTransform(1,0,0,1,0,0);
    const binary=document.createElement('canvas');binary.width=output.width;binary.height=output.height;const bc=binary.getContext('2d');const data=out.getImageData(0,0,output.width,output.height);for(let i=0;i<data.data.length;i+=4){const v=data.data[i]>150?255:0;data.data[i]=data.data[i+1]=data.data[i+2]=v;}bc.putImageData(data,0,0);
    return {gray:output,binary,angle};
  }
  function amount(text){
    const raw=String(text).trim().replace(/\$/g,'').trim();
    if(/[\r\n]/.test(raw))return null;
    if(/\s/.test(raw)&&!/^\d{1,3}(?:[ \t]\d{3})+(?:[.,]\d{1,2})?$/.test(raw))return null;
    const cleaned=raw.replace(/\s/g,'');
    if(!/^\d+(?:[.,]\d+)*$/.test(cleaned))return null;
    return root.PriceReader.number(cleaned);
  }
  function rank(readings){
    const groups=new Map();
    for(const reading of readings){const value=amount(reading.text);if(value===null)continue;const item=groups.get(value)||{amount:value,votes:0,confidence:0,score:0};const confidence=Math.max(0,Math.min(100,reading.confidence||0));item.votes++;item.score+=(confidence/100)**2;item.confidence=Math.max(item.confidence,confidence);groups.set(value,item);}
    return [...groups.values()].sort((a,b)=>b.score-a.score||b.votes-a.votes||b.confidence-a.confidence);
  }
  function numericBox(data){
    const runs=[];
    for(const block of data.blocks||[])for(const paragraph of block.paragraphs||[])for(const line of paragraph.lines||[])for(const word of line.words||[]){
      const symbols=word.symbols||[],text=symbols.map(s=>s.text).join('');
      // Reject letters inside a number: removing them would invent a different price.
      if(/\d[^\d.,\s]+\d/.test(text))continue;
      const digits=symbols.filter(s=>/^[0-9.,]$/.test(s.text));
      if(!digits.some(s=>/\d/.test(s.text)))continue;
      if(amount(digits.map(s=>s.text).join(''))===null)continue;
      const tops=digits.filter(s=>/\d/.test(s.text)).map(s=>s.bbox.y0).sort((a,b)=>a-b);
      const typicalTop=tops[Math.floor(tops.length/2)];
      runs.push({x0:Math.min(...digits.map(s=>s.bbox.x0)),y0:Math.max(Math.min(...digits.map(s=>s.bbox.y0)),typicalTop-12),x1:Math.max(...digits.map(s=>s.bbox.x1)),y1:Math.max(...digits.map(s=>s.bbox.y1))});
    }
    // Multiple prices require a tighter crop instead of silently choosing one.
    return runs.length===1?runs[0]:null;
  }
  function isolate(prepared,data){
    const box=numericBox(data);
    if(!box)throw Error('No pudimos separar un único monto. Encuadrá el precio actual más de cerca.');
    const result={};
    for(const key of ['gray','binary']){
      const source=prepared[key],canvas=document.createElement('canvas');
      const x=Math.max(0,box.x0),y=Math.max(0,box.y0),w=Math.min(source.width,box.x1)-x,h=Math.min(source.height,box.y1)-y;
      canvas.width=w+48;canvas.height=h+48;const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(source,x,y,w,h,24,24,w,h);result[key]=canvas;
    }
    return result;
  }
  root.AmountReader={prepare,rank,amount,numericBox,isolate};
})(globalThis);
