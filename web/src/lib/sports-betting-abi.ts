export const sportsBettingAbi = [
  {
    type: "function",
    name: "placeBet",
    stateMutability: "payable",
    inputs: [
      { name: "gameId", type: "string" },
      { name: "betType", type: "uint8" },
      { name: "outcome", type: "uint8" },
      { name: "line", type: "int256" },
      { name: "odds", type: "uint256" },
      { name: "nonce", type: "uint256" },
      { name: "expiry", type: "uint256" },
      { name: "signature", type: "bytes" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "getGame",
    stateMutability: "view",
    inputs: [{ name: "gameId", type: "string" }],
    outputs: [
      {
        type: "tuple",
        components: [
          { name: "status", type: "uint8" },
          { name: "result", type: "uint8" },
          { name: "homeScore", type: "int256" },
          { name: "awayScore", type: "int256" },
          { name: "exists", type: "bool" },
        ],
      },
    ],
  },
  {
    type: "function",
    name: "getBet",
    stateMutability: "view",
    inputs: [{ name: "betId", type: "uint256" }],
    outputs: [
      {
        type: "tuple",
        components: [
          { name: "bettor", type: "address" },
          { name: "gameId", type: "string" },
          { name: "betType", type: "uint8" },
          { name: "outcome", type: "uint8" },
          { name: "line", type: "int256" },
          { name: "amount", type: "uint256" },
          { name: "odds", type: "uint256" },
          { name: "claimed", type: "bool" },
        ],
      },
    ],
  },
  {
    type: "function",
    name: "claimWinnings",
    stateMutability: "nonpayable",
    inputs: [{ name: "betId", type: "uint256" }],
    outputs: [],
  },
] as const;
