"use client";
import { useState, useEffect, createContext, useContext, ReactNode } from "react";
import { ethers } from "ethers";
import { POLYGON_AMOY } from "@/lib/contract";

interface WalletContextType {
  address: string | null;
  provider: ethers.BrowserProvider | null;
  signer: ethers.JsonRpcSigner | null;
  chainId: string | null;
  isCorrectNetwork: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  switchNetwork: () => Promise<void>;
  loading: boolean;
}

const WalletContext = createContext<WalletContextType>({
  address: null, provider: null, signer: null, chainId: null,
  isCorrectNetwork: false, connect: async () => {}, disconnect: () => {},
  switchNetwork: async () => {}, loading: false,
});

export function WalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [signer, setSigner] = useState<ethers.JsonRpcSigner | null>(null);
  const [chainId, setChainId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isCorrectNetwork = chainId === POLYGON_AMOY.chainId;

  const init = async (ethereum: any) => {
    const p = new ethers.BrowserProvider(ethereum);
    const s = await p.getSigner();
    const addr = await s.getAddress();
    const net = await p.getNetwork();
    const cid = "0x" + net.chainId.toString(16);

    setProvider(p);
    setSigner(s);
    setAddress(addr);
    setChainId(cid);
  };

  useEffect(() => {
    const eth = (window as any).ethereum;
    if (!eth) return;

    eth.request({ method: "eth_accounts" }).then((accounts: string[]) => {
      if (accounts.length > 0) init(eth);
    });

    eth.on("accountsChanged", (accounts: string[]) => {
      if (accounts.length === 0) {
        setAddress(null); setSigner(null); setProvider(null);
      } else {
        init(eth);
      }
    });
    eth.on("chainChanged", () => init(eth));
  }, []);

  const connect = async () => {
    const eth = (window as any).ethereum;
    if (!eth) {
      alert("MetaMask not detected. Please install MetaMask.");
      return;
    }
    setLoading(true);
    try {
      await eth.request({ method: "eth_requestAccounts" });
      await init(eth);
    } catch (e: any) {
      console.error("Connect error:", e.message);
    }
    setLoading(false);
  };

  const disconnect = () => {
    setAddress(null); setSigner(null); setProvider(null); setChainId(null);
  };

  const switchNetwork = async () => {
    const eth = (window as any).ethereum;
    if (!eth) return;
    try {
      await eth.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: POLYGON_AMOY.chainId }],
      });
    } catch (e: any) {
      if (e.code === 4902) {
        await eth.request({
          method: "wallet_addEthereumChain",
          params: [POLYGON_AMOY],
        });
      }
    }
  };

  return (
    <WalletContext.Provider value={{
      address, provider, signer, chainId, isCorrectNetwork,
      connect, disconnect, switchNetwork, loading,
    }}>
      {children}
    </WalletContext.Provider>
  );
}

export const useWallet = () => useContext(WalletContext);
