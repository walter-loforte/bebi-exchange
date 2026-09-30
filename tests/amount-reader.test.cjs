const {test}=require('node:test'),assert=require('node:assert/strict');
global.PriceReader=require('../price-reader.js');require('../amount-reader.js');
test('no completa un monto si una lectura agrega un uno o conserva un signo',()=>{
  assert.equal(AmountReader.reliable([{text:'169990',confidence:95},{text:'69990',confidence:90},{text:'69990',confidence:90}]),null);
  assert.equal(AmountReader.amount('$69990'),null);
  assert.equal(AmountReader.reliable([{text:'12990',confidence:90},{text:'12990',confidence:92}]).amount,12990);
});
test('incluye contexto a la izquierda sin salir de la foto ni modificar el borde derecho',()=>{
  const b=AmountReader.contextBox({x:.5,y:.3,w:.2,h:.1});
  assert.equal(b.x,.45);assert.ok(Math.abs(b.x+b.w-.7)<1e-9);
  assert.equal(AmountReader.contextBox({x:.01,y:0,w:.2,h:.2}).x,0);
});
function detection(words){return {blocks:[{paragraphs:[{lines:[{words:words.map((text,w)=>({symbols:[...text].map((text,i)=>({text,bbox:{x0:w*100+i*10,y0:10,x1:w*100+i*10+9,y1:30}}))}))}]}]}]};}
test('excluye letras y signo peso del recorte antes del OCR numérico',()=>{
  assert.deepEqual(AmountReader.numericBox(detection(['AHORA:','$69990'])),{x0:110,y0:10,x1:159,y1:30});
  assert.deepEqual(AmountReader.numericBox(detection(['USD49.90'])),{x0:30,y0:10,x1:79,y1:30});
});
test('no elige entre dos precios ni elimina letras internas para inventar un monto',()=>{
  assert.equal(AmountReader.numericBox(detection(['119990','$69990'])),null);
  assert.equal(AmountReader.numericBox(detection(['69O90'])),null);
  assert.equal(AmountReader.numericBox(detection(['AHORA','$'])),null);
});
test('lee solo montos, sin necesitar un símbolo o una moneda',()=>{
  for(const [text,value] of [['69990',69990],['69.990',69990],['69 990',69990],['49.90',49.9],['25.000,50',25000.5],['1,299.99',1299.99]])assert.equal(AmountReader.amount(text),value);
});
test('no une dos precios ni inventa dígitos a partir de letras',()=>{
  for(const text of ['119990\n69990','119990 69990','6 9 9 9 0','69O90','', '0'])assert.equal(AmountReader.amount(text),null,text);
});
test('prioriza el acuerdo entre pasadas, no una confianza aislada alta',()=>{
  const ranked=AmountReader.rank([{text:'65330',confidence:92},{text:'69990',confidence:65},{text:'69990',confidence:76}]);
  assert.equal(ranked[0].amount,69990);assert.equal(ranked[0].votes,2);assert.equal(ranked.length,2);
});
test('dos lecturas de mala calidad no desplazan una lectura clara con centavos',()=>{
  const ranked=AmountReader.rank([{text:'4990',confidence:38},{text:'4990',confidence:30},{text:'49.90',confidence:96}]);
  assert.equal(ranked[0].amount,49.9);
});
