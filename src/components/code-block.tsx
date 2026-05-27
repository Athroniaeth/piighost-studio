import { codeToHtml } from "shiki";
import { CopyButton } from "@/components/copy-button";

type Props = { code: string; lang?: string };

export async function CodeBlock({ code, lang = "python" }: Props) {
  const html = await codeToHtml(code.trim(), {
    lang,
    themes: { light: "github-light", dark: "github-dark" },
    defaultColor: false,
  });

  return (
    <div className="group relative overflow-hidden rounded-lg border bg-muted/30">
      <CopyButton value={code.trim()} />
      <div
        className="overflow-x-auto p-4 text-sm [&_pre]:bg-transparent [&_.shiki]:!bg-transparent"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}
