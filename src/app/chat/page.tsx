import { ProjectHeader } from "@/components/project-header";
import { ProjectArticle } from "@/components/project-article";
import { CodeBlock } from "@/components/code-block";
import { getProject } from "@/lib/site";

export const metadata = { title: "piighost-chat" };

export default function ChatPage() {
  const codeBlocks = {
    run: (
      <CodeBlock
        code={`git clone https://github.com/Athroniaeth/piighost-chat
cd piighost-chat
docker compose up`}
        lang="bash"
      />
    ),
  };

  return (
    <>
      <ProjectHeader project={getProject("chat")} />
      <ProjectArticle slug="chat" codeBlocks={codeBlocks} />
    </>
  );
}
