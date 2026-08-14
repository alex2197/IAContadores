import { readFileSync } from "fs";
import { parseBalanzaCSV } from "../lib/parseBalanza";
import { analizarBalanza, proyectarFiscal } from "../lib/analysis";
import reglas from "../data/reglas_ejemplo.json";

const csv = readFileSync("public/balanza_ejemplo.csv", "utf-8");
const historico = JSON.parse(readFileSync("public/historico_ejemplo.json", "utf-8"));

const { filas, erroresFormato } = parseBalanzaCSV(csv);
console.log("Filas parseadas:", filas.length, "Errores de formato:", erroresFormato.length);

const resultado = analizarBalanza(filas, reglas as any);
console.log("Diferencia de cuadre:", resultado.diferenciaCuadre);
console.log("Hallazgos:", resultado.hallazgos.length);
resultado.hallazgos.forEach((h) => console.log("  -", h.severidad, h.cuenta, h.detalle));
console.log("Utilidad:", resultado.resumenUtilidad);
console.log(
  "Cuentas clasificadas:",
  resultado.cuentas.filter((c) => c.clasificada).length,
  "/",
  resultado.cuentas.length
);

const proy = proyectarFiscal(historico, resultado.resumenUtilidad.utilidad);
console.log("Tasa promedio:", (proy.tasaCrecimientoPromedio * 100).toFixed(2) + "%");
console.log("Proyección:", proy.proyeccion);

// Aserciones básicas
if (Math.abs(resultado.diferenciaCuadre - 15000) > 0.01) {
  throw new Error("La diferencia de cuadre esperada era 15000 (por la cuenta sin clasificar).");
}
if (!resultado.hallazgos.some((h) => h.cuenta === "999-001")) {
  throw new Error("Se esperaba un hallazgo de 'sin clasificar' para la cuenta 999-001.");
}
if (Math.round(resultado.resumenUtilidad.utilidad) !== 308220) {
  throw new Error(`Utilidad esperada 308220, se obtuvo ${resultado.resumenUtilidad.utilidad}`);
}
console.log("\n✔ Todas las aserciones básicas pasaron.");
