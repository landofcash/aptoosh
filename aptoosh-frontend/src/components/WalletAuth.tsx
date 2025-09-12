import React, {useState} from "react";
import {LogOut, RefreshCw, X} from "lucide-react";
import {Popover, PopoverTrigger, PopoverContent} from "@/components/ui/popover";
import {Button} from "@/components/ui/button";
import {useWallet} from "@/context/WalletContext";
import CopyableField from "@/components/CopyableField";
import walletLogo from "@/assets/wallet.svg";


const WalletAuth: React.FC = () => {
  const {walletAddress, walletKind, connect, disconnect, switchNetwork, network} = useWallet();
  const [open, setOpen] = useState(false);
  const oppositeNetwork = network === "testnet" ? "mainnet" : "testnet";

  if (!walletAddress || walletKind !== 'external') {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button onClick={() => connect({kind: 'external'})} onMouseEnter={() => setOpen(true)}
                  onMouseLeave={() => setOpen(false)}
                  className="px-3 py-1 text-sm bg-[#FFEE55] hover:bg-[#FFDD44] text-[#0D0D0D] cursor-pointer">
            <img src={walletLogo} alt="Aptos Wallet" className="w-4 h-4"/>
            <span className="">Connect Aptos Wallet</span>
          </Button>
        </PopoverTrigger>

        <PopoverContent align="start" side="bottom" onMouseEnter={() => setOpen(true)}
                        onMouseLeave={() => setOpen(false)} className="w-60 p-4 text-sm shadow-lg">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>You are on <strong className="text-foreground">{network}</strong>.</span>
            <button onClick={() => {
              switchNetwork(oppositeNetwork);
              setOpen(false);
            }}
                    className="inline-flex items-center text-blue-500 hover:underline ml-2 text-xs bg-transparent border-none outline-none p-0 cursor-pointer">
              <RefreshCw className="w-3 h-3 mr-1"/>
              Switch
            </button>
          </div>
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" aria-label="Wallet Menu"
                className="flex items-center gap-2 px-2 py-1 text-sm sm:px-3 cursor-pointer">
          <img src={walletLogo} alt="Aptos Wallet" className="w-4 h-4"/>
          <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
          <span className="">
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

          <Button onClick={() => switchNetwork(oppositeNetwork)}
                  className="w-full justify-start text-sm bg-gray-500 hover:bg-gray-600 text-white cursor-pointer">
            <RefreshCw className="w-4 h-4 mr-2"/>
            Switch to {oppositeNetwork}
          </Button>

          <div className="text-muted-foreground text-xs text-right">
            [{network}]
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default WalletAuth;
