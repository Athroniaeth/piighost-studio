import { MessageSquare, FileText, Table } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Section } from "@/components/section";

const pipelines = [
  {
    icon: MessageSquare,
    title: "Conversational",
    body: "Customer support, in-app chat, voice transcripts. Fast NER for names and locations, regex for emails and phone numbers, thread-scoped memory so the same person keeps the same placeholder across the whole conversation.",
  },
  {
    icon: FileText,
    title: "Document processing",
    body: "Long PDFs, contracts, support tickets. Latency budget is wider, accuracy matters more. An LLM as a detector on the tricky paragraphs, regex on the structured fields, and re-anchoring so findings line up with the source document.",
  },
  {
    icon: Table,
    title: "Structured forms",
    body: "API payloads, CSVs, exports. Sub-millisecond, deterministic, auditable. A pure regex pipeline with an exhaustive ruleset, no model in the loop, and a placeholder format your downstream systems can parse.",
  },
];

export function Detector() {
  return (
    <Section
      eyebrow="Use case driven"
      title="Each use case calls for its own pipeline"
      description="There is no universal detector for PII. piighost gives you composable building blocks (detection, linking, output guardrails) so you can build a pipeline tuned to your data, your latency budget, and your compliance rules."
    >
      <div className="grid gap-6 md:grid-cols-3">
        {pipelines.map((p) => (
          <Card key={p.title}>
            <CardHeader>
              <div className="flex items-center gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <p.icon className="size-5" />
                </span>
                <CardTitle className="text-lg">{p.title}</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{p.body}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </Section>
  );
}
