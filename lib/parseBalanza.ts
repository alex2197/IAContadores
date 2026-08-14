import Papa from "papaparse";

export type FilaBalanza = {
  cuenta: string;
  nombre: string;
  cargo: number;
  abono: number;
  saldo: number;
};

export type ResultadoParseo = {
  filas: FilaBalanza[];
  erroresFormato: string[];
};

// Formato esperado del CSV: Cuenta,Nombre,Cargo,Abono
// (Saldo se calcula como Cargo - Abono si no viene incluido)
export function parseBalanzaCSV(csvText: string): ResultadoParseo {
  const parsed = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().toLowerCase(),
  });

  const filas: FilaBalanza[] = [];
  const erroresFormato: string[] = [];

  parsed.data.forEach((row, idx) => {
    const cuenta = (row["cuenta"] ?? "").trim();
    const nombre = (row["nombre"] ?? "").trim();
    const cargoRaw = (row["cargo"] ?? "0").toString().replace(/,/g, "").trim();
    const abonoRaw = (row["abono"] ?? "0").toString().replace(/,/g, "").trim();

    if (!cuenta) {
      erroresFormato.push(`Fila ${idx + 2}: falta el número de cuenta.`);
      return;
    }

    const cargo = parseFloat(cargoRaw || "0");
    const abono = parseFloat(abonoRaw || "0");

    if (Number.isNaN(cargo) || Number.isNaN(abono)) {
      erroresFormato.push(
        `Fila ${idx + 2} (cuenta ${cuenta}): cargo o abono no es un número válido.`
      );
      return;
    }

    filas.push({
      cuenta,
      nombre,
      cargo,
      abono,
      saldo: cargo - abono,
    });
  });

  return { filas, erroresFormato };
}
