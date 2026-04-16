import { createConfig, http, injected } from "wagmi";
import { sepolia } from "wagmi/chains";

const sepoliaRpc = process.env.NEXT_PUBLIC_RPC_URL;

export const wagmiConfig = createConfig({
  chains: [sepolia],
  connectors: [injected()],
  transports: {
    [sepolia.id]: sepoliaRpc ? http(sepoliaRpc) : http(),
  },
  ssr: true,
});
