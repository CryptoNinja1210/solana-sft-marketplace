import React, { FC, useMemo } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import {
    BrowserRouter, Routes, Route } from "react-router-dom";
import {
    LedgerWalletAdapter,
    PhantomWalletAdapter,
    SlopeWalletAdapter,
    SolflareWalletAdapter,
    SolletExtensionWalletAdapter,
    SolletWalletAdapter,
    TorusWalletAdapter,
} from '@solana/wallet-adapter-wallets';
import {
    WalletModalProvider,
} from '@solana/wallet-adapter-react-ui';

import { clusterApiUrl } from '@solana/web3.js';
// import Dashboard from "./pages/dashboard"
// import Vault from "./pages/vault"
import Layout from "./layouts/layout"
import List from "./pages/list"
import Marketplace from "./pages/marketplace"
import CONFIG from './config';
import { ToastProvider } from 'react-toast-notifications';
// Default styles that can be overridden by your app
require('@solana/wallet-adapter-react-ui/styles.css');
const { CLUSTER_API } = CONFIG;

const App: FC = () => {
    // The network can be set to 'devnet', 'testnet', or 'mainnet-beta'.
    const network = WalletAdapterNetwork.Devnet;

    // You can also provide a custom RPC endpoint.
    const endpoint = CLUSTER_API;

    // @solana/wallet-adapter-wallets includes all the adapters but supports tree shaking and lazy loading --
    // Only the wallets you configure here will be compiled into your application, and only the dependencies
    // of wallets that your users connect to will be loaded.
    const wallets = useMemo(
        () => [
            new PhantomWalletAdapter(),
            new SlopeWalletAdapter(),
            new SolflareWalletAdapter({ network }),
            new TorusWalletAdapter(),
            new LedgerWalletAdapter(),
            new SolletWalletAdapter({ network }),
            new SolletExtensionWalletAdapter({ network }),
        ],
        [network]
    );

    return (
        <ConnectionProvider endpoint={endpoint}>
            <WalletProvider wallets={wallets} autoConnect>
                <WalletModalProvider>
                <ToastProvider autoDismissTimeout={5000}>
                    <BrowserRouter>
                        <Routes>
                            <Route path="/" element={<Layout />}>                                                     
                                <Route index element={<Marketplace />} />
                                <Route path="list"element={<List />} />
                            </Route>
                        </Routes>
                    </BrowserRouter>
                </ToastProvider>
                    {/* <WalletDisconnectButton /> */}
                    { /* Your app's components go here, nested within the context providers. */ }
                </WalletModalProvider>
            </WalletProvider>
        </ConnectionProvider>
    );
};


export default App;