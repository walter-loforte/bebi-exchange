# BEBI EXCHANGE

App web instalable para convertir pesos chilenos (CLP), pesos argentinos (ARS) y dólares estadounidenses (USD).

## Funciones

- Conversión en las seis direcciones.
- Dólar blue venta como referencia para ARS.
- Dólar observado chileno como referencia para CLP.
- Actualización manual y fecha de cada cotización.
- Últimas cotizaciones guardadas en el dispositivo.
- Manifiesto e iconos de instalación y service worker para uso sin conexión después de la primera carga.
- Foto desde la cámara o galería, lectura del precio y detección de moneda por texto explícito (CLP, ARS, USD, US$, U$S, CL$, AR$).
- Revisión y corrección del monto y la moneda; selección cuando se reconocen varios importes.

## Lectura de fotos

La foto se procesa localmente con Tesseract.js 6.0.1; no se envía a un servidor. El lector y su modelo se descargan al usar esta función, por lo que necesita conexión. Se limita cada foto a 20 MB y se reduce a un máximo de 2200 píxeles por lado para la lectura.

El símbolo `$` y el formato de los números no permiten distinguir CLP, ARS y USD. Si no hay una marca explícita, la app pide confirmar la moneda. Revisá siempre la lectura, especialmente con fotos borrosas, reflejos o varios precios. No calcula automáticamente la moneda a partir de la ubicación.

Pruebas de extracción de precios: `node --test tests/price-reader.test.cjs`.

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
