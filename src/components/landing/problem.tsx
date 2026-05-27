import { Cloud, Cpu, Scale } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Section } from "@/components/section";

const items = [
  {
    icon: Cloud,
    title: "Hosted clouds leak raw data",
    body: "OpenAI, Anthropic, and Google give you the best models, but every byte of context, including raw user PII, leaves your jurisdiction.",
  },
  {
    icon: Cpu,
    title: "Local models trade quality",
    body: "Self-hosting keeps data in, but you give up capability and take on the cost of running and maintaining the infrastructure.",
  },
  {
    icon: Scale,
    title: "Compliance does not wait",
    body: "GDPR and data-residency rules apply whether or not your stack was designed for them. Sending PII to a third party is a liability.",
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
              <it.icon className="size-6 text-primary" />
              <CardTitle className="mt-3 text-lg">{it.title}</CardTitle>
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
