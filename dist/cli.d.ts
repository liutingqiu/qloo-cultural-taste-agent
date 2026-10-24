/**
 * CLI entry: run one taste query end to end and write the artifacts a judge can
 * re-check (result, per-request trace, latency summary).
 *
 *   node dist/cli.js --description "shoegaze and slow cinema" \
 *     --seed artist --domains movie,place --take 5 --out runs/demo
 *
 * Point QLOO_BASE_URL at scripts/contract-server.mjs to exercise the transport
 * without a hackathon key.
 */
export {};
