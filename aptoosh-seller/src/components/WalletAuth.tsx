import React, {useEffect, useState} from "react";
import {LogOut, Wallet as WalletIcon, RefreshCcw, X} from "lucide-react";
import {Popover, PopoverTrigger, PopoverContent} from "@/components/ui/popover";
import {Button} from "@/components/ui/button";
import {useWallet} from "@/context/WalletContext";
import CopyableField from "@/components/CopyableField";
import InternalWalletList from "@/components/wallet/InternalWalletList";
import ConfirmModal from "@/components/wallet/ConfirmModal";
import ExportModal from "@/components/wallet/ExportModal";
import {
  loadAllInternalWallets,
  loadInternalWalletByAddress,
  exportInternalWallet,
  removeInternalWallet
} from "@/lib/crypto/internalWallet";

const WalletAuth: React.FC = () => {
  const {
    walletAddress,
    walletKind,
    connect,
    disconnect,
    switchNetwork,
    network,
    availableExternalProviders,
    setExternalProviderId,
    internalAddresses,
    refreshInternalAddresses,
    activateInternalAddress,
  } = useWallet();
  const [open, setOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [exportAddr, setExportAddr] = useState<string | null>(null);
  const [exportMnemonic, setExportMnemonic] = useState<string | null>(null);
  const [confirmDeleteAddr, setConfirmDeleteAddr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Refresh internal wallet list whenever popup opens
  useEffect(() => {
    if (open) void refreshInternalAddresses();
  }, [open, refreshInternalAddresses]);

  const handleActivate = async (addr: string) => {
    await activateInternalAddress(addr);
    setOpen(false);
  };

  const handleCreate = async () => {
    await connect({kind: 'internal', silent: false});
    await refreshInternalAddresses();
  };

  const handleExport = async (addr: string) => {
    try {
      setBusy(true);
      setExportAddr(addr);
      const acc = await loadInternalWalletByAddress(addr);
      if (!acc) {
        console.error('Internal wallet not found for export');
        return;
      }
      const mnemonic = exportInternalWallet(acc);
      setExportMnemonic(mnemonic);
      setExportOpen(true);
    } catch (e) {
      console.error('Failed to export internal wallet:', e);
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = (addr: string) => {
    setConfirmDeleteAddr(addr);
  };

  const confirmDelete = async () => {
    if (!confirmDeleteAddr) return;
    try {
      setBusy(true);
      await removeInternalWallet(confirmDeleteAddr);
      await refreshInternalAddresses();

      if (walletKind === 'internal' && walletAddress === confirmDeleteAddr) {
        const updated = await loadAllInternalWallets();
        if (updated.length > 0) {
          await activateInternalAddress(updated[0].addr);
        } else {
          await disconnect();
        }
      }
    } catch (e) {
      console.error('Failed to delete internal wallet:', e);
    } finally {
      setConfirmDeleteAddr(null);
      setBusy(false);
    }
  };

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
                  </Button>
                </li>
              ))}
              <li>
                <Button variant="secondary" onClick={() => connect({kind: "internal"})}
                        className="w-full justify-start text-sm">
                  Internal
                </Button>
              </li>
            </ul>
            {internalAddresses.length > 0 && (
              <div className="mt-3">
                <div className="text-xs text-muted-foreground mb-2">Saved internal wallets</div>
                <InternalWalletList addresses={internalAddresses}
                                    activeAddress={walletKind === 'internal' ? walletAddress : null}
                                    isInternalActive={walletKind === 'internal'} onActivate={handleActivate}
                                    onExport={handleExport} onDelete={handleDelete} compact/>
              </div>
            )}
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

        {/* Internal Wallets (if any) */}
        {internalAddresses.length > 0 && (
          <div>
            <p className="text-muted-foreground text-xs mb-2">Saved Internal Wallets</p>
            <InternalWalletList addresses={internalAddresses} activeAddress={walletAddress}
                                isInternalActive={walletKind === 'internal'} onActivate={handleActivate}
                                onCreate={walletKind === 'internal' ? handleCreate : undefined} onExport={handleExport}
                                onDelete={handleDelete}/>
          </div>
        )}

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

        {/* Modals */}
        <ConfirmModal open={!!confirmDeleteAddr} title="Delete Internal Wallet" message={
          <div>Are you sure you want to delete this internal wallet?<br/>
            <CopyableField value={confirmDeleteAddr??""} length={22}/>
          </div>
        } confirmLabel={busy ? 'Deleting…' : 'Delete'} confirmVariant="destructive" onConfirm={confirmDelete}
                      onCancel={() => setConfirmDeleteAddr(null)}/>
        <ExportModal open={exportOpen} address={exportAddr} mnemonic={exportMnemonic}
                     onClose={() => setExportOpen(false)}/>
      </PopoverContent>
    </Popover>
  );
};

export default WalletAuth;
