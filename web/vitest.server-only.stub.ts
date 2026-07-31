/**
 * Stub for the `server-only` marker package under Vitest.
 *
 * `server-only` exists to throw: importing it from anywhere that is not a
 * server module is the error it is there to produce. Its package exports an
 * empty module under the `react-server` condition and a throwing one otherwise,
 * so under a plain Node test runner every server module carrying the marker
 * would blow up on import and be untestable.
 *
 * Aliasing it to this empty module (see `vitest.config.mts`) is the same choice
 * the `db:seed-owner` script makes with `--conditions=react-server`: the marker
 * keeps doing its real job in the bundle, and stays out of the way elsewhere.
 */
export {};
