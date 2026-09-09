# Informe de comparación

## Alcance

Se reprodujeron las cinco salidas visibles, sus estados, los cuatro destinos de navegación y los estados de detalle observados en Base44.

## Viewports

Se inspeccionó la referencia en escritorio de 1920×919 y en el viewport de aplicación centrado de 448 px. La réplica conserva el contenedor `max-width: 448px`, navegación fija inferior y reflujo móvil.

## Validación

El listado coincide en estructura, textos, estados, jerarquía, fondo, tipografías, tarjetas, espaciado y navegación. Se comprobaron los formularios de salida, participante, alojamiento, gasto y ruta. Los cambios se validan con el servidor JSON local y sobreviven al reinicio.

## Diferencias restantes

El mapa local dibuja Leaflet con teselas de OpenStreetMap y centra los trazados a partir del GPX incluido; la tesela exacta puede variar con la fecha y el proveedor. No se verificó el envío real a WhatsApp o el cliente de correo porque depende del dispositivo del usuario.

## Build y tests

`npm run build` y `npm test` pasan. La batería cubre cálculo de distancia/desnivel, persistencia, validación JSON, aislamiento de origen y rutas estáticas.
