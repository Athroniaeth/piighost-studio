import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Section } from "@/components/section";

const steps = [
  {
    value: "detect",
    label: "Detect",
    body: "piighost runs your detectors over the message and finds PII spans: names, emails, addresses, anything the model does not need to see.",
  },
  {
    value: "anonymize",
    label: "Anonymize",
    body: "Each span is replaced with a stable placeholder such as <<PERSON:1>> or <<EMAIL:1>>. The same value keeps the same placeholder across the whole conversation.",
  },
  {
    value: "deanonymize",
    label: "Deanonymize",
    body: "Tool calls receive the real values, and the final response shown to the user is restored. The LLM only ever saw placeholders.",
  },
];

export function HowItWorks() {
  return (
    <Section
      id="how-it-works"
      eyebrow="How it works"
      title="A layer between your agent and the model"
    >
      <Tabs defaultValue="detect" className="mx-auto max-w-3xl">
        <TabsList className="grid w-full grid-cols-3">
          {steps.map((s) => (
            <TabsTrigger key={s.value} value={s.value}>
              {s.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {steps.map((s) => (
          <TabsContent key={s.value} value={s.value} className="mt-6">
            <div className="rounded-lg border bg-card p-6">
              <p className="text-muted-foreground">{s.body}</p>
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </Section>
  );
}
