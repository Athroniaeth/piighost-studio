import { ProjectHeader } from "@/components/project-header";
import { ProjectArticle } from "@/components/project-article";
import { CodeBlock } from "@/components/code-block";
import { getProject } from "@/lib/site";

export const metadata = { title: "piighost-proofreader" };

export default function ProofreaderPage() {
  const codeBlocks = {
    run: (
      <CodeBlock
        code={`uv sync --group dev
cp .env.example .env  # fill in LITELLM_API_KEY etc.
uv run streamlit run app.py`}
        lang="bash"
      />
    ),
  };

  return (
    <>
      <ProjectHeader project={getProject("proofreader")} />
      <ProjectArticle slug="proofreader" codeBlocks={codeBlocks} />
    </>
  );
}
