// app/api/history/route.js
// Endpoint: GET /api/history?fileId=XXX&coach=sabrina&cliente=Studio+Rossi (opzionale)

import { NextResponse } from "next/server";
import { getCoachHistory, toChartData } from "@/lib/history-parser";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const fileId  = searchParams.get("fileId");
  const coach   = searchParams.get("coach");
  const cliente = searchParams.get("cliente"); // opzionale — filtra un solo cliente

  if (!fileId || !coach) {
    return NextResponse.json(
      { error: "Parametri obbligatori: fileId, coach" },
      { status: 400 }
    );
  }

  try {
    const allClients = await getCoachHistory(fileId, coach);

    // Se richiesto un cliente specifico, restituisci solo quello
    if (cliente) {
      const found = allClients.find(
        (c) => c.nome.toLowerCase().includes(cliente.toLowerCase())
      );
      if (!found) {
        return NextResponse.json({ error: "Cliente non trovato" }, { status: 404 });
      }
      return NextResponse.json({
        cliente: found.nome,
        location: found.location,
        chartData: toChartData(found),
      });
    }

    // Altrimenti restituisci la lista completa (nome + ultimo anno)
    const summary = allClients.map((c) => {
      const ultimo = c.anni[c.anni.length - 1];
      return {
        nome:           c.nome,
        location:       c.location,
        anniCoaching:   c.anni.length,
        ultimoAnno:     ultimo?.anno,
        ultimiRicavi:   ultimo?.ricavi,
        ultimoMolPerc:  ultimo?.molPerc,
        chartData:      toChartData(c),
      };
    });

    return NextResponse.json({ coach, clienti: summary });

  } catch (err) {
    console.error("[/api/history]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
