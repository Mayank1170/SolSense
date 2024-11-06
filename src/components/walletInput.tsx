import React, { useState } from 'react';
import { useRouter } from 'next/router';

const WalletInput = () => {
  const [walletAddress, setWalletAddress] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const validateSolanaAddress = (address: string) => {
    // Basic Solana address validation (44 characters, base58)
    return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!walletAddress) {
      setError('Please enter a wallet address');
      return;
    }

    if (!validateSolanaAddress(walletAddress)) {
      setError('Please enter a valid Solana wallet address');
      return;
    }

    // Navigate to transactions page with wallet address
    router.push(`/transactions/${walletAddress}`);
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-6">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            Transaction Explorer
          </h1>
          <p className="text-gray-400">
            Enter a Solana wallet address to view its transaction history
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="text"
              value={walletAddress}
              onChange={(e) => {
                setWalletAddress(e.target.value);
                setError('');
              }}
              placeholder="Enter wallet address"
              className="w-full p-4 rounded-lg bg-gray-800 text-gray-300 placeholder-gray-500 border border-gray-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            />
            {error && (
              <p className="mt-2 text-sm text-red-500">{error}</p>
            )}
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 px-6 rounded-lg transition-colors"
          >
            View Transactions
          </button>
        </form>
      </div>
    </div>
  );
};

export default WalletInput;