import { Cloud, Cpu, Scale } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Section } from "@/components/section";

const items = [
  {
    icon: Cloud,
    title: "Hosted clouds leak raw data",
    body: "OpenAI, Anthropic, and Google ship the best models on the market. But every byte of context you send them, including raw user PII, leaves your jurisdiction the moment the request hits the wire. A single prompt becomes a data export, and 'we will redact it later' is not a story that survives a real audit.",
  },
  {
    icon: Cpu,
    title: "Local models trade quality",
    body: "Self-hosting keeps the data inside your network, but you give up part of the state of the art and you take on the GPU bill, the patching, and the eval pipeline. The privacy gain comes with a permanent operational cost, and the model you can run is rarely the model you wish you were running.",
  },
  {
    icon: Scale,
    title: "Compliance does not wait",
    body: "GDPR, HIPAA, and data-residency rules apply whether or not your stack was built with them in mind. Sending raw PII to a third party is a liability you cannot undo once a request has left, and it forces every later product decision through a legal review.",
  },
];

export function Problem() {
  return (
    <Section
      eyebrow="The problem"
      title="You should not have to choose between good models and data privacy"
    >
      <div className="grid gap-6 md:grid-cols-3">
        {items.map((it) => (
          <Card key={it.title}>
            <CardHeader>
              <div className="flex items-center gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <it.icon className="size-5" />
                </span>
                <CardTitle className="text-lg">{it.title}</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{it.body}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </Section>
  );
}
