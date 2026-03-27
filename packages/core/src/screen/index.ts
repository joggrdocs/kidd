/**
 * Screen runtime — mounts Ink, wires context, manages the output store.
 *
 * A peer to `command/` at the core level. Users never import from
 * `screen/output/` directly.
 *
 * @module
 */

export { screen } from './screen.js'
export type { ScreenDef, ScreenExit } from './screen.js'

export { useScreenContext } from './provider.js'
