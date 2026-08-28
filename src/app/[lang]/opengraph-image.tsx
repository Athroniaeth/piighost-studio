import { ImageResponse } from "next/og";

export const dynamic = "force-static";

export function generateStaticParams() {
  return [{ lang: "en" }, { lang: "fr" }];
}

export const alt = "piighost - anonymize PII before it reaches the LLM";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "center",
          padding: "80px",
          background: "#0b0b0f",
          color: "#ffffff",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ fontSize: 96, fontWeight: 700, letterSpacing: "-0.03em" }}>
          piighost
        </div>
        <div style={{ fontSize: 40, marginTop: 24, color: "#c7c7d1", maxWidth: 900 }}>
          Anonymize PII before it reaches the LLM.
        </div>
      </div>
    ),
    { ...size },
  );
}
