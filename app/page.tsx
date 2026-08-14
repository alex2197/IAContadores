"use client";

import { useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { parseBalanzaCSV } from "@/lib/parseBalanza";
import {
  analizarBalanza,
  proyectarFiscal,
  ResultadoAnalisis,
  ResultadoProyeccion,
  PuntoHistorico,
} from "@/lib/analysis";
import reglasEjemplo from "@/data/reglas_ejemplo.json";
import type { ConjuntoReglas } from "@/lib/rules";

const reglas = reglasEjemplo as ConjuntoReglas;

function Stamp({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: "teal" | "rust" | "amber";
}) {
  const cls =
    tone === "teal"
      ? "border-teal text-teal bg-teal-soft"
      : tone === "rust"
      ? "border-rust text-rust bg-rust-soft"
      : "border-amber text-amber bg-amber-soft";
  return <span className={`stamp ${cls}`}>{children}</span>;
}

function fmt(n: number) {
  return n.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function Page() {
  const [csvText, setCsvText] = useState<string | null>(null);
  const [historico, setHistorico] = useState<PuntoHistorico[]>([]);
  const [resultado, setResultado] = useState<ResultadoAnalisis | null>(null);
  const [proyeccion, setProyeccion] = useState<ResultadoProyeccion | null>(null);
  const [erroresFormato, setErroresFormato] = useState<string[]>([]);
  const [mostrarReglas, setMostrarReglas] = useState(false);

  function onBalanzaFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setCsvText(reader.result as string);
    reader.readAsText(file);
  }

  function onHistoricoFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result as string) as PuntoHistorico[];
        setHistorico(data);
      } catch {
        setErroresFormato((prev) => [...prev, "El archivo histórico no es JSON válido."]);
      }
    };
    reader.readAsText(file);
  }

  async function cargarEjemplo() {
    const [c, h] = await Promise.all([
      fetch("/balanza_ejemplo.csv").then((r) => r.text()),
      fetch("/historico_ejemplo.json").then((r) => r.json()),
    ]);
    setCsvText(c);
    setHistorico(h);
  }

  function analizar() {
    if (!csvText) return;
    const { filas, erroresFormato: errores } = parseBalanzaCSV(csvText);
    setErroresFormato(errores);
    const res = analizarBalanza(filas, reglas);
    setResultado(res);
    if (historico.length > 0) {
      setProyeccion(proyectarFiscal(historico, res.resumenUtilidad.utilidad));
    } else {
      setProyeccion(null);
    }
  }

  const chartData = proyeccion
    ? [...proyeccion.historico, ...proyeccion.proyeccion]
    : [];

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <header className="mb-8 border-b border-hairline pb-6">
        <p className="stamp border-ink text-ink mb-3">MVP · uso interno</p>
        <h1 className="text-2xl font-semibold tracking-tight">
          Cierre fiscal — copiloto de revisión
        </h1>
        <p className="mt-2 text-inkmuted">
          Carga una balanza de comprobación y revisa clasificación, cuadre y
          posibles contingencias antes de que las veas tú.
        </p>
      </header>

      <section className="mb-8 rounded border border-amber/40 bg-amber-soft/60 p-4 text-sm text-amber">
        Las reglas de clasificación y código agrupador que usa esta versión son
        de <strong>ejemplo</strong>, no el catálogo oficial vigente del SAT.
        Antes de usarlo con datos reales de un cliente, el contador debe
        revisar y sustituir <code className="ledger-num">data/reglas_ejemplo.json</code>{" "}
        por el catálogo real.
      </section>

      <section className="mb-10 grid gap-4 sm:grid-cols-2">
        <div className="rounded border border-hairline bg-white/40 p-4">
          <label className="block text-sm font-medium mb-2">
            Balanza de comprobación (.csv)
          </label>
          <input
            type="file"
            accept=".csv"
            onChange={onBalanzaFile}
            className="block w-full text-sm text-inkmuted file:mr-3 file:rounded file:border-0 file:bg-teal file:px-3 file:py-1.5 file:text-white file:text-sm"
          />
          <p className="mt-2 text-xs text-inkmuted">
            Columnas esperadas: Cuenta, Nombre, Cargo, Abono
          </p>
        </div>

        <div className="rounded border border-hairline bg-white/40 p-4">
          <label className="block text-sm font-medium mb-2">
            Histórico de utilidad (.json) — opcional, para proyección
          </label>
          <input
            type="file"
            accept=".json"
            onChange={onHistoricoFile}
            className="block w-full text-sm text-inkmuted file:mr-3 file:rounded file:border-0 file:bg-teal file:px-3 file:py-1.5 file:text-white file:text-sm"
          />
          <p className="mt-2 text-xs text-inkmuted">
            Formato: [{"{"}"periodo":"Ene","utilidad":245000{"}"}, ...]
          </p>
        </div>
      </section>

      <div className="mb-10 flex flex-wrap items-center gap-3">
        <button
          onClick={cargarEjemplo}
          className="rounded border border-ink px-4 py-2 text-sm hover:bg-ink hover:text-paper transition-colors"
        >
          Usar datos de ejemplo
        </button>
        <button
          onClick={analizar}
          disabled={!csvText}
          className="rounded bg-teal px-4 py-2 text-sm text-white disabled:opacity-40"
        >
          Analizar balanza
        </button>
        {csvText && (
          <span className="text-xs text-inkmuted">Balanza cargada, lista para analizar.</span>
        )}
      </div>

      {erroresFormato.length > 0 && (
        <section className="mb-8 rounded border border-rust/40 bg-rust-soft p-4 text-sm text-rust">
          <p className="font-medium mb-1">El archivo tiene {erroresFormato.length} problema(s) de formato:</p>
          <ul className="list-disc pl-5 space-y-0.5">
            {erroresFormato.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </section>
      )}

      {resultado && (
        <>
          <section className="mb-10">
            <h2 className="text-lg font-medium mb-4">Resumen del cierre</h2>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded border border-hairline p-4">
                <p className="text-xs text-inkmuted mb-1">Cuadre de balanza</p>
                {Math.abs(resultado.diferenciaCuadre) < 0.01 ? (
                  <Stamp tone="teal">Cuadra</Stamp>
                ) : (
                  <Stamp tone="rust">
                    No cuadra ({fmt(resultado.diferenciaCuadre)})
                  </Stamp>
                )}
              </div>
              <div className="rounded border border-hairline p-4">
                <p className="text-xs text-inkmuted mb-1">Hallazgos detectados</p>
                <p className="ledger-num text-2xl">{resultado.hallazgos.length}</p>
              </div>
              <div className="rounded border border-hairline p-4">
                <p className="text-xs text-inkmuted mb-1">Cuentas clasificadas</p>
                <p className="ledger-num text-2xl">
                  {resultado.cuentas.filter((c) => c.clasificada).length} / {resultado.cuentas.length}
                </p>
              </div>
            </div>
          </section>

          <section className="mb-10">
            <h2 className="text-lg font-medium mb-4">Utilidad del periodo</h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 rounded border border-hairline p-4">
              <div>
                <p className="text-xs text-inkmuted">Ingresos</p>
                <p className="ledger-num">{fmt(resultado.resumenUtilidad.ingresos)}</p>
              </div>
              <div>
                <p className="text-xs text-inkmuted">Costos</p>
                <p className="ledger-num">{fmt(resultado.resumenUtilidad.costos)}</p>
              </div>
              <div>
                <p className="text-xs text-inkmuted">Gastos</p>
                <p className="ledger-num">{fmt(resultado.resumenUtilidad.gastos)}</p>
              </div>
              <div>
                <p className="text-xs text-inkmuted">Utilidad neta</p>
                <p className="ledger-num font-semibold text-teal">
                  {fmt(resultado.resumenUtilidad.utilidad)}
                </p>
              </div>
            </div>
          </section>

          {resultado.hallazgos.length > 0 && (
            <section className="mb-10">
              <h2 className="text-lg font-medium mb-4">Hallazgos — revisar antes de cerrar</h2>
              <div className="overflow-x-auto rounded border border-hairline">
                <table className="w-full text-sm">
                  <thead className="bg-white/60 text-left text-xs uppercase text-inkmuted">
                    <tr>
                      <th className="px-3 py-2">Severidad</th>
                      <th className="px-3 py-2">Cuenta</th>
                      <th className="px-3 py-2">Nombre</th>
                      <th className="px-3 py-2">Detalle</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resultado.hallazgos.map((h, i) => (
                      <tr key={i} className="border-t border-hairline">
                        <td className="px-3 py-2">
                          <Stamp tone={h.severidad === "alta" ? "rust" : "amber"}>
                            {h.severidad}
                          </Stamp>
                        </td>
                        <td className="px-3 py-2 ledger-num">{h.cuenta}</td>
                        <td className="px-3 py-2">{h.nombre}</td>
                        <td className="px-3 py-2 text-inkmuted">{h.detalle}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          <section className="mb-10">
            <h2 className="text-lg font-medium mb-4">Cuentas clasificadas</h2>
            <div className="overflow-x-auto rounded border border-hairline">
              <table className="w-full text-sm">
                <thead className="bg-white/60 text-left text-xs uppercase text-inkmuted">
                  <tr>
                    <th className="px-3 py-2">Cuenta</th>
                    <th className="px-3 py-2">Nombre</th>
                    <th className="px-3 py-2">Tipo</th>
                    <th className="px-3 py-2">Cód. agrupador</th>
                    <th className="px-3 py-2 text-right">Saldo</th>
                  </tr>
                </thead>
                <tbody>
                  {resultado.cuentas.map((c, i) => (
                    <tr key={i} className="border-t border-hairline">
                      <td className="px-3 py-2 ledger-num">{c.cuenta}</td>
                      <td className="px-3 py-2">{c.nombre || "—"}</td>
                      <td className="px-3 py-2">{c.tipo ?? <span className="text-rust">sin clasificar</span>}</td>
                      <td className="px-3 py-2 ledger-num">{c.codigoAgrupador ?? "—"}</td>
                      <td className="px-3 py-2 text-right ledger-num">{fmt(c.saldo)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {proyeccion && (
            <section className="mb-10">
              <h2 className="text-lg font-medium mb-1">Proyección fiscal</h2>
              <p className="text-xs text-inkmuted mb-4">
                Método: tasa de crecimiento promedio mes a mes del histórico
                (
                {(proyeccion.tasaCrecimientoPromedio * 100).toFixed(1)}% promedio
                ). Es una estimación simple de ejemplo, no un modelo fiscal
                certificado.
              </p>
              <div className="rounded border border-hairline p-4" style={{ height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid stroke="#D8D5C9" strokeDasharray="3 3" />
                    <XAxis dataKey="periodo" tick={{ fontSize: 12 }} stroke="#5B6560" />
                    <YAxis tick={{ fontSize: 12 }} stroke="#5B6560" />
                    <Tooltip
                      formatter={(v: number) => fmt(v)}
                      contentStyle={{ fontSize: 12, borderColor: "#D8D5C9" }}
                    />
                    <ReferenceLine x="Actual" stroke="#9A3324" strokeDasharray="4 4" />
                    <Line
                      type="monotone"
                      dataKey="utilidad"
                      stroke="#0F6E56"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </section>
          )}
        </>
      )}

      <section className="mt-14 border-t border-hairline pt-6">
        <button
          onClick={() => setMostrarReglas((v) => !v)}
          className="text-sm text-inkmuted underline underline-offset-2"
        >
          {mostrarReglas ? "Ocultar" : "Ver"} reglas que está aplicando el motor
        </button>
        {mostrarReglas && (
          <div className="mt-4 grid gap-6 sm:grid-cols-2">
            <div>
              <h3 className="text-sm font-medium mb-2">Clasificación de cuentas</h3>
              <ul className="space-y-1 text-xs text-inkmuted">
                {reglas.reglasClasificacion.map((r, i) => (
                  <li key={i}>
                    <span className="ledger-num">{r.prefijo}xx</span> → {r.tipo} ·{" "}
                    {r.nombre} · cód. {r.codigoAgrupador}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-medium mb-2">Reglas de cumplimiento</h3>
              <ul className="space-y-2 text-xs text-inkmuted">
                {reglas.reglasCumplimiento.map((r, i) => (
                  <li key={i}>
                    <strong className="text-ink">{r.nombre}</strong> ({r.severidad})
                    <br />
                    {r.descripcion}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
