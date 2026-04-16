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
] as const;
