"use client";

import { OpenPanelComponent } from "@openpanel/nextjs";

const DEFAULT_API_URL = "https://opapi.athroniaeth.cloud";
// `op1.js` est un loader générique servi par le CDN OpenPanel : l'API auto-hébergée
// ne le sert pas (renvoie 404). Le script lit `apiUrl` à l'exécution, donc les
// événements partent bien vers l'instance auto-hébergée. Surchargeable si un jour
// l'API sert son propre op1.js.
const DEFAULT_SCRIPT_URL = "https://openpanel.dev/op1.js";

/**
 * Monte le SDK OpenPanel côté navigateur. Retourne null si le clientId est
 * absent (dev/local par défaut) : aucun script chargé, aucun suivi.
 */
export function Analytics() {
  const clientId = process.env.NEXT_PUBLIC_OPENPANEL_CLIENT_ID;
  if (!clientId) return null;

  // Slash final retiré : un `.../` produirait une URL cassée.
  const apiUrl = (process.env.NEXT_PUBLIC_OPENPANEL_API_URL ?? DEFAULT_API_URL).replace(/\/$/, "");
  const scriptUrl = process.env.NEXT_PUBLIC_OPENPANEL_SCRIPT_URL ?? DEFAULT_SCRIPT_URL;

  return (
    <OpenPanelComponent
      apiUrl={apiUrl}
      scriptUrl={scriptUrl}
      clientId={clientId}
      trackScreenViews
      trackOutgoingLinks
    />
  );
}
