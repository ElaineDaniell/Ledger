"use client";

import { useFhevm } from "../fhevm/useFhevm";
import { useInMemoryStorage } from "../hooks/useInMemoryStorage";
import { useMetaMaskEthersSigner } from "../hooks/metamask/useMetaMaskEthersSigner";
import { useLedger } from "@/hooks/useLedger";
import { useState } from "react";

export const LedgerDemo = () => {
  const { storage: fhevmDecryptionSignatureStorage } = useInMemoryStorage();
  const {
    provider,
    chainId,
    accounts,
    isConnected,
    connect,
    ethersSigner,
    ethersReadonlyProvider,
    sameChain,
    sameSigner,
    initialMockChains,
  } = useMetaMaskEthersSigner();

  const {
    instance: fhevmInstance,
    status: fhevmStatus,
    error: fhevmError,
  } = useFhevm({
    provider,
    chainId,
    initialMockChains,
    enabled: true,
  });

  const ledger = useLedger({
    instance: fhevmInstance,
    fhevmDecryptionSignatureStorage,
    eip1193Provider: provider,
    chainId,
    ethersSigner,
    ethersReadonlyProvider,
    sameChain,
    sameSigner,
  });

  const [amount, setAmount] = useState<string>("");
  const [isIncome, setIsIncome] = useState<boolean>(false);
  const [category, setCategory] = useState<number>(0);
  const [budget, setBudget] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"transactions" | "budget" | "stats">("transactions");

  const copyToClipboard = (text?: string) => {
    if (!text) return;
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text);
    }
  };

  const incomeCategories = [
    { id: 5, name: "Salary", icon: "💰" },
    { id: 6, name: "Investment", icon: "📈" },
    { id: 7, name: "Other Income", icon: "💵" },
  ];

  const expenseCategories = [
    { id: 0, name: "Food", icon: "🍔" },
    { id: 1, name: "Transport", icon: "🚗" },
    { id: 2, name: "Shopping", icon: "🛍️" },
    { id: 3, name: "Entertainment", icon: "🎬" },
    { id: 4, name: "Medical", icon: "🏥" },
  ];

  const categories = isIncome ? incomeCategories : expenseCategories;

  if (!isConnected) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="text-6xl mb-4">📊</div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Ledger</h1>
            <p className="text-gray-600 mb-6">Privacy-Preserving Encrypted Ledger System</p>
            <button
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 shadow-md"
              onClick={connect}
            >
              Connect to MetaMask
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (ledger.isDeployed === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-pink-100">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="text-6xl mb-4">⚠️</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Contract Not Deployed</h2>
            <p className="text-gray-600 mb-2">
              Ledger contract is not deployed on chainId={chainId}
            </p>
            <p className="text-sm text-gray-500">
              Please deploy the contract first using: <code className="bg-gray-100 px-2 py-1 rounded">npm run deploy:local</code>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-800 mb-2">📊 Ledger</h1>
              <p className="text-gray-600">Privacy-Preserving Encrypted Financial Tracking</p>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500">Chain ID</div>
              <div className="text-lg font-semibold text-gray-800">{chainId}</div>
              <div className="text-sm text-gray-500 mt-1">Account</div>
              <div className="text-xs font-mono text-gray-600">
                {accounts?.[0]?.slice(0, 6)}...{accounts?.[0]?.slice(-4)}
              </div>
            </div>
          </div>
        </div>

        {/* Balance Card */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl shadow-xl p-6 mb-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm opacity-90 mb-1">Current Balance</div>
              <div className="text-4xl font-bold">
                {ledger.isDecrypted && ledger.clearBalance !== undefined
                  ? `${Number(ledger.clearBalance)}`
                  : "***"}
              </div>
              <div className="text-sm opacity-75 mt-2">
                {ledger.isDecrypted ? "Decrypted" : "Encrypted"}
              </div>
            </div>
            <div className="flex gap-3">
              <button
                className="bg-white/20 hover:bg-white/30 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200 backdrop-blur-sm"
                disabled={ledger.isDecrypting || ledger.isRefreshing}
                onClick={ledger.decryptBalance}
              >
                {ledger.isDecrypting ? "Decrypting..." : ledger.isDecrypted ? "✓ Decrypted" : "Decrypt"}
              </button>
              <button
                className="bg-white/20 hover:bg-white/30 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200 backdrop-blur-sm"
                disabled={!ledger.canGetData}
                onClick={ledger.refreshData}
              >
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-2xl shadow-lg mb-6">
          <div className="flex border-b border-gray-200">
            {[
              { id: "transactions", label: "💸 Transactions", icon: "💸" },
              { id: "budget", label: "💰 Budget", icon: "💰" },
              { id: "stats", label: "📈 Statistics", icon: "📈" },
            ].map((tab) => (
              <button
                key={tab.id}
                className={`flex-1 py-4 px-6 font-semibold transition-colors duration-200 ${
                  activeTab === tab.id
                    ? "text-indigo-600 border-b-2 border-indigo-600"
                    : "text-gray-600 hover:text-gray-800"
                }`}
                onClick={() => setActiveTab(tab.id as any)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="p-6">
            {/* Transactions Tab */}
            {activeTab === "transactions" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800 mb-4">Add Transaction</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Amount
                      </label>
                      <input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="w-full rounded-lg border-gray-300 shadow-sm px-4 py-3 border focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="Enter amount"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Type
                      </label>
                      <div className="flex gap-3">
                        <button
                          className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-colors duration-200 ${
                            isIncome
                              ? "bg-green-500 text-white"
                              : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                          }`}
                          onClick={() => setIsIncome(true)}
                        >
                          💰 Income
                        </button>
                        <button
                          className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-colors duration-200 ${
                            !isIncome
                              ? "bg-red-500 text-white"
                              : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                          }`}
                          onClick={() => setIsIncome(false)}
                        >
                          💸 Expense
                        </button>
                      </div>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Category
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {categories.map((cat) => (
                          <button
                            key={cat.id}
                            className={`py-3 px-4 rounded-lg font-semibold transition-colors duration-200 ${
                              category === cat.id
                                ? "bg-indigo-600 text-white"
                                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                            }`}
                            onClick={() => setCategory(cat.id)}
                          >
                            <span className="text-xl mr-2">{cat.icon}</span>
                            {cat.name}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="md:col-span-2">
                      <button
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-4 px-6 rounded-lg transition-colors duration-200 shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={!ledger.canGetData || !amount || ledger.isSubmitting}
                        onClick={() => {
                          if (amount) {
                            ledger.addTransaction(
                              Number(amount),
                              isIncome,
                              category,
                              category
                            );
                            setAmount("");
                          }
                        }}
                      >
                        {ledger.isSubmitting ? "⏳ Submitting..." : "➕ Add Transaction"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Budget Tab */}
            {activeTab === "budget" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800 mb-4">Set Monthly Budget</h2>
                  <div className="max-w-md">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Budget Amount
                    </label>
                    <input
                      type="number"
                      value={budget}
                      onChange={(e) => setBudget(e.target.value)}
                      className="w-full rounded-lg border-gray-300 shadow-sm px-4 py-3 border focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 mb-4"
                      placeholder="Enter monthly budget"
                    />
                    <button
                      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-4 px-6 rounded-lg transition-colors duration-200 shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={!ledger.canGetData || !budget || ledger.isSubmitting}
                      onClick={() => {
                        if (budget) {
                          ledger.setBudget(Number(budget));
                          setBudget("");
                        }
                      }}
                    >
                      {ledger.isSubmitting ? "⏳ Setting..." : "💾 Set Budget"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Statistics Tab */}
            {activeTab === "stats" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold text-gray-800">Statistics</h2>
                  <button
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200 shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={!ledger.canDecryptStats || ledger.isDecrypting}
                    onClick={ledger.decryptStats}
                  >
                    {ledger.isDecrypting ? "Decrypting..." : ledger.isStatsDecrypted ? "✓ Decrypted" : "Decrypt Statistics"}
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6">
                    <div className="text-sm text-blue-600 mb-1">Monthly Expense</div>
                    <div className="text-3xl font-bold text-blue-800">
                      {ledger.clearMonthlyExpense !== undefined
                        ? `${Number(ledger.clearMonthlyExpense)}`
                        : "***"}
                    </div>
                    <div className="text-xs text-blue-600 mt-2">
                      {ledger.clearMonthlyExpense !== undefined ? "Decrypted" : "Encrypted"}
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6">
                    <div className="text-sm text-purple-600 mb-1">Monthly Budget</div>
                    <div className="text-3xl font-bold text-purple-800">
                      {ledger.clearMonthlyBudget !== undefined
                        ? `${Number(ledger.clearMonthlyBudget)}`
                        : "***"}
                    </div>
                    <div className="text-xs text-purple-600 mt-2">
                      {ledger.clearMonthlyBudget !== undefined ? "Decrypted" : "Encrypted"}
                    </div>
                  </div>
                </div>
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                  <div className="flex items-center">
                    <span className="text-2xl mr-3">ℹ️</span>
                    <div>
                      <div className="font-semibold text-yellow-800">Privacy Notice</div>
                      <div className="text-sm text-yellow-700">
                        All financial data is encrypted on-chain. Click "Decrypt Statistics" to view your statistics.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Status Messages */}
        {ledger.message && (
          <div className="bg-white rounded-xl shadow-lg p-4 mb-6">
            <div className="text-sm text-gray-600">
              <span className="font-semibold">Status:</span> {ledger.message}
            </div>
          </div>
        )}

        {/* Debug Info (Collapsible) */}
        <details className="bg-white rounded-xl shadow-lg p-4">
          <summary className="cursor-pointer text-sm font-semibold text-gray-600">
            Debug Information
          </summary>
          <div className="mt-4 space-y-2 text-xs font-mono">
            <div>FHEVM Status: {fhevmStatus}</div>
            <div>FHEVM Error: {fhevmError?.message || "None"}</div>
            <div>Contract: {ledger.contractAddress || "Not deployed"}</div>
            <div>Contract Chain: {ledger.contractChainName || "Unknown"} ({ledger.contractChainId || "?"})</div>
            <div>Is Refreshing: {ledger.isRefreshing ? "Yes" : "No"}</div>
            <div>Is Decrypting: {ledger.isDecrypting ? "Yes" : "No"}</div>
            <div>Is Submitting: {ledger.isSubmitting ? "Yes" : "No"}</div>
            <hr className="my-2" />
            <div className="font-semibold">Balance Handle (Current)</div>
            <div className="flex items-center gap-2">
              <span>balance handle:</span>
              <span className="truncate max-w-[50ch]" title={ledger.balanceHandle}>{ledger.balanceHandle || "-"}</span>
              <button
                className="ml-auto bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded"
                onClick={() => copyToClipboard(ledger.balanceHandle)}
              >Copy</button>
            </div>
            <div>Decrypted Balance: {ledger.clearBalance !== undefined ? String(ledger.clearBalance) : "-"}</div>
            <hr className="my-2" />
            <div className="font-semibold">AddTransaction Diagnostics</div>
            <div>Encryption Contract Address: {ledger.debugEncryptionContractAddress || "-"}</div>
            <div>Encryption User Address: {ledger.debugEncryptionUserAddress || "-"}</div>
            <div>Encryption ChainId: {ledger.debugEncryptionChainId ?? "-"}</div>
            <div>Param amount: {ledger.lastAddAmount ?? "-"}</div>
            <div>Param isIncome: {typeof ledger.lastAddIsIncome === "boolean" ? (ledger.lastAddIsIncome ? "true" : "false") : "-"}</div>
            <div>Param category: {ledger.lastAddCategory ?? "-"}</div>
            <div>Param categoryKey: {ledger.lastAddCategoryKey ?? "-"}</div>
            <div>Param month: {ledger.lastAddMonth ?? "-"}</div>
            <div>Param timestamp: {ledger.lastAddTimestamp ?? "-"}</div>
            <div className="flex items-center gap-2">
              <span>amount handle:</span>
              <span className="truncate max-w-[50ch]" title={ledger.lastAddAmountHandle}>{ledger.lastAddAmountHandle || "-"}</span>
              <button
                className="ml-auto bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded"
                onClick={() => copyToClipboard(ledger.lastAddAmountHandle)}
              >Copy</button>
            </div>
            <div className="flex items-center gap-2">
              <span>amount proof:</span>
              <span className="truncate max-w-[50ch]" title={ledger.lastAddAmountProof}>{ledger.lastAddAmountProof || "-"}</span>
              <span>len: {ledger.lastAddAmountProof ? String(ledger.lastAddAmountProof.length) : "-"}</span>
              <button
                className="ml-auto bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded"
                onClick={() => copyToClipboard(ledger.lastAddAmountProof)}
              >Copy</button>
            </div>
            <div className="flex items-center gap-2">
              <span>tx hash:</span>
              <span className="truncate max-w-[50ch]" title={ledger.lastAddTxHash}>{ledger.lastAddTxHash || "-"}</span>
              <button
                className="ml-auto bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded"
                onClick={() => copyToClipboard(ledger.lastAddTxHash)}
              >Copy</button>
            </div>
            <div>receipt status: {ledger.lastAddReceiptStatus ?? "-"}</div>
            <div className="text-red-600">error: {ledger.lastAddError || "-"}</div>
          </div>
        </details>
      </div>
    </div>
  );
};
