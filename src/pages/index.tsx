import { useEffect, useState } from "react";
import { fetchTransactions } from "../components/fetch";
import { fetchAssetDetails } from "../services/helius";

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
  const [tokenMetadata, setTokenMetadata] = useState<{
    [mint: string]: TokenMetadata;
  }>({});

  useEffect(() => {
    const getTransactions = async () => {
      const data = await fetchTransactions();

      const filteredData = data.filter(
        (transaction: { type: string; tokenTransfers: any[] }) => {
          if (FILTERED_TYPES.includes(transaction.type)) {
            return transaction.tokenTransfers?.some(
              (transfer) =>
                transfer.fromUserAccount === TRACKED_USER ||
                transfer.toUserAccount === TRACKED_USER
            );
          }
          return true;
        }
      );

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

  const renderTransfer = (
    transfer: TokenTransfer,
    i: number,
    transactionType: string
  ) => {
    const metadata = tokenMetadata[transfer.mint];
    return (
      <li className="bg-gray-900 m-5 p-3" key={i}>
        <p>Mint: {transfer.mint}</p>
        <p>From: {transfer.fromUserAccount}</p>
        <p>To: {transfer.toUserAccount}</p>
        <div className="flex">
          <p
            className={
              transfer.fromUserAccount === TRACKED_USER
                ? "text-red-500 flex flex-row gap-3"
                : transfer.toUserAccount === TRACKED_USER
                ? "text-green-500  flex flex-row gap-3"
                : ""
            }
          >
            Amount:{" "}
            <span className="flex flex-row gap-1">
              {transfer.fromUserAccount === TRACKED_USER ? <p>-</p> : <p>+</p>}
              {transfer.tokenAmount}
            </span>
          </p>
        </div>
        {metadata ? (
          <div>
            <p>Token Name: {metadata.name}</p>
            {metadata.image && (
              <img
                src={metadata.image}
                alt={metadata.name}
                style={{ width: "50px" }}
              />
            )}
          </div>
        ) : (
          <p>Loading token metadata...</p>
        )}
      </li>
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
        .map((transfer, i) => renderTransfer(transfer, i, transaction.type));
    }
    return transaction.tokenTransfers?.map((transfer, i) =>
      renderTransfer(transfer, i, transaction.type)
    );
  };

  return (
    <div>
      <h1>Helius Transactions</h1>
      {loading ? (
        <p>Loading transactions...</p>
      ) : transactions && transactions.length > 0 ? (
        <ul>
          {transactions.map((transaction, index) => (
            <li
              key={index}
              style={{ marginBottom: "20px" }}
              className="bg-gray-700 p-5"
            >
              <h3>Transaction {index + 1}</h3>
              {/* <h2>Description: {transaction.description}</h2> */}
              <p>Type: {transaction.type}</p>
              <p>Source: {transaction.source}</p>
              <p>Destination: {transaction.destination}</p>
              <p>Amount: {transaction.tokenAmount}</p>

              {transaction.tokenTransfers &&
                transaction.tokenTransfers.length > 0 && (
                  <div>
                    <h4>Token Transfers:</h4>
                    <ul>{renderTokenTransfers(transaction)}</ul>
                  </div>
                )}
            </li>
          ))}
        </ul>
      ) : (
        <p>No transactions found.</p>
      )}
    </div>
  );
};

export default Home;
