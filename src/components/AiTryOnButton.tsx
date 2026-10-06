"use client";

import { Sparkles } from "lucide-react";
import { useState } from "react";

export default function AiTryOnButton({ outfitId, enabled, compact = false }: { outfitId?: string; enabled: boolean; compact?: boolean }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function generate() {
    if (!outfitId || !enabled) return;
    setBusy(true); setMessage("");
    const response = await fetch(`/api/outfits/${outfitId}/ai-tryon`, { method: "POST" });
    const payload = await response.json();
    setBusy(false);
    setMessage(response.ok ? (payload.cached ? "Resultado reutilizado" : "Generación en cola") : payload.error);
  }
  return <div className={`ai-tryon-control ${compact ? "compact" : ""}`}><button className={compact ? "icon-btn" : "btn btn-ai"} disabled={!enabled || !outfitId || busy} aria-label="Generar imagen realista" title={!enabled ? "Generación IA: configuración pendiente" : "Generar imagen realista"} onClick={() => void generate()}><Sparkles size={16}/>{!compact && (busy ? "Preparando…" : "Generar imagen realista")}</button>{!compact && !enabled && <small>Próximamente · configuración pendiente</small>}{!compact && message && <small>{message}</small>}</div>;
}
