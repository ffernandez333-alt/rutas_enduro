# Rutas JARD Enduro — réplica local

Réplica local de `https://enduro-route-flow.base44.app`.

## Arranque

Requiere Node.js 22 o posterior.

```powershell
npm start
```

Abre `http://localhost:4173`. Los datos se guardan en `data/state.json` y se actualizan al guardar formularios.

## Verificación

```powershell
npm test
npm run build
```

`validation.html` permite mostrar la pantalla original y la réplica en el mismo viewport para comparar las rutas principales.

## Alcance local

Incluye listado y calendario de salidas, detalle de salida, participantes, alojamientos, gastos, rutas con mapas y descarga GPX, formularios de alta y edición, duplicado, cancelación, compartir por correo o WhatsApp, grupo, perfil y cierre de sesión local.

Los mapas usan Leaflet y OpenStreetMap. Los GPX de referencia están incluidos en `assets/`.
