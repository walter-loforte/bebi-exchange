# BEBI EXCHANGE

App web instalable para convertir pesos chilenos (CLP), pesos argentinos (ARS) y dólares estadounidenses (USD).

## Funciones

- Conversión en las seis direcciones.
- Dólar blue venta como referencia para ARS.
- Dólar observado chileno como referencia para CLP.
- Actualización manual y fecha de cada cotización.
- Últimas cotizaciones guardadas en el dispositivo.
- Manifiesto e iconos de instalación y service worker para uso sin conexión después de la primera carga.
- Selección de CLP, ARS o USD antes de escanear; cámara o galería.
- Recuadro ajustable con el dedo o el teclado para aislar los dígitos del precio.
- Lectura numérica con contraste, inversión de etiquetas oscuras, corrección de inclinación y tres pasadas de reconocimiento.
- Revisión del monto y alternativas cuando las lecturas difieren.

## Lectura de fotos

La foto se procesa localmente con Tesseract.js 6.0.1; no se envía a un servidor. El lector y su modelo se descargan al usar esta función, por lo que necesita conexión. Se limita cada foto a 20 MB. Solo el recorte seleccionado se amplía y procesa para la lectura.

La moneda es la elegida en el conversor antes de abrir el escáner. No se intenta reconocerla desde la imagen. Encuadrá solo los dígitos, dejando afuera símbolos, palabras y precios anteriores. Revisá siempre la lectura: los dígitos recortados, reflejos y baja resolución aún pueden provocar errores. Si las pasadas difieren, se muestran alternativas y se permite corregir el monto.

Pruebas: `node --test tests/*.test.cjs`.

## Datos

- DolarAPI: https://dolarapi.com/v1/dolares/blue
- Mindicador: https://mindicador.cl/api/dolar

Las conversiones son equivalencias de referencia. No representan una oferta de cambio ni el costo de pagar con tarjeta. El dato chileno se publica por día hábil.

## Desarrollo local

No requiere dependencias ni compilación. Desde la carpeta del proyecto:

```sh
python -m http.server 8765 --bind 127.0.0.1
```

Abrir http://127.0.0.1:8765.

## GitHub Pages

En Settings → Pages, usar Deploy from a branch, rama `main` y carpeta `/ (root)`. Los archivos usan rutas relativas para funcionar bajo el subdirectorio del repositorio.

Para instalar en iPhone: Safari → Compartir → Agregar a inicio. En Android: Chrome → Instalar app o Agregar a pantalla principal. La instalación real debe verificarse en el teléfono.

## Próximas iteraciones

- Búsqueda de productos en Amazon USA y Mercado Libre Argentina.
