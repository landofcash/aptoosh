import React, {useState} from "react";
import {LogOut, Wallet as WalletIcon, RefreshCcw, X} from "lucide-react";
import {Popover, PopoverTrigger, PopoverContent} from "@/components/ui/popover";
import {Button} from "@/components/ui/button";
import {useWallet} from "@/context/WalletContext";
import CopyableField from "@/components/CopyableField";

const WalletAuth: React.FC = () => {
  const {
    walletAddress,
    connect,
    disconnect,
    switchNetwork,
    network,
    availableExternalProviders,
    setExternalProviderId,
  } = useWallet();
  const [open, setOpen] = useState(false);

  if (!walletAddress) {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button onClick={() => connect({kind: "external", chain: "aptos"})} onMouseEnter={() => setOpen(true)}
                  onMouseLeave={() => setOpen(false)}
                  className="px-3 py-1 text-sm bg-blue-500 hover:bg-blue-600 text-white cursor-pointer">
            <WalletIcon className="w-4 h-4"/>
            <span className="hidden sm:inline">Connect Crypto Wallet</span>
          </Button>
        </PopoverTrigger>

        <PopoverContent align="start" side="bottom" onMouseEnter={() => setOpen(true)}
                        onMouseLeave={() => setOpen(false)} className="w-60 p-4 text-sm shadow-lg">
          <div className="mb-3">
            <div className="text-xs text-muted-foreground mb-2">Choose a wallet</div>
            <ul className="space-y-2">
              {availableExternalProviders.map((p) => (
                <li key={p.id}>
                  <Button onClick={async () => {
                    if (p.installed) {
                      setExternalProviderId(p.id);
                      await connect({kind: "external", chain: "aptos", providerId: p.id});
                    } else {
                      // Fall back to WalletConnect QR for mobile wallets
                      setExternalProviderId("walletconnect");
                      await connect({kind: "external", chain: "aptos", providerId: "walletconnect"});
                    }
                    setOpen(false);
                  }} className="w-full justify-start text-sm">
                    {p.name}
                    {!p.installed ? " (mobile via QR)" : ""}
                  </Button>
                </li>
              ))}
              <li>
                <Button variant="secondary" onClick={() => connect({kind: "internal"})}
                        className="w-full justify-start text-sm">
                  Internal (custodial)
                </Button>
              </li>
            </ul>
          </div>

          <div className="items-center justify-between text-xs text-muted-foreground">
            <span>
              You are on <strong className="text-foreground">{network}</strong>.
            </span>
            {network !== "devnet" && (
              <div>
                <button onClick={() => {
                  switchNetwork("devnet");
                  setOpen(false);
                }}
                        className="flex items-center text-blue-500 hover:underline ml-2 text-xs bg-transparent border-none outline-none p-0 cursor-pointer">
                  <RefreshCcw className="w-3 h-3 mr-1"/>
                  Switch to DEVNET
                </button>
              </div>
            )}
            {network !== "testnet" && (
              <div>
                <button onClick={() => {
                  switchNetwork("testnet");
                  setOpen(false);
                }}
                        className="flex items-center text-blue-500 hover:underline ml-2 text-xs bg-transparent border-none outline-none p-0 cursor-pointer">
                  <RefreshCcw className="w-3 h-3 mr-1"/>
                  Switch to TESTNET
                </button>
              </div>
            )}
            {network !== "mainnet" && (
              <div>
                <button onClick={() => {
                  switchNetwork("mainnet");
                  setOpen(false);
                }}
                        className="flex items-center text-blue-500 hover:underline ml-2 text-xs bg-transparent border-none outline-none p-0 cursor-pointer">
                  <RefreshCcw className="w-3 h-3 mr-1"/>
                  Switch to MAINNET
                </button>
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" aria-label="Wallet Menu"
                className="flex items-center gap-1 px-2 py-1 text-sm sm:px-3 sm:gap-2 cursor-pointer">
          <WalletIcon className="w-4 h-4"/>
          <span className="hidden sm:inline">
            {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
          </span>
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end"
                      className="w-screen sm:w-64 sm:rounded sm:border sm:shadow-lg sm:mt-1 m-0 p-6 space-y-3 text-sm">
        {/* Mobile close button */}
        <div className="flex justify-end sm:hidden -mt-2 -mr-2">
          <button onClick={() => setOpen(false)} aria-label="Close">
            <X className="w-5 h-5 text-gray-500"/>
          </button>
        </div>

        {/* Wallet Info */}
        <div>
          <p className="text-muted-foreground text-xs mb-1">Connected Wallet</p>
          <div className="font-mono break-all text-foreground text-xs sm:text-sm">
            <CopyableField value={walletAddress} length={22}/>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-2">
          <Button onClick={disconnect}
                  className="w-full justify-start text-sm bg-red-500 hover:bg-red-600 text-white cursor-pointer">
            <LogOut className="w-4 h-4 mr-2"/>
            Disconnect
          </Button>
          {network !== "devnet" && (
            <Button onClick={() => switchNetwork("mainnet")}
                    className="hidden w-full justify-start text-sm bg-gray-500 hover:bg-gray-600 text-white cursor-pointer">
              <RefreshCcw className="w-4 h-4 mr-2"/>
              Switch to DEVNET
            </Button>)}
          {network !== "testnet" && (
            <Button onClick={() => switchNetwork("mainnet")}
                    className="hidden w-full justify-start text-sm bg-gray-500 hover:bg-gray-600 text-white cursor-pointer">
              <RefreshCcw className="w-4 h-4 mr-2"/>
              Switch to TESTNET
            </Button>)}
          {network !== "mainnet" && (
            <Button onClick={() => switchNetwork("mainnet")}
                    className="hidden w-full justify-start text-sm bg-gray-500 hover:bg-gray-600 text-white cursor-pointer">
              <RefreshCcw className="w-4 h-4 mr-2"/>
              Switch to MAINNET
            </Button>)}
          <div className="text-muted-foreground text-xs text-right">[{network}]</div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default WalletAuth;
