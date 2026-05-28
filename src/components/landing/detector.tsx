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
              <div className="flex items-center gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <d.icon className="size-5" />
                </span>
                <CardTitle className="text-lg">{d.title}</CardTitle>
              </div>
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
