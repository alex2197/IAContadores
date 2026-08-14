# Cierre Fiscal IA — MVP

Copiloto de revisión de cierre fiscal. Sube una balanza de comprobación y el
motor: clasifica cuentas contra un catálogo de código agrupador, revisa que
la balanza cuadre, detecta cuentas sin clasificar o con datos incompletos,
calcula la utilidad del periodo, y (si le das un histórico) hace una
proyección fiscal simple.

Este MVP nace de la conversación entre Iván y Misael: el dolor no es la
captura contable, es la *revisión de cumplimiento* antes de cerrar — eso es
lo que este prototipo automatiza primero.

## Qué SÍ hace este MVP

- Parsea una balanza de comprobación en CSV.
- Clasifica cada cuenta con un código agrupador según reglas configurables.
- Verifica el cuadre de partida doble (cargos = abonos).
- Detecta cuentas sin clasificar, sin nombre, o con naturaleza de saldo
  inusual, y las reporta como hallazgos con severidad.
- Calcula ingresos, costos, gastos y utilidad neta del periodo.
- Si le das un histórico de utilidad mensual, proyecta los próximos periodos
  con una tasa de crecimiento promedio simple.

## Qué NO hace (todavía / a propósito)

- **No lee CFDI/XML** todavía (fase 2 — ver Roadmap).
- **No arma la DIOT.**
- **No usa el catálogo oficial del SAT.** `data/reglas_ejemplo.json` trae un
  catálogo de ejemplo con la estructura típica (activo/pasivo/capital/
  ingreso/costo/gasto). **Antes de correr esto con datos reales de un
  cliente, alguien con criterio fiscal (Misael) tiene que revisar y
  sustituir ese archivo.**
- **No presenta nada ante el SAT ni toma decisiones fiscales.** Es una capa
  de revisión que le ahorra tiempo al contador — la firma y el criterio
  final siguen siendo humanos.
- No guarda datos en un servidor: todo el análisis corre en el navegador,
  nada se sube a ningún lado. (Bueno para probar; para producción real con
  varios despachos vamos a necesitar backend + persistencia — ver Roadmap.)

## Requisitos

- [Node.js](https://nodejs.org) 18 o superior (se probó con Node 22).
- npm (viene con Node).

## Correrlo en local

```bash
cd fiscal-mvp
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000). Verás:

1. Un botón **"Usar datos de ejemplo"** — carga una balanza y un histórico
   de prueba de un solo clic, para que veas el flujo completo sin necesitar
   tus propios archivos.
2. O sube tu propia balanza en CSV con columnas `Cuenta, Nombre, Cargo,
   Abono` (y opcionalmente un histórico en JSON).
3. Dale **"Analizar balanza"** y revisa: resumen de cuadre, hallazgos,
   utilidad, tabla de cuentas clasificadas, y la gráfica de proyección.

## Probar que el motor funciona (sin abrir el navegador)

Hay un script que corre el análisis sobre los datos de ejemplo y valida los
resultados esperados:

```bash
npm test
```

Deberías ver algo como:

```
Diferencia de cuadre: 15000
Hallazgos: 2
Utilidad: { ingresos: 876000, costos: 312000, gastos: 255780, utilidad: 308220 }
✔ Todas las aserciones básicas pasaron.
```

(La diferencia de 15,000 y el hallazgo son intencionales en el ejemplo — hay
una cuenta "999-001" que no matchea ninguna regla, para que veas cómo el
sistema la atrapa.)

## Cómo está armado (por si Misael o alguien más quiere tocarlo)

```
app/page.tsx          → la interfaz: subir archivo, mostrar resultados
lib/parseBalanza.ts   → lee el CSV y lo convierte a filas estructuradas
lib/rules.ts          → encuentra qué regla aplica a cada número de cuenta
lib/analysis.ts        → el motor: clasificación, hallazgos, utilidad, proyección
data/reglas_ejemplo.json → EL CATÁLOGO DE REGLAS (esto es lo que Misael edita)
```

La decisión de diseño más importante: **las reglas fiscales viven en un
archivo de datos, separado del código.** Así Misael puede mantener y
corregir el catálogo de cuentas y las reglas de cumplimiento sin tocar una
línea de programación, y cualquier cambio en la ley se actualiza editando
ese JSON, no reescribiendo la app.

### Editar las reglas de clasificación

Abre `data/reglas_ejemplo.json`. Cada regla se ve así:

```json
{ "prefijo": "400", "tipo": "Ingreso", "nombre": "Ingresos por servicios", "codigoAgrupador": "400.01" }
```

`prefijo` es el inicio del número de cuenta. Cualquier cuenta que empiece
así (ej. `400-001`, `400-002`) se clasifica con ese tipo y código agrupador.
Guarda el archivo y recarga la página — no hay que reiniciar nada.

## Desplegarlo (para que Misael lo pruebe sin que corras nada en tu compu)

La forma más simple es [Vercel](https://vercel.com) (gratis para este uso, y
es quien hace Next.js, así que el soporte es de fábrica):

1. Sube esta carpeta a un repo de GitHub (puede ser privado).
2. Entra a vercel.com, "Add New Project", importa el repo.
3. Vercel detecta que es Next.js automáticamente — no hay que configurar nada.
4. Deploy. En ~1 minuto tienes una URL tipo `cierre-fiscal-ia.vercel.app`
   que le puedes compartir a Misael directamente.

Alternativa por línea de comandos, sin pasar por GitHub:

```bash
npm install -g vercel
vercel
```

Sigue las preguntas (login, nombre del proyecto) y te da una URL de
preview al terminar.

## Roadmap sugerido (de aquí para adelante)

1. **Ahora**: valida con Misael que la lógica de clasificación y hallazgos
   tiene sentido con balanzas reales (anonimizadas) de sus clientes. Este es
   el paso que más importa antes de escribir una sola línea más de código.
2. **Catálogo real**: sustituir `reglas_ejemplo.json` por el catálogo de
   cuentas real y las reglas de cumplimiento vigentes, con Misael como
   validador.
3. **Persistencia + multiusuario**: cuando esto deje de ser "yo pruebo en mi
   compu" y pase a "varios despachos lo usan", se necesita backend (login,
   base de datos, aislar los datos de cada despacho).
4. **Módulo de CFDI**: leer XMLs reales y validar deducibilidad/acreditación
   y retenciones ISR-IVA automáticamente.
5. **DIOT automatizada.**
6. **Trazabilidad**: cada hallazgo debe poder mostrar exactamente qué regla
   lo generó — esto es clave para que un contador confíe en la herramienta
   y no la use a ciegas.

## Nota legal

Esta herramienta apoya la revisión, no la sustituye. Ningún resultado de
este MVP debe usarse para presentar información ante el SAT sin la revisión
y validación de un contador certificado.
