# Avemaría · Web

Sitio web de **Avemaría — Asado · Parche · Picnic** (Villavicencio, Meta).
Página estática (HTML + CSS + JS, sin framework) servida por un pequeño
servidor Node sin dependencias, lista para desplegar en **Railway**.

## Estructura

```
index.html              Página principal
css/styles.css          Estilos (responsive)
js/main.js              Interacciones (mapa, panel de zonas, carrusel, video)
statics/                Imágenes y video
server.js               Servidor estático (Node, sin dependencias, con Range para video)
package.json            Script de arranque (npm start)
Procfile                Comando de proceso web (Railway/Heroku)
```

## Correr en local

Requiere Node 18+.

```bash
npm start
# abre http://localhost:3000
```

(No hay `npm install` que hacer: el servidor no usa dependencias.)

## Desplegar en Railway

### Opción A — desde GitHub (recomendada)
1. Sube este proyecto a un repositorio de GitHub.
2. En [railway.app](https://railway.app): **New Project → Deploy from GitHub repo** y elige el repo.
3. Railway detecta Node automáticamente, ejecuta `npm start` y publica el sitio.
   No hace falta configurar nada más: el puerto lo toma de `PORT`.
4. En **Settings → Networking → Generate Domain** para obtener la URL pública.

### Opción B — con Railway CLI
```bash
npm i -g @railway/cli
railway login
railway init
railway up
```

### Notas
- Railway inyecta la variable `PORT`; el servidor ya la usa (`process.env.PORT`).
- El video (`statics/videoreferenciamapa.mp4`) se sirve con soporte de
  *Range requests*, así que se puede adelantar/streamear sin descargarlo entero.
- Fuentes (Google Fonts) e iconos (Font Awesome) se cargan por CDN.

## Reemplazar contenido de prueba

- **Video real:** reemplaza `statics/videoreferenciamapa.mp4` (o cambia el `src`
  en la sección `#video` de `index.html`) y, si quieres, el `poster`.
- **Fotos de cada zona del mapa:** en `js/main.js`, dentro del arreglo `ZONES`,
  agrega a la zona el campo `images:['statics/zonas/foto1.jpg', ...]`.
- **Menús/precios:** edita el campo `menu:[{ name, price, desc }, ...]` de cada zona.
