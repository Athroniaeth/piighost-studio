// Empty stand-in for Node built-ins (fs, path) in the browser build.
//
// The `gliner` package depends on @xenova/transformers@2.17.2, whose env probe
// runs `isEmpty(fs)` (i.e. `Object.keys(fs)`) at module-evaluation time. Under
// Turbopack, unresolved Node built-ins become `undefined`, so that probe throws
// "Cannot convert undefined or null to object". Aliasing fs/path to this empty
// object lets the probe see `{}` and correctly conclude it is not running in
// Node, falling back to the browser code paths.
export default {};
