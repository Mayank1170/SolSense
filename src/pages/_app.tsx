// _app.tsx

import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
  TorusWalletAdapter,
} from "@solana/wallet-adapter-wallets";
import { useMemo } from "react";
import { clusterApiUrl } from "@solana/web3.js";

// Import default styles that come with @solana/wallet-adapter-react-ui
require("@solana/wallet-adapter-react-ui/styles.css");

export default function App({ Component, pageProps }: AppProps) {
  // Configure the network, can be 'devnet', 'testnet', or 'mainnet-beta'
  const network = WalletAdapterNetwork.Mainnet;

  // Set up the RPC endpoint for Solana
  const endpoint = useMemo(() => clusterApiUrl(network), [network]);

  // Configure the wallets you want to support
  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
      new TorusWalletAdapter(),
    ],
    [network]
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <Component {...pageProps} />
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
