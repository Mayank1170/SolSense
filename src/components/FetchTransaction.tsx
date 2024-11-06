const HELIUS_API_KEY = process.env.NEXT_PUBLIC_HELIUS_API_KEY;
// const WALLET_ADDRESS = process.env.NEXT_PUBLIC_WALLET_ADDRESS;

export const fetchTransactions = async (beforeSignature?: string, walletAddress?: string): Promise<any> => {
  const url = `https://api.helius.xyz/v0/addresses/${walletAddress}/transactions?api-key=${HELIUS_API_KEY}${
    beforeSignature ? `&before=${beforeSignature}` : ''
  }`;
  
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error("Failed to fetch transactions");
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching transactions:", error);
    return null;
  }
};