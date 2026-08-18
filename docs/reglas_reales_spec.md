# Especificación real de cierre fiscal (ISR personas morales)

> **Origen y confidencialidad**: este documento se construyó a partir de una
> **plantilla en blanco** (`Formato_de_declaración_anual_2024.xlsx`) sin
> datos de ningún cliente — todas las celdas de captura estaban vacías o en
> cero. Se usó un segundo archivo real de un cliente (vía Misael) únicamente
> para **confirmar que la metodología y fórmulas coinciden** con la
> plantilla; de ese archivo no se copió ninguna cifra, nombre de cliente,
> RFC ni dato identificable — solo se verificó estructura. Este archivo es
> seguro de commitear al repo.

## Por qué esto importa para el MVP

El motor actual (`lib/analysis.ts`) resuelve una porción pequeña del cierre
real: clasificación por código agrupador, cuadre de partida doble, y una
utilidad contable simple. Un cierre fiscal completo de ISR para personas
morales tiene ~18 análisis encadenados. Este documento los mapea, con la
lógica de cálculo real, para poder priorizar qué construir después.

## Insight de arquitectura — dos tipos de módulos muy distintos

Al mapear todo, aparece una distinción que **cambia el diseño del producto**:

1. **Cálculo del periodo** (lo que el MVP ya hace o puede extender
   directamente desde una balanza): Conciliación fiscal, Deducciones
   autorizadas, Coeficiente de utilidad, Determinación ISR. Solo necesitan
   los datos del ejercicio actual.
2. **Cuentas de arrastre histórico** (requieren memoria entre ejercicios,
   no solo la balanza de hoy): **CUFIN**, **CUCA**, **Pérdidas fiscales**.
   Cada una es una tabla que se actualiza *año con año desde el origen de
   la empresa* con factores de inflación (INPC). Esto implica que el
   producto necesita **persistencia multi-periodo por cliente**, no solo
   "sube tu balanza y analiza" — es un cambio de modelo de datos, no solo
   una regla más.

Esto refuerza lo que ya hablamos del roadmap: la fase de "persistencia +
multiusuario" no es opcional a mediano plazo, es un requisito estructural
para al menos 3 de los módulos más importantes.

## Mapa de módulos

### Tier 1 — calculables desde datos del periodo (más cercanos al MVP actual)

| Módulo | Qué hace | Lógica clave |
|---|---|---|
| **Conciliación fiscal** | Reconcilia utilidad/pérdida contable con la fiscal, partida por partida (ingresos fiscales no contables, deducciones no contables, etc.) | `Utilidad histórica = Resultado contable + efecto inflación`; cada partida de ajuste se suma con `SUMIF` contra un catálogo de conceptos codificados |
| **Deducciones autorizadas** | Suma todas las deducciones fiscales del ejercicio | `Total = Sueldos + Gastos + Deducciones de nómina + Inversiones + Costo de ventas + Ajuste anual deducible + Estímulos` |
| **Coeficiente de utilidad** | Determina el % que se usa para pagos provisionales del siguiente ejercicio | `Coeficiente = TRUNC(Utilidad fiscal del periodo / Ingresos nominales, 4)` |
| **Determinación ISR** | El cálculo final: ingresos − deducciones = utilidad fiscal → aplica pérdidas → ISR | `Utilidad fiscal = Ingresos acumulables − Deducciones autorizadas − PTU pagada`; `ISR causado = ROUND(Resultado fiscal × 0.30, 0)` (tasa vigente de personas morales) |
| **Ajuste anual por inflación** | Efecto fiscal de la inflación sobre créditos y deudas promedio del año | `Ajuste acumulable = Diferencia (deudas > créditos) × factor de ajuste`; `Ajuste deducible` es el caso inverso. El factor sale de INPC diciembre vs INPC diciembre anterior |

### Tier 2 — cuentas de arrastre histórico (requieren memoria multi-año)

| Módulo | Qué hace | Lógica clave |
|---|---|---|
| **CUFIN** (Cuenta de Utilidad Fiscal Neta) | Acumula utilidades ya gravadas, año tras año, actualizadas por inflación — determina qué dividendos se pueden repartir sin pagar ISR adicional | Por año: `UFIN = Utilidad fiscal − ISR pagado − Gastos no deducibles − PTU pagada`, actualizada con `INPC mes actual / INPC última actualización` |
| **CUCA** (Cuenta de Aportaciones de Capital) | Igual que CUFIN pero para aportaciones de capital — determina qué se puede devolver a accionistas sin ISR | `Capital actualizado = (Saldo anterior × factor de actualización) + Aumentos − Disminuciones` |
| **Pérdidas fiscales** | Historial de pérdidas de ejercicios anteriores, actualizadas por inflación, disponibles para amortizar contra utilidades futuras (10 años en México) | Cada año de pérdida se actualiza con dos factores INPC (uno al momento de la pérdida, otro al cierre) y se amortiza contra utilidad de años posteriores hasta agotarse |

### Tier 3 — especializados / aplican solo en ciertos casos

| Módulo | Qué hace | Cuándo aplica |
|---|---|---|
| **Capitalización delgada** | Límite a la deducción de intereses cuando la deuda con partes relacionadas extranjeras excede 3x el capital contable | Empresas con deuda intercompañía relevante |
| **Intereses netos no deducibles** | Límite de deducción de intereses netos al 30% de la utilidad fiscal ajustada, o MXP 20,000,000, lo que sea mayor | Empresas con carga financiera alta |
| **Partes relacionadas** | Bitácora de operaciones con partes relacionadas (nombre, ID fiscal, país, monto, retención) | Cualquier empresa con transacciones intercompañía — insumo típico para precios de transferencia |
| **Depreciaciones AF / Venta de AF** | Concilia depreciación contable vs. fiscal por activo, y la ganancia/pérdida fiscal en venta de activo fijo | Empresas con activo fijo relevante |
| **Sueldos exentos no deducibles** | Determina qué % de las prestaciones exentas de nómina NO es deducible (53% o 47% según si el % de exentos bajó vs. el año anterior) | Todas las empresas con nómina |

### Otros (soporte / catálogos, no lógica fiscal en sí)

- **T1-T3**: INPC, tipo de cambio, equivalencias — catálogos de referencia pública (SAT/Banxico) que alimentan las fórmulas de actualización de arriba.
- **A1-A3**: Estados financieros para declaración anual (resultado, balance, conciliación).
- **A4-A16**: Detalle de cada rubro para el llenado literal de los campos de la declaración anual en el portal del SAT.

## El "checklist de amarres" (ya lo habías visto en la plantilla)

Estos 5 puntos, ya extraídos antes, son controles de cruce que no dependen
de fórmulas fiscales sino de comparar fuentes de datos distintas — son
candidatos naturales para automatizarse temprano porque son más "cruce de
datos" que "criterio fiscal":

1. Ingresos en balanza vs. ingresos declarados en pagos provisionales.
2. Facturación (CFDI) vs. ingresos que deberían tener factura.
3. CFDI de nómina timbrados vs. acumulado de nómina en balanza (incluye PTU).
4. Facturas de arrendamiento financiero (para análisis IFRS 16).
5. Flujo de efectivo y estado de cambios en capital contable preparados.

## Recomendación de siguiente incremento

Dado que Tier 1 no requiere rediseñar el modelo de datos (sigue siendo
"una balanza + catálogos → resultado"), y Tier 2 sí, el orden que tiene más
sentido de construir:

1. **Deducciones autorizadas + Conciliación fiscal + Coeficiente de
   utilidad + Determinación ISR** — extiende `lib/analysis.ts` con un
   catálogo de conceptos de conciliación (nuevo archivo de reglas, mismo
   patrón que `reglas_ejemplo.json`), sin tocar el modelo de datos.
2. Después, evaluar si CUFIN/CUCA/Pérdidas fiscales entran en esta fase o
   se dejan para cuando ya exista persistencia multi-cliente — construirlas
   sobre almacenamiento temporal (ej. que el usuario suba también el saldo
   del año anterior) es una opción intermedia antes de tener backend completo.
