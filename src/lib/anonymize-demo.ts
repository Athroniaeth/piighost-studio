export type Entity = { raw: string; placeholder: string };
export type Demo = { text: string; entities: Entity[] };

export const DEMO: Demo = {
  text: "Email Patrick at patrick@acme.com",
  entities: [
    { raw: "Patrick", placeholder: "<<PERSON:1>>" },
    { raw: "patrick@acme.com", placeholder: "<<EMAIL:1>>" },
  ],
};

export function renderStep(demo: Demo, step: number): string {
  let out = demo.text;
  for (let i = 0; i < step && i < demo.entities.length; i++) {
    const e = demo.entities[i];
    out = out.replace(e.raw, e.placeholder);
  }
  return out;
}
