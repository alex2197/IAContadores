export type ReglaClasificacion = {
  prefijo: string;
  tipo: "Activo" | "Pasivo" | "Capital" | "Ingreso" | "Costo" | "Gasto";
  nombre: string;
  codigoAgrupador: string;
};

export type ReglaCumplimiento = {
  id: string;
  nombre: string;
  descripcion: string;
  severidad: "alta" | "media" | "baja";
};

export type ConjuntoReglas = {
  _advertencia?: string;
  version: string;
  reglasClasificacion: ReglaClasificacion[];
  reglasCumplimiento: ReglaCumplimiento[];
};

// Encuentra la regla de clasificación por coincidencia de prefijo más larga.
export function encontrarRegla(
  cuenta: string,
  reglas: ReglaClasificacion[]
): ReglaClasificacion | null {
  const candidatas = reglas
    .filter((r) => cuenta.startsWith(r.prefijo))
    .sort((a, b) => b.prefijo.length - a.prefijo.length);
  return candidatas[0] ?? null;
}

// Naturaleza esperada del saldo: Activo/Gasto/Costo = deudor (saldo positivo);
// Pasivo/Capital/Ingreso = acreedor (saldo negativo con nuestra convención Cargo-Abono).
export function naturalezaEsperada(
  tipo: ReglaClasificacion["tipo"]
): "deudor" | "acreedor" {
  return tipo === "Pasivo" || tipo === "Capital" || tipo === "Ingreso"
    ? "acreedor"
    : "deudor";
}
