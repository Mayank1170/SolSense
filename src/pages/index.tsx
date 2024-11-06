import { useEffect, useState, useRef, useCallback } from "react";
import { fetchTransactions } from "../components/FetchTransaction";
import { fetchAssetDetails } from "../services/helius";
import { ArrowUpRight, ArrowDownLeft, Copy } from "lucide-react";
import { publicKeyMappings } from "../lib/config";

interface TokenTransfer {
  source: string;
  destination: string;
  tokenAmount: number;
  mint: string;
  fromUserAccount?: string;
  toUserAccount?: string;
}

interface Transaction {
  description: string;
  type: string;
  source: string;
  destination: string;
  tokenAmount: number;
  tokenTransfers?: TokenTransfer[];
  signature: string;
  timestamp?: number;
}

interface TokenMetadata {
  image: string;
  name: string;
}

const FILTERED_TYPES = ["TOKEN_MINT", "SWAP", "UNKNOWN"];

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
        <h1 className="text-2xl font-bold text-white mb-8 text-center">
          Solana Wallet Transaction Tracker
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

const TransactionHistory = ({ walletAddress }: { walletAddress: string }) => {
  const [transactions, setTransactions] = useState<Transaction[] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [lastSignature, setLastSignature] = useState<string | undefined>(undefined);
  const [copiedSignature, setCopiedSignature] = useState<string | null>(null);
  const [tokenMetadata, setTokenMetadata] = useState<{
    [mint: string]: TokenMetadata;
  }>({});
  const [searchQuery, setSearchQuery] = useState<string>("");
  const observer = useRef<IntersectionObserver | null>(null);
  const loadingRef = useRef<HTMLDivElement>(null);

  const parseSearchQuery = (query: string) => {
    const queryLower = query.toLowerCase().trim();

    if (!queryLower) {
      return {
        token: "",
        action: "",
        destination: "",
        source: "",
        type: "",
      };
    }

    const words = queryLower.split(" ");

    const filters = {
      token: "",
      action: "",
      destination: "",
      source: "",
      type: "",
    };

    const isActionWord = (word: string) =>
      [
        "send",
        "sent",
        "receive",
        "received",
        "swap",
        "swapped",
        "mint",
        "minted",
      ].includes(word);

    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      const nextWord = words[i + 1];

      if (isActionWord(word)) {
        if (word.startsWith("send") || word.startsWith("mint")) {
          filters.action = "send";
        } else if (word.startsWith("receiv")) {
          filters.action = "receive";
        } else if (word.startsWith("swap")) {
          filters.type = "SWAP";
        }
        continue;
      }

      if (word === "to" && nextWord) {
        const possibleDestination = Object.entries(publicKeyMappings).find(
          ([value]) => value.toLowerCase() === nextWord
        );
        if (possibleDestination) {
          filters.destination = possibleDestination[0];
          i++;
        }
        continue;
      }

      if (word === "from" && nextWord) {
        const possibleSource = Object.entries(publicKeyMappings).find(
          ([ value]) => value.toLowerCase() === nextWord
        );
        if (possibleSource) {
          filters.source = possibleSource[0];
          i++;
        }
        continue;
      }

      const mappedToken = Object.entries(publicKeyMappings).find(
        ([ value]) => value.toLowerCase() === word
      );

      if (mappedToken) {
        filters.token = mappedToken[0];
        continue;
      }

      const metadataToken = Object.entries(tokenMetadata).find(
        ([_, value]) => {value.name.toLowerCase() === word || _}
      );

      if (metadataToken) {
        filters.token = metadataToken[0];
      }
    }

    return filters;
  };

  const matchesSearchCriteria = (transaction: Transaction, filters: { token: any; action: any; destination: any; source: any; type: any; }) => {
    const { token, action, destination, source, type } = filters;

    if (!token && !action && !destination && !source && !type) {
      return true;
    }

    if (type && transaction.type !== type) {
      return false;
    }

    return (
      transaction.tokenTransfers?.some((transfer) => {
        if (token && transfer.mint !== token) {
          return false;
        }

        if (action === "send" && transfer.fromUserAccount !== walletAddress) {
          return false;
        }
        if (action === "receive" && transfer.toUserAccount !== walletAddress) {
          return false;
        }

        if (destination && transfer.toUserAccount !== destination) {
          return false;
        }

        if (source && transfer.fromUserAccount !== source) {
          return false;
        }

        return true;
      }) || false
    );
  };

  const loadTransactions = async (beforeSignature?: string) => {
    try {
      const data = await fetchTransactions(beforeSignature, walletAddress);
      
      if (!data || data.length === 0) {
        setHasMore(false);
        return;
      }

      const filteredData = data.filter(
        (transaction: { type: string; tokenTransfers: any[]}) => {
          if (FILTERED_TYPES.includes(transaction.type)) {
            return transaction.tokenTransfers?.some(
              (transfer) =>
                transfer.fromUserAccount === walletAddress ||
                transfer.toUserAccount === walletAddress
            );
          }
          return true;
        }
      );

      setTransactions((prev) => 
        prev ? [...prev, ...filteredData] : filteredData
      );
      
      if (filteredData.length > 0) {
        setLastSignature(data[data.length - 1].signature);
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error("Error loading transactions:", error);
      setHasMore(false);
    }
    setLoading(false);
  };

  const handleObserver = useCallback((entries: IntersectionObserverEntry[]) => {
    const [target] = entries;
    if (target.isIntersecting && hasMore && !loading) {
      setLoading(true);
      loadTransactions(lastSignature);
    }
  }, [hasMore, loading, lastSignature]);

  useEffect(() => {
    const currentObserver = observer.current;
    
    if (loadingRef.current) {
      observer.current = new IntersectionObserver(handleObserver, {
        threshold: 1.0,
      });
      
      observer.current.observe(loadingRef.current);
    }

    return () => {
      if (currentObserver) {
        currentObserver.disconnect();
      }
    };
  }, [handleObserver]);

  useEffect(() => {
    loadTransactions();
  }, []);

  useEffect(() => {
    if (transactions && transactions.length > 0) {
      transactions.forEach((transaction) => {
        transaction.tokenTransfers?.forEach(async (transfer) => {
          const { mint } = transfer;
          if (!tokenMetadata[mint]) {
            const metadata = await fetchAssetDetails(mint);
            if (metadata) {
              setTokenMetadata((prev) => ({
                ...prev,
                [mint]: {
                  image: metadata.links.image || "",
                  name: metadata.metadata.name || "Unknown Token",
                },
              }));
            }
          }
        });
      });
    }
  }, [transactions]);

  const formatDate = (timestamp: number) =>
    new Date(timestamp * 1000).toLocaleString();

  const truncateAddress = (address: string) =>
    `${address.slice(0, 4)}...${address.slice(-4)}`;

  const handleCopySignature = (signature: string) => {
    navigator.clipboard
      .writeText(signature)
      .then(() => {
        setCopiedSignature(signature);
        setTimeout(() => setCopiedSignature(null), 3000);
      })
      .catch((err) => console.error("Failed to copy signature:", err));
  };

  const renderTransfer = (
    transfer: TokenTransfer,
    i: number,
    transaction: Transaction
  ) => {
    const metadata = tokenMetadata[transfer.mint];
    const isSender = transfer.fromUserAccount === walletAddress;
    const isReceiver = transfer.toUserAccount === walletAddress;
transaction
isReceiver
    return (
      <div className="bg-gray-800 rounded-lg shadow-lg p-4 mb-4" key={i}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            {metadata?.image && (
              <img
                src={metadata.image}
                alt={metadata.name}
                className="w-8 h-8 rounded-full"
              />
            )}
            <span className="font-semibold text-gray-200">
              {metadata?.name || "Unknown Token"}
            </span>
          </div>
          <div
            className={`flex items-center px-3 py-1 rounded-full ${
              isSender
                ? "bg-red-500/10 text-red-500"
                : "bg-green-500/10 text-green-500"
            }`}
          >
            {isSender ? (
              <ArrowUpRight className="w-4 h-4 mr-1" />
            ) : (
              <ArrowDownLeft className="w-4 h-4 mr-1" />
            )}
            {transfer.tokenAmount}
          </div>
        </div>
        <div className="space-y-2 text-sm">
          {isSender ? (
            <p className="text-gray-300">
              Sent to: {truncateAddress(transfer.toUserAccount || "")}
            </p>
          ) : (
            <p className="text-gray-300">
              Received from: {truncateAddress(transfer.fromUserAccount || "")}
            </p>
          )}
        </div>
      </div>
    );
  };

  const renderTokenTransfers = (transaction: Transaction) => {
    if (FILTERED_TYPES.includes(transaction.type)) {
      return transaction.tokenTransfers
        ?.filter(
          (transfer) =>
            transfer.fromUserAccount === walletAddress ||
            transfer.toUserAccount === walletAddress
        )
        .map((transfer, i) => renderTransfer(transfer, i, transaction));
    }
    return transaction.tokenTransfers?.map((transfer, i) =>
      renderTransfer(transfer, i, transaction)
    );
  };

  const filteredTransactions = transactions?.filter((transaction) => {
    if (!searchQuery.trim()) {
      return true;
    }

    const filters = parseSearchQuery(searchQuery);
    return matchesSearchCriteria(transaction, filters);
  });

  return (
    <div className="min-h-screen bg-gray-900 p-6 scroll-smooth">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-white">
            Transaction History
          </h1>
          <p className="text-gray-400 text-sm">
            Wallet: {truncateAddress(walletAddress)}
          </p>
        </div>

        <div className="mb-6">
          <input
            type="text"
            placeholder="Search transactions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="p-3 w-full rounded-lg bg-gray-800 text-gray-300 placeholder-gray-500 outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {filteredTransactions && filteredTransactions.length > 0 ? (
          <div className="space-y-4">
            {filteredTransactions.map((transaction, index) => (
              <div
                key={index}
                className="bg-gray-800/50 border border-gray-700 hover:border-gray-400 rounded-lg shadow-lg overflow-hidden transition-all duration-300"
              >
                <div className="p-4 border-b border-gray-700">
                  <div className="flex justify-between items-center">
                    <div className="flex flex-col gap-3">
                      <span className="w-fit px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 text-sm">
                        {transaction.type === "UNKNOWN"
                          ? "General Transfer"
                          : transaction.type.replace(/_/g, " ")}
                      </span>
                      <div className="flex gap-2">
                        {transaction.source !== "UNKNOWN" && (
                          <span className="text-xs text-white">
                            {transaction.source === "SYSTEM_PROGRAM"
                              ? "System Program"
                              : transaction.source.replace(/_/g, " ")}
                          </span>
                        )}
                        <div className="flex flex-row items-center">
                          <span className="text-xs text-gray-400">
                            {truncateAddress(transaction.signature)}
                          </span>
                          <button
                            onClick={() =>
                              handleCopySignature(transaction.signature)
                            }
                            className={`transition-colors ml-2 ${
                              copiedSignature === transaction.signature
                                ? "text-green-400"
                                : "hover:text-gray-200"
                            }`}
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                    {transaction.timestamp && (
                      <span className="text-sm text-gray-400">
                        {formatDate(transaction.timestamp)}
                      </span>
                    )}
                  </div>
                </div>
                <div className="p-4">
                  {transaction.tokenTransfers &&
                    transaction.tokenTransfers.length > 0 && (
                      <div>{renderTokenTransfers(transaction)}</div>
                    )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-gray-400 py-12">
            {searchQuery.trim()
              ? "No matching transactions found"
              : "No transactions available"}
          </div>
        )}

        <div ref={loadingRef} className="py-4">
          {loading && (
            <div className="flex justify-center items-center h-16">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
            </div>
          )}
          {!hasMore && transactions && transactions.length > 0 && (
            <div className="text-center text-gray-400">
              No more transactions to load
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const Home = () => {
  const [selectedWallet, setSelectedWallet] = useState<string | null>(null);

  if (!selectedWallet) {
    return <WalletInput onSubmit={setSelectedWallet} />;
  }

  return <TransactionHistory walletAddress={selectedWallet} />;
};

export default Home;