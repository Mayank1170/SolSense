import { useState } from "react";


const WalletInput = ({ onSubmit }: { onSubmit: (address: string) => void }) => {
  const [walletAddress, setWalletAddress] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!walletAddress.trim()) {
      setError('Please enter a wallet address');
      return;
    }
    
    if (walletAddress.length !== 44) {
      setError('Please enter a valid Solana wallet address');
      return;
    }

    setError('');
    onSubmit(walletAddress);
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
      <h1
  className="text-[70px] font-bold mb-8 text-center bg-gradient-to-r from-blue-300 via-blue-400 to-blue-500 bg-clip-text text-transparent"
>
  SolSence
</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="text"
              value={walletAddress}
              onChange={(e) => setWalletAddress(e.target.value)}
              placeholder="Enter Solana wallet address"
              className="w-full p-4 rounded-lg bg-gray-800 text-gray-300 placeholder-gray-500 border border-gray-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
            />
            {error && (
              <p className="mt-2 text-red-500 text-sm">{error}</p>
            )}
          </div>
          
          <button
            type="submit"
            className="w-full py-4 px-6 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors duration-200"
          >
            View Transactions
          </button>
        </form>
      </div>
    </div>
  );
};



export default WalletInput