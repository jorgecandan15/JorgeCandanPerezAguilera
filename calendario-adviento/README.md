# Calendario de Adviento de Lucía 🎄

Web con 24 casillas que se abren una cada día del 1 al 24 de diciembre (00:00, hora de Madrid).
La fecha la comprueba el servidor: cambiar la hora del móvil o mirar el código no desvela nada,
porque el contenido de una casilla no se envía hasta que llega su día.

## Editar los regalos
Todo el contenido está en `regalos.json`. Para cada día:

```json
{ "dia": 5, "emoji": "🧣", "titulo": "Para el frío", "frase": "Texto que leerá antes de abrir el regalo nº 5" }
```

- `frase` admite saltos de línea con `\n`.
- `para`, `titulo`, `dedicatoria` y `mensajeFinal` cambian los textos generales.

Cada cambio subido a la rama se despliega solo en Render.

## Modo prueba
`/?preview=CLAVE` abre todas las casillas (la clave está en la variable `PREVIEW_KEY` de Render).
`/?preview=CLAVE&dia=10` simula que es 10 de diciembre. En modo prueba no se guarda nada.

## En local
```
PREVIEW_KEY=prueba npm start   # http://localhost:3000
```
