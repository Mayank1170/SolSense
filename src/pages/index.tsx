import {  useState} from "react";
import TransactionHistory from "@/components/TransactionHistory";
import WalletInput from "@/components/walletInput";




const Home = () => {
  const [selectedWallet, setSelectedWallet] = useState<string | null>(null);

  if (!selectedWallet) {
    return <WalletInput onSubmit={setSelectedWallet} />;
  }

  return <TransactionHistory walletAddress={selectedWallet} />;
};

export default Home;