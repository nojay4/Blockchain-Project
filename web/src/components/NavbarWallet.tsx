"use client";

import { useAccount, useConnect, useDisconnect, useSwitchChain } from "wagmi";
import { sepolia } from "wagmi/chains";
import { Button } from "@/components/ui/button";

function shortenAddress(addr: string): string {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export function NavbarWallet() {
  const { address, status } = useAccount();
  const { connectAsync, connectors, isPending: isConnecting, error: connectError } = useConnect();
  const { switchChainAsync } = useSwitchChain();
  const { disconnect, isPending: isDisconnecting } = useDisconnect();

  const connector = connectors.find((c) => c.id === "injected") ?? connectors[0];

  if (status === "connected" && address) {
    return (
      <div className="flex items-center gap-2">
        <span
          className="hidden font-mono text-xs text-muted-foreground sm:inline"
          title={address}
        >
          {shortenAddress(address)}
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isDisconnecting}
          onClick={() => disconnect()}
        >
          {isDisconnecting ? "…" : "Disconnect"}
        </Button>
      </div>
    );
  }

  const handleConnect = async () => {
    if (!connector) return;
    try {
      await connectAsync({ connector });
      await switchChainAsync({ chainId: sepolia.id });
    } catch (error) {
      // Keep default wagmi errors surfaced in connectError state.
      console.error(error);
    }
  };

  return (
    <div className="flex flex-col items-stretch gap-1 sm:flex-row sm:items-center">
      <Button
        type="button"
        size="sm"
        disabled={isConnecting || !connector}
        onClick={() => void handleConnect()}
      >
        {isConnecting ? "Connecting…" : "Connect wallet"}
      </Button>
      {connectError && (
        <span
          className="max-w-[200px] truncate text-xs text-destructive"
          title={connectError.message}
        >
          {connectError.message}
        </span>
      )}
    </div>
  );
}
