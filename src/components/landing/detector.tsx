import { Regex, Brain, Bot } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Section } from "@/components/section";

const detectors = [
  {
    icon: Regex,
    title: "Regex",
    body: "Fast, deterministic rules for structured PII like emails, phone numbers, and IDs.",
  },
  {
    icon: Brain,
    title: "NER",
    body: "Plug in a NER model when you need to catch names and locations in free text. You pick the engine.",
  },
  {
    icon: Bot,
    title: "LLM",
    body: "Use an LLM as a detector when the data is messy and context matters.",
  },
];

export function Detector() {
  return (
    <Section
      eyebrow="Your detector, your choice"
      title="piighost does not impose a detector"
      description="It is the orchestration layer. You wire in regex, a NER model, an LLM, or several at once with confidence arbitration. piighost handles linking, placeholders, and restoration around whatever you choose."
    >
      <div className="grid gap-6 md:grid-cols-3">
        {detectors.map((d) => (
          <Card key={d.title}>
            <CardHeader>
              <d.icon className="size-6 text-primary" />
              <CardTitle className="mt-3 text-lg">{d.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{d.body}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </Section>
  );
}
