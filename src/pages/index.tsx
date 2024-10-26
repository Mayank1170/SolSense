import { useEffect, useState } from "react";
import { fetchTransactions } from "../components/fetch";
import { fetchAssetDetails } from "../services/helius";
import { Clock, ArrowUpRight, ArrowDownLeft, Copy } from "lucide-react";

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

const WALLET_ADDRESS = process.env.NEXT_PUBLIC_WALLET_ADDRESS;
const TRACKED_USER = `${WALLET_ADDRESS}`;
const FILTERED_TYPES = ["TOKEN_MINT", "SWAP", "UNKNOWN"];

const Home = () => {
  const [transactions, setTransactions] = useState<Transaction[] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [copiedSignature, setCopiedSignature] = useState<string | null>(null);
  const [tokenMetadata, setTokenMetadata] = useState<{ [mint: string]: TokenMetadata }>({});
  const [searchQuery, setSearchQuery] = useState<string>("");

  useEffect(() => {
    const getTransactions = async () => {
      const data = await fetchTransactions();

      const filteredData = data.filter((transaction: { type: string; tokenTransfers: any[] }) => {
        if (FILTERED_TYPES.includes(transaction.type)) {
          return transaction.tokenTransfers?.some(
            (transfer) =>
              transfer.fromUserAccount === TRACKED_USER ||
              transfer.toUserAccount === TRACKED_USER
          );
        }
        return true;
      });

      setTransactions(filteredData);
      setLoading(false);
    };
    getTransactions();
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

  const formatDate = (timestamp: number) => new Date(timestamp * 1000).toLocaleString();

  const truncateAddress = (address: string) => `${address.slice(0, 4)}...${address.slice(-4)}`;

  const handleCopySignature = (signature: string) => {
    navigator.clipboard
      .writeText(signature)
      .then(() => {
        setCopiedSignature(signature);
        setTimeout(() => setCopiedSignature(null), 3000);
      })
      .catch((err) => console.error("Failed to copy signature:", err));
  };

  const renderTransfer = (transfer: TokenTransfer, i: number, transaction: Transaction) => {
    const metadata = tokenMetadata[transfer.mint];
    const isSender = transfer.fromUserAccount === TRACKED_USER;
    const isReceiver = transfer.toUserAccount === TRACKED_USER;

    return (
      <div className="bg-gray-800 rounded-lg shadow-lg p-4 mb-4" key={i}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            {metadata?.image && (
              <img src={metadata.image} alt={metadata.name} className="w-8 h-8 rounded-full" />
            )}
            <span className="font-semibold text-gray-200">
              {metadata?.name || "Unknown Token"}
            </span>
          </div>
          <div className={`flex items-center px-3 py-1 rounded-full ${isSender ? "bg-red-500/10 text-red-500" : "bg-green-500/10 text-green-500"}`}>
            {isSender ? <ArrowUpRight className="w-4 h-4 mr-1" /> : <ArrowDownLeft className="w-4 h-4 mr-1" />}
            {transfer.tokenAmount}
          </div>
        </div>
        <div className="space-y-2 text-sm">
          {isSender ? (
            <p className="text-gray-300">Sent to: {truncateAddress(transfer.toUserAccount || "")}</p>
          ) : (
            <p className="text-gray-300">Received from: {truncateAddress(transfer.fromUserAccount || "")}</p>
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
            transfer.fromUserAccount === TRACKED_USER ||
            transfer.toUserAccount === TRACKED_USER
        )
        .map((transfer, i) => renderTransfer(transfer, i, transaction));
    }
    return transaction.tokenTransfers?.map((transfer, i) =>
      renderTransfer(transfer, i, transaction)
    );
  };

  const filteredTransactions = transactions?.filter((transaction) => {
    const query = searchQuery.toLowerCase();
    return (
      transaction.type.toLowerCase().includes(query) ||
      transaction.signature.toLowerCase().includes(query) ||
      transaction.tokenTransfers?.some(
        (transfer) =>
          (tokenMetadata[transfer.mint]?.name?.toLowerCase() || "").includes(query) ||
          (transfer.fromUserAccount?.toLowerCase() || "").includes(query) ||
          (transfer.toUserAccount?.toLowerCase() || "").includes(query)
      )
    );
  });

  return (
    <div className="min-h-screen bg-gray-900 p-6 scroll-smooth">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-white mb-6">Transaction History</h1>

        <input
          type="text"
          placeholder="Search transactions..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="mb-6 p-3 w-full rounded-lg bg-gray-800 text-gray-300 placeholder-gray-500 outline-none focus:ring-2 focus:ring-blue-500"
        />

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
          </div>
        ) : filteredTransactions && filteredTransactions.length > 0 ? (
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
                            onClick={() => handleCopySignature(transaction.signature)}
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
                  {transaction.tokenTransfers && transaction.tokenTransfers.length > 0 && (
                    <div>{renderTokenTransfers(transaction)}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-gray-400 py-12">No transactions found</div>
        )}
      </div>
    </div>
  );
};

export default Home;
