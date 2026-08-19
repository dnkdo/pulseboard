// Client-local mirror of the canonical incident severity enum
// (src/models/schema.js at the repo root, which server/ and its DB layer
// treat as the source of truth). Duplicated here rather than imported
// across the workspace boundary — client/ is its own npm workspace, and a
// relative import reaching out of it (e.g. `../../../../src/models/schema.js`)
// breaks if either workspace is relocated or published independently.
export const SEVERITIES = Object.freeze(['SEV1', 'SEV2', 'SEV3']);
