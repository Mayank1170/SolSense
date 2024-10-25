// src/services/helius.ts
const HELIUS_API_KEY = process.env.NEXT_PUBLIC_HELIUS_API_KEY;

export const fetchAssetDetails = async (mint: string) => {
    try {
      const response = await fetch(`https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`, {
        method: 'POST',
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: "text",
          method: "getAsset",
          params: {
            id: mint,
          }
        }),
      });
  
      if (!response.ok) {
        throw new Error("Failed to fetch asset details");
      }
  
      const data = await response.json();
      console.log("Data", data.result.content);
      
      return data.result.content;
    } catch (error) {
      console.error("Error fetching asset details:", error);
      return null;
    }
  };
  