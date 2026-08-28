"use client";

import { OpenPanelComponent } from "@openpanel/nextjs";

const DEFAULT_API_URL = "https://opapi.athroniaeth.cloud";

/**
 * Monte le SDK OpenPanel côté navigateur. Retourne null si le clientId est
 * absent (dev/local par défaut) : aucun script chargé, aucun suivi.
 */
export function Analytics() {
  const clientId = process.env.NEXT_PUBLIC_OPENPANEL_CLIENT_ID;
  if (!clientId) return null;

  // Slash final retiré : un `.../` produirait un `//op1.js` cassé.
  const apiUrl = (process.env.NEXT_PUBLIC_OPENPANEL_API_URL ?? DEFAULT_API_URL).replace(/\/$/, "");

  return (
    <OpenPanelComponent
      apiUrl={apiUrl}
      scriptUrl={`${apiUrl}/op1.js`}
      clientId={clientId}
      trackScreenViews
      trackOutgoingLinks
    />
  );
}
