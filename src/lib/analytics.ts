"use client";

import { useCallback } from "react";
import { useOpenPanel } from "@openpanel/nextjs";

/**
 * Ensemble FERMÉ des événements analytics autorisés. Ne contient que des
 * métadonnées non identifiantes — jamais de texte saisi, d'entité détectée ni
 * de contenu de span. C'est le garde-fou vie privée : impossible d'envoyer une
 * clé non prévue sans modifier ce type.
 */
export type AnalyticsEvent =
  | {
      name: "detector_run";
      props: { detectorType: string; entityCount: number; durationMs: number; modelId?: string };
    }
  | { name: "detector_saved"; props: { detectorType: string } }
  | { name: "pipeline_run"; props: { detectorCount: number; entityCount: number } }
  | { name: "pipeline_exported"; props: { format: "toml" | "python"; detectorCount: number } };

/**
 * Hook renvoyant une fonction de suivi typée. Si OpenPanel n'est pas initialisé
 * (pas de clientId → composant non monté), l'appel est un no-op silencieux.
 */
export function useTrack() {
  const op = useOpenPanel();
  return useCallback(
    (event: AnalyticsEvent) => {
      try {
        op.track(event.name, event.props);
      } catch {
        // OpenPanel non initialisé : ne pas casser l'app.
      }
    },
    [op],
  );
}
