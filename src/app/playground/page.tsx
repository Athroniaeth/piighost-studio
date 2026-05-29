import { NerPlayground } from "@/components/playground/ner-playground";

export const metadata = { title: "Playground" };

export default function PlaygroundPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16">
      <NerPlayground />
    </div>
  );
}
