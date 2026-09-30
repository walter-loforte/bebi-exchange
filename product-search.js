(function(root){
  function links(query){
    const text=String(query).trim().replace(/\s+/g,' ');
    if(text.length<3||text.length>180)throw Error('Escribí entre 3 y 180 caracteres para buscar.');
    return {amazon:'https://www.amazon.com/s?k='+encodeURIComponent(text),mercado:'https://listado.mercadolibre.com.ar/'+encodeURIComponent(text.replace(/\s+/g,'-'))};
  }
  root.ProductSearch={links};
})(globalThis);
