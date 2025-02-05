import { useEffect, useState, useRef, useCallback } from "react";
import { fetchAssetDetails } from "../services/helius";
import { ArrowUpRight, ArrowDownLeft, Copy } from "lucide-react";
import { publicKeyMappings } from "../lib/config";
import { fetchTransactions } from "@/services/FetchTransaction";

interface TokenTransfer {
  source: string;
  destination: string;
  tokenAmount: number;
  mint: string;
  fromUserAccount?: string;
  toUserAccount?: string;
}

interface FilterCriteria {
  token: string;
  action: string;
  destination: string;
  source: string;
  type: string;
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

  const parseSearchQuery = (query: string): FilterCriteria => {
    const queryLower = query.toLowerCase().trim();

    const filters: FilterCriteria = {
      token: "",
      action: "",
      destination: "",
      source: "",
      type: "",
    };

    if (!queryLower) {
      return filters;
    }

    const words = queryLower.split(" ");

    words.forEach((word, index) => {
      const nextWord = words[index + 1];

      // Check for action words
      if (word === "send" || word === "sent") {
        filters.action = "send";
      } else if (word === "receive" || word === "received") {
        filters.action = "receive";
      } else if (word === "swap" || word === "swapped") {
        filters.type = "SWAP";
      } else if (word === "mint" || word === "minted") {
        filters.type = "TOKEN_MINT";
      }

      // Check for destination
      if (word === "to" && nextWord) {
        const destination = Object.entries(publicKeyMappings).find(
          ([_, value]) => {value.toLowerCase().includes(nextWord), _, value}
        );
        
        if (destination) {
          filters.destination = destination[0];
        }
      }

      // Check for source
      if (word === "from" && nextWord) {
        const source = Object.entries(publicKeyMappings).find(
          ([_, value]) => {value.toLowerCase().includes(nextWord), _, value}
        );
        if (source) {
          filters.source = source[0];
        }
      }

      // Check for token
      const token = Object.entries(publicKeyMappings).find(
        ([_, value]) => {value.toLowerCase().includes(word) , _, value}
      );
      if (token) {
        filters.token = token[0];
      }

      // Check token metadata
      if (tokenMetadata) {
        const metadataMatch = Object.entries(tokenMetadata).find(
          ([_, metadata]) => {metadata.name.toLowerCase().includes(word), _, metadata}
        );
        if (metadataMatch) {
          filters.token = metadataMatch[0];
        }
      }
    });

    return filters;
  };

  const matchesSearchCriteria = (transaction: Transaction, filters: FilterCriteria): boolean => {
    if (!filters.token && !filters.action && !filters.destination && !filters.source && !filters.type) {
      return true;
    }

    // Check transaction type first
    if (filters.type && transaction.type !== filters.type) {
      return false;
    }

    // If no token transfers, only check type
    if (!transaction.tokenTransfers || transaction.tokenTransfers.length === 0) {
      return filters.type === transaction.type;
    }

    return transaction.tokenTransfers.some((transfer) => {
      // Check token
      if (filters.token && transfer.mint !== filters.token) {
        return false;
      }

      // Check action
      if (filters.action === "send" && transfer.fromUserAccount !== walletAddress) {
        return false;
      }
      if (filters.action === "receive" && transfer.toUserAccount !== walletAddress) {
        return false;
      }

      // Check destination
      if (filters.destination && transfer.toUserAccount !== filters.destination) {
        return false;
      }

      // Check source
      if (filters.source && transfer.fromUserAccount !== filters.source) {
        return false;
      }

      return true;
    });
  };

  const loadTransactions = async (beforeSignature?: string) => {
    try {
      const data = await fetchTransactions(beforeSignature, walletAddress);
      
      if (!data || data.length === 0) {
        setHasMore(false);
        return;
      }

      const filteredData = data.filter(
        (transaction: { type: string; tokenTransfers: TokenTransfer[] }) => {
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
transaction;  // transaction is unused
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

  const getFilteredTransactions = useCallback(() => {
    if (!transactions || !searchQuery.trim()) {
      return transactions;
    }

    const filters = parseSearchQuery(searchQuery);
    return transactions.filter((transaction) => matchesSearchCriteria(transaction, filters));
  }, [transactions, searchQuery, walletAddress, tokenMetadata]);

  const filteredTransactions = getFilteredTransactions();

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
            placeholder="Search transactions (e.g., 'sent usdc' or 'received from wallet')"
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



  export default TransactionHistory