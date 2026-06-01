// components/ClientHistoryChart.jsx
// Grafico storico pluriennale per un cliente — Ricavi e MOL% nel tempo

"use client";

import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const TIPO_COLOR = {
  "IMP EXE": "#6366f1",
  "PMCP":    "#f59e0b",
  "QL":      "#10b981",
  "D4Y":     "#3b82f6",
};

function formatEuro(v) {
  if (v == null) return "—";
  return new Intl.NumberFormat("it-IT", {
    style: "currency", currency: "EUR", maximumFractionDigits: 0,
  }).format(v);
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3 shadow text-sm">
      <p className="font-semibold text-gray-700 mb-1">{label}</p>
      {d?.tipo && (
        <p className="text-xs text-gray-400 mb-2">Programma: {d.tipo}</p>
      )}
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: {p.name === "MOL %" ? `${p.value?.toFixed(1)} %` : formatEuro(p.value)}
        </p>
      ))}
      {d?.note && (
        <p className="text-xs text-gray-400 mt-2 italic">📝 {d.note}</p>
      )}
    </div>
  );
}

export default function ClientHistoryChart({ cliente, location, chartData }) {
  if (!chartData || chartData.length === 0) {
    return (
      <div className="text-gray-400 text-sm p-4">Nessun dato storico disponibile.</div>
    );
  }

  const primoAnno  = chartData[0];
  const ultimoAnno = chartData[chartData.length - 1];
  const deltaRic   = ultimoAnno.ricavi && primoAnno.ricavi
    ? ((ultimoAnno.ricavi - primoAnno.ricavi) / primoAnno.ricavi * 100).toFixed(1)
    : null;

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">{cliente}</h3>
          <p className="text-sm text-gray-400">{location} · {chartData.length} anni di coaching</p>
        </div>
        {deltaRic && (
          <div className="text-right">
            <p className="text-xs text-gray-400">Crescita ricavi</p>
            <p className={`text-xl font-bold ${parseFloat(deltaRic) >= 0 ? "text-emerald-600" : "text-red-500"}`}>
              +{deltaRic}%
            </p>
            <p className="text-xs text-gray-400">
              {primoAnno.anno} → {ultimoAnno.anno}
            </p>
          </div>
        )}
      </div>

      {/* KPI pills */}
      <div className="flex gap-3 mb-5 flex-wrap">
        <Pill label="Ricavi ultimo anno" value={formatEuro(ultimoAnno.ricavi)} />
        <Pill label="MOL ultimo anno" value={ultimoAnno.molPerc != null ? `${ultimoAnno.molPerc.toFixed(1)}%` : "—"} />
        <Pill label="Poltrone" value={ultimoAnno.poltrone ?? "—"} />
        <Pill label="Ric./Poltrona" value={formatEuro(ultimoAnno.ricaviPoltrona)} />
      </div>

      {/* Grafico */}
      <ResponsiveContainer width="100%" height={260}>
        <ComposedChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="anno" tick={{ fontSize: 12 }} />
          <YAxis
            yAxisId="ricavi"
            tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
            tick={{ fontSize: 11 }}
            width={48}
          />
          <YAxis
            yAxisId="mol"
            orientation="right"
            tickFormatter={(v) => `${v}%`}
            tick={{ fontSize: 11 }}
            width={40}
            domain={[0, 50]}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar
            yAxisId="ricavi"
            dataKey="ricavi"
            name="Ricavi €"
            fill="#6366f1"
            opacity={0.85}
            radius={[4, 4, 0, 0]}
          />
          <Line
            yAxisId="mol"
            dataKey="molPerc"
            name="MOL %"
            stroke="#f59e0b"
            strokeWidth={2}
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
          />
        </ComposedChart>
      </ResponsiveContainer>

      {/* Benchmark MOL reference */}
      <p className="text-xs text-gray-400 mt-2">
        Benchmark MOL: <span className="font-medium text-amber-600">15–20%</span>
      </p>
    </div>
  );
}

function Pill({ label, value }) {
  return (
    <div className="bg-gray-50 rounded-lg px-3 py-2 text-center min-w-[110px]">
      <p className="text-xs text-gray-400">{label}</p>
      <p className="text-sm font-semibold text-gray-700">{value}</p>
    </div>
  );
}
