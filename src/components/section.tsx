import type { ReactNode } from "react";

export function Section({
  id,
  eyebrow,
  title,
  description,
  children,
}: {
  id?: string;
  eyebrow?: string;
  title?: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <section
      id={id}
      className="flex min-h-[calc(100dvh-4rem)] snap-start scroll-mt-16 flex-col justify-center"
    >
      <div className="mx-auto w-full max-w-6xl px-4 py-16">
      {(eyebrow || title || description) && (
        <div className="mx-auto mb-12 max-w-2xl">
          {(eyebrow || title) && (
            <div className="text-center">
              {eyebrow && (
                <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-primary">
                  {eyebrow}
                </p>
              )}
              {title && <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">{title}</h2>}
            </div>
          )}
          {description && (
            <p className="mt-4 text-justify hyphens-auto text-muted-foreground">{description}</p>
          )}
        </div>
      )}
      {children}
      </div>
    </section>
  );
}
