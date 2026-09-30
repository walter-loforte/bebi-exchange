# BEBI EXCHANGE

App web instalable para convertir pesos chilenos (CLP), pesos argentinos (ARS) y dólares estadounidenses (USD).

## Primera versión

- Conversión en las seis direcciones.
- Dólar blue venta como referencia para ARS.
- Dólar observado chileno como referencia para CLP.
- Actualización manual y fecha de cada cotización.
- Últimas cotizaciones guardadas en el dispositivo.
- Manifiesto e iconos de instalación y service worker para uso sin conexión después de la primera carga.

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

- Reconocimiento de precios desde una foto.
- Búsqueda de productos en Amazon USA y Mercado Libre Argentina.
