import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col items-center px-4 py-32 text-center">
      <p className="font-mono text-6xl font-bold text-primary">404</p>
      <h1 className="mt-4 text-2xl font-semibold">This page slipped past the placeholder</h1>
      <p className="mt-2 text-muted-foreground">The page you are looking for does not exist.</p>
      <Button className="mt-8" render={<Link href="/" />}>
        Back home
      </Button>
    </div>
  );
}
