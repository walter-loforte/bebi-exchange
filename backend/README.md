# Activación del identificador

La interfaz sigue en GitHub Pages. Este Worker recibe un JPEG reducido, consulta Gemini y devuelve una propuesta editable; no consulta precios ni almacena fotos.

1. Entrar a https://aistudio.google.com/apikey y crear una clave en un proyecto sin facturación para usar la cuota gratuita disponible. Si se agota, la app muestra un error y permite búsqueda manual.
2. Crear/iniciar sesión en https://dash.cloudflare.com/ con plan Workers Free.
3. Desde esta carpeta: `npx wrangler login`, luego `npx wrangler deploy`.
4. Ejecutar `npx wrangler secret put GEMINI_API_KEY` e ingresar la clave en el prompt seguro. Nunca agregarla al código, al chat o a GitHub.
5. Copiar la URL pública del Worker en `../product-config.js` y publicar los archivos estáticos con una nueva versión.
6. Probar una foto real desde la app antes de considerar activada la función.

Modelo configurable mediante GEMINI_MODEL. La disponibilidad y cuota gratuita se verifican en AI Studio. El endpoint acepta solo el origen configurado y limita a cinco solicitudes por minuto por IP. CORS no reemplaza autenticación: para uso público amplio agregar protección contra abuso. Mantener el proyecto Gemini sin facturación para evitar cargos automáticos.

Sin endpoint configurado la app indica que la IA está pendiente; las búsquedas manuales funcionan. Las pruebas con respuestas simuladas verifican el contrato, no la precisión del modelo real.
