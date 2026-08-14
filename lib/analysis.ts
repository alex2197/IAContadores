import { FilaBalanza } from "./parseBalanza";
import { ConjuntoReglas, encontrarRegla, naturalezaEsperada } from "./rules";

export type CuentaClasificada = FilaBalanza & {
  tipo: string | null;
  codigoAgrupador: string | null;
  clasificada: boolean;
};

export type Hallazgo = {
  reglaId: string;
  cuenta: string;
  nombre: string;
  severidad: "alta" | "media" | "baja";
  detalle: string;
};

export type ResumenUtilidad = {
  ingresos: number;
  costos: number;
  gastos: number;
  utilidad: number;
};

export type ResultadoAnalisis = {
  cuentas: CuentaClasificada[];
  hallazgos: Hallazgo[];
  cumple: number;
  noCumple: number;
  resumenUtilidad: ResumenUtilidad;
  diferenciaCuadre: number;
};

export function analizarBalanza(
  filas: FilaBalanza[],
  reglas: ConjuntoReglas
): ResultadoAnalisis {
  const hallazgos: Hallazgo[] = [];

  // 1. Clasificación por código agrupador
  const cuentas: CuentaClasificada[] = filas.map((f) => {
    const regla = encontrarRegla(f.cuenta, reglas.reglasClasificacion);
    const clasificada = !!regla;
    if (!clasificada) {
      hallazgos.push({
        reglaId: "cuenta-sin-clasificar",
        cuenta: f.cuenta,
        nombre: f.nombre || "(sin nombre)",
        severidad: "media",
        detalle:
          "No se encontró una regla de código agrupador para esta cuenta. Revisar el catálogo de reglas.",
      });
    }
    if (!f.nombre) {
      hallazgos.push({
        reglaId: "cuenta-sin-movimiento-relevante",
        cuenta: f.cuenta,
        nombre: "(sin nombre)",
        severidad: "alta",
        detalle: "La cuenta no tiene nombre/descripción en la balanza.",
      });
    }
    return {
      ...f,
      tipo: regla?.tipo ?? null,
      codigoAgrupador: regla?.codigoAgrupador ?? null,
      clasificada,
    };
  });

  // 2. Cuadre de partida doble
  const totalCargo = filas.reduce((acc, f) => acc + f.cargo, 0);
  const totalAbono = filas.reduce((acc, f) => acc + f.abono, 0);
  const diferenciaCuadre = Math.round((totalCargo - totalAbono) * 100) / 100;
  if (Math.abs(diferenciaCuadre) > 0.01) {
    hallazgos.push({
      reglaId: "partida-doble",
      cuenta: "—",
      nombre: "Balanza completa",
      severidad: "alta",
      detalle: `La balanza no cuadra: cargos ${totalCargo.toFixed(
        2
      )} vs abonos ${totalAbono.toFixed(2)} (diferencia ${diferenciaCuadre.toFixed(
        2
      )}).`,
    });
  }

  // 3. Naturaleza de saldo inconsistente
  for (const c of cuentas) {
    if (!c.tipo) continue;
    const esperada = naturalezaEsperada(c.tipo as any);
    const esDeudor = c.saldo >= 0;
    const esAcreedor = c.saldo < 0;
    const inconsistente =
      (esperada === "deudor" && esAcreedor && Math.abs(c.saldo) > 0.01) ||
      (esperada === "acreedor" && esDeudor && Math.abs(c.saldo) > 0.01 && c.saldo !== 0);
    if (inconsistente) {
      hallazgos.push({
        reglaId: "naturaleza-saldo",
        cuenta: c.cuenta,
        nombre: c.nombre || "(sin nombre)",
        severidad: "media",
        detalle: `Cuenta de tipo ${c.tipo} con saldo ${c.saldo.toFixed(
          2
        )}, naturaleza esperada: ${esperada}. Puede ser normal, pero revisar.`,
      });
    }
  }

  // 4. Resumen de utilidad (Ingresos - Costos - Gastos)
  // Nota: con la convención saldo = Cargo - Abono, Ingresos suelen tener saldo negativo (acreedor).
  const sumaPorTipo = (tipo: string) =>
    cuentas
      .filter((c) => c.tipo === tipo)
      .reduce((acc, c) => acc + c.saldo, 0);

  const ingresos = -sumaPorTipo("Ingreso"); // se invierte el signo por ser cuenta acreedora
  const costos = sumaPorTipo("Costo");
  const gastos = sumaPorTipo("Gasto");
  const utilidad = ingresos - costos - gastos;

  const cumple = filas.length - new Set(hallazgos.map((h) => h.cuenta + h.reglaId)).size;

  return {
    cuentas,
    hallazgos,
    cumple: Math.max(cumple, 0),
    noCumple: hallazgos.length,
    resumenUtilidad: { ingresos, costos, gastos, utilidad },
    diferenciaCuadre,
  };
}

export type PuntoHistorico = { periodo: string; utilidad: number };

export type ResultadoProyeccion = {
  historico: PuntoHistorico[];
  proyeccion: PuntoHistorico[];
  tasaCrecimientoPromedio: number;
};

// Proyección simple basada en la tasa de crecimiento promedio mes a mes del histórico.
export function proyectarFiscal(
  historico: PuntoHistorico[],
  utilidadActual: number,
  periodosAProyectar = 3
): ResultadoProyeccion {
  const serie = [...historico, { periodo: "Actual", utilidad: utilidadActual }];

  const tasas: number[] = [];
  for (let i = 1; i < serie.length; i++) {
    const prev = serie[i - 1].utilidad;
    const curr = serie[i].utilidad;
    if (prev !== 0) tasas.push((curr - prev) / Math.abs(prev));
  }
  const tasaPromedio =
    tasas.length > 0 ? tasas.reduce((a, b) => a + b, 0) / tasas.length : 0;

  const proyeccion: PuntoHistorico[] = [];
  let base = utilidadActual;
  for (let i = 1; i <= periodosAProyectar; i++) {
    base = base * (1 + tasaPromedio);
    proyeccion.push({ periodo: `Proyectado +${i}`, utilidad: Math.round(base * 100) / 100 });
  }

  return { historico: serie, proyeccion, tasaCrecimientoPromedio: tasaPromedio };
}
