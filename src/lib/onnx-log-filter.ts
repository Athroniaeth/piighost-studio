// onnxruntime-web prints benign warnings to the console every time a GLiNER
// model initializes, e.g.:
//   [W:onnxruntime:, session_state.cc:1166 VerifyEachNodeIsAssignedToAnEp]
//   Some nodes were not assigned to the preferred execution providers ...
// This is expected: ORT deliberately runs some shape/control ops on CPU. The
// `gliner` package gives us no way to lower onnxruntime's log level, and in dev
// Next.js promotes these to its error overlay, which is alarming and noisy.
//
// We filter out ONLY those specific lines from console.warn/error. Everything
// else passes through untouched. This is dev-quality-of-life; in the static
// production build there is no error overlay anyway.
//
// Documented in docs/superpowers/specs/2026-05-29-gliner-zero-shot-design.md
// so we remember why console is patched.

const NOISE = [
  "VerifyEachNodeIsAssignedToAnEp",
  "Some nodes were not assigned to the preferred execution providers",
  "Rerunning with verbose output",
];

/** True when a console message is one of onnxruntime's benign init warnings. */
export function isOnnxNoise(args: unknown[]): boolean {
  return args.some(
    (a) => typeof a === "string" && NOISE.some((needle) => a.includes(needle)),
  );
}

let patched = false;

/** Drop onnxruntime's benign node-assignment warnings from the console.
 *  Idempotent and safe to call before every model load. */
export function filterOnnxConsoleNoise(): void {
  if (patched || typeof console === "undefined") return;
  patched = true;
  for (const method of ["warn", "error"] as const) {
    const original = console[method].bind(console);
    console[method] = (...args: unknown[]) => {
      if (isOnnxNoise(args)) return;
      original(...args);
    };
  }
}
