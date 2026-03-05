# Agent guide: Decentralized Sports Betting Platform (PoC)

## Project summary

This repo is a proof-of-concept decentralized sports prediction market. **We are the bank**: the smart contract holds all funds and is the single source of truth for bets and payouts. No real money; Sepolia testnet only. The stack is **Next.js** (frontend), **Python** (sports data API + oracle that reports results to the contract), and **Solidity** (smart contract on Sepolia: escrow, bets, payouts).

## Architecture

- **Frontend** (`web/`) talks to the smart contract via the user's wallet (deposit, place bet, claim winnings) and optionally to the Python backend for a list of games and odds.
- **Python** (`oracle/`) fetches game results from a sports data API and submits them on-chain by calling the contract's `reportResult(gameId, outcome)` (or equivalent). It does not hold user funds.
- **Contract** (`contracts/`) is the only source of truth for funds and settlement: it holds escrow, records bets, and pays out once the oracle has reported the result.

See the repo README for objectives; add `docs/architecture.md` later if you need a detailed diagram.

## Entrypoints

| Part | Path | How to run |
|------|------|------------|
| Frontend | `web/` | `npm run dev` or `pnpm dev` (Next.js) |
| Oracle / backend | `oracle/` | `python main.py` or `uv run main.py` |
| Contracts | `contracts/` | Foundry: `forge build`, `forge script script/Deploy.s.sol` (or Hardhat equivalent) |

## Conventions

- **Network:** Sepolia only. No mainnet.
- **Env:** RPC URL, contract address, and API keys are set via environment variables. No secrets in the frontend (only `NEXT_PUBLIC_*`). The oracle uses a dedicated private key for calling `reportResult`.
- **Naming:** Use consistent `gameId` and outcome values between the Python backend and the contract (e.g. same IDs for games, same enum or int for home/away/draw).

## Tasks the agent can do

- **Set up or adjust project structure** — Ensure `web/`, `oracle/`, and `contracts/` exist with minimal runnable scaffolds; add folders (e.g. `docs/`, `web/src/components/`) when needed.
- **Add bet placement flow** — Frontend: connect wallet, choose game/outcome, call contract to place bet. Contract: implement or extend `placeBet`, escrow logic.
- **Implement oracle result submission** — Python: fetch result for a finished game from the sports API, then send a transaction that calls `reportResult(gameId, outcome)` on the contract using the oracle key.
- **Explain or implement settlement** — How the contract marks a game as settled after `reportResult`, and how winners are paid (automatic payout in the same call vs. separate `claimWinnings()`).
- **Add "show games" flow** — Backend: endpoint(s) that return games and odds from the sports API. Frontend: fetch and display them so users can pick a game before placing a bet.

Keep changes scoped to this single repo and PoC (no multi-house or mainnet features unless explicitly requested).
