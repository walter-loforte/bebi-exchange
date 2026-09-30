const {test}=require('node:test');
const assert=require('node:assert/strict');
const {extract,number}=require('../price-reader.js');
test('reconoce monedas explícitas y separadores regionales',()=>{
  for(const [text,amount,currency] of [['CLP $ 12.990',12990,'CLP'],['ARS 25.000,50',25000.5,'ARS'],['US$ 1,299.99',1299.99,'USD'],['U$S 49.90',49.9,'USD'],['90 000 CLP',90000,'CLP'],['125 pesos argentinos',125,'ARS'],['USD\n99.99',99.99,'USD']]){
    const value=extract(text)[0];assert.equal(value?.amount,amount,text);assert.equal(value?.currency,currency,text);
  }
});
test('no confunde el símbolo $ ni los separadores con un país',()=>{
  for(const text of ['$ 12.990','$ 12,990.00','Precio 12990'])assert.equal(extract(text)[0].currency,null,text);
});
test('distingue precios de monedas diferentes y marca monedas no compatibles',()=>{
  assert.deepEqual(extract('CLP 90.000\nUSD 100').map(p=>p.currency),['CLP','USD']);
  assert.equal(extract('EUR 99,90')[0].unsupported,true);
  assert.equal(extract('CAD $100')[0].currency,null);
});
test('evita porcentajes, fechas, pesos y códigos',()=>{
  assert.deepEqual(extract('30%\n30/09/2026\nSKU 123456\n500 ml\n7791234567890'),[]);
  assert.equal(extract('Antes $ 20.000\nAhora $ 15.000')[0].amount,15000);
});
test('rechaza montos inválidos y conserva centavos',()=>{
  for(const s of ['', '-3','1.2.3','abc','0'])assert.equal(number(s),null,s);
  assert.equal(number('1.234,56'),1234.56);assert.equal(number('1,234.56'),1234.56);
});
