"use client";

import { ethers } from "ethers";
import {
  RefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { FhevmInstance } from "@/fhevm/fhevmTypes";
import { FhevmDecryptionSignature } from "@/fhevm/FhevmDecryptionSignature";
import { GenericStringStorage } from "@/fhevm/GenericStringStorage";

// Import generated ABI and addresses
// Run 'npm run genabi' to regenerate these files
import { LedgerABI } from "@/abi/LedgerABI";
import { LedgerAddresses } from "@/abi/LedgerAddresses";

type ClearValueType = {
  handle: string;
  clear: string | bigint | boolean;
};

type LedgerInfoType = {
  abi: typeof LedgerABI;
  address?: `0x${string}`;
  chainId?: number;
  chainName?: string;
};

function getLedgerByChainId(
  chainId: number | undefined
): LedgerInfoType {
  if (!chainId) {
    return { abi: LedgerABI };
  }

  const entry = LedgerAddresses[chainId.toString()];

  if (!entry || entry.address === ethers.ZeroAddress) {
    return { abi: LedgerABI, chainId };
  }

  return {
    address: entry.address,
    chainId: entry.chainId ?? chainId,
    chainName: entry.chainName,
    abi: LedgerABI,
  };
}

export const useLedger = (parameters: {
  instance: FhevmInstance | undefined;
  fhevmDecryptionSignatureStorage: GenericStringStorage;
  eip1193Provider: ethers.Eip1193Provider | undefined;
  chainId: number | undefined;
  ethersSigner: ethers.JsonRpcSigner | undefined;
  ethersReadonlyProvider: ethers.ContractRunner | undefined;
  sameChain: RefObject<(chainId: number | undefined) => boolean>;
  sameSigner: RefObject<
    (ethersSigner: ethers.JsonRpcSigner | undefined) => boolean
  >;
}) => {
  const {
    instance,
    fhevmDecryptionSignatureStorage,
    chainId,
    ethersSigner,
    ethersReadonlyProvider,
    sameChain,
    sameSigner,
  } = parameters;

  const [balanceHandle, setBalanceHandle] = useState<string | undefined>(undefined);
  const [clearBalance, setClearBalance] = useState<ClearValueType | undefined>(undefined);
  const [monthlyExpenseHandle, setMonthlyExpenseHandle] = useState<string | undefined>(undefined);
  const [clearMonthlyExpense, setClearMonthlyExpense] = useState<ClearValueType | undefined>(undefined);
  const [monthlyBudgetHandle, setMonthlyBudgetHandle] = useState<string | undefined>(undefined);
  const [clearMonthlyBudget, setClearMonthlyBudget] = useState<ClearValueType | undefined>(undefined);
  const [isOverBudgetHandle, setIsOverBudgetHandle] = useState<string | undefined>(undefined);
  const [clearIsOverBudget, setClearIsOverBudget] = useState<ClearValueType | undefined>(undefined);
  const [isBudgetWarningHandle, setIsBudgetWarningHandle] = useState<string | undefined>(undefined);
  const [clearIsBudgetWarning, setClearIsBudgetWarning] = useState<ClearValueType | undefined>(undefined);
  
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isDecrypting, setIsDecrypting] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [message, setMessage] = useState<string>("");

  // Diagnostics for addTransaction
  const [debugEncryptionContractAddress, setDebugEncryptionContractAddress] = useState<string | undefined>(undefined);
  const [debugEncryptionUserAddress, setDebugEncryptionUserAddress] = useState<string | undefined>(undefined);
  const [debugEncryptionChainId, setDebugEncryptionChainId] = useState<number | undefined>(undefined);
  const [lastAddAmount, setLastAddAmount] = useState<number | undefined>(undefined);
  const [lastAddIsIncome, setLastAddIsIncome] = useState<boolean | undefined>(undefined);
  const [lastAddCategory, setLastAddCategory] = useState<number | undefined>(undefined);
  const [lastAddCategoryKey, setLastAddCategoryKey] = useState<number | undefined>(undefined);
  const [lastAddMonth, setLastAddMonth] = useState<number | undefined>(undefined);
  const [lastAddTimestamp, setLastAddTimestamp] = useState<number | undefined>(undefined);
  const [lastAddAmountHandle, setLastAddAmountHandle] = useState<string | undefined>(undefined);
  const [lastAddAmountProof, setLastAddAmountProof] = useState<string | undefined>(undefined);
  const [lastAddTxHash, setLastAddTxHash] = useState<string | undefined>(undefined);
  const [lastAddReceiptStatus, setLastAddReceiptStatus] = useState<number | undefined>(undefined);
  const [lastAddError, setLastAddError] = useState<string | undefined>(undefined);

  const clearBalanceRef = useRef<ClearValueType>(undefined);
  const ledgerRef = useRef<LedgerInfoType | undefined>(undefined);
  const isRefreshingRef = useRef<boolean>(isRefreshing);
  const isDecryptingRef = useRef<boolean>(isDecrypting);
  const isSubmittingRef = useRef<boolean>(isSubmitting);

  const ledger = useMemo(() => {
    const c = getLedgerByChainId(chainId);
    ledgerRef.current = c;
    // Only show deployment not found message when:
    // 1. chainId is defined (not undefined)
    // 2. No address is configured for this chainId
    if (chainId !== undefined && !c.address) {
      setMessage(`Ledger deployment not found for chainId=${chainId}.`);
    } else if (chainId === undefined || c.address) {
      // Clear message when chainId is undefined or address exists
      setMessage("");
    }
    return c;
  }, [chainId]);

  const isDeployed = useMemo(() => {
    if (!ledger) {
      return undefined;
    }
    return Boolean(ledger.address) && ledger.address !== ethers.ZeroAddress;
  }, [ledger]);

  const canGetData = useMemo(() => {
    return ledger.address && ethersSigner && !isRefreshing;
  }, [ledger.address, ethersSigner, isRefreshing]);

  const refreshData = useCallback(() => {
    if (isRefreshingRef.current) {
      return;
    }

    if (!ledgerRef.current?.chainId || !ledgerRef.current?.address || !ethersSigner) {
      setBalanceHandle(undefined);
      setMonthlyExpenseHandle(undefined);
      setMonthlyBudgetHandle(undefined);
      return;
    }

    isRefreshingRef.current = true;
    setIsRefreshing(true);

    const thisChainId = ledgerRef.current.chainId;
    const thisLedgerAddress = ledgerRef.current.address;
    const thisEthersSigner = ethersSigner;

    const ledgerContract = new ethers.Contract(
      thisLedgerAddress,
      ledgerRef.current.abi,
      thisEthersSigner
    );

    Promise.all([
      ledgerContract.getBalance(),
      ledgerContract.getMonthlyExpense(),
      ledgerContract.getMonthlyBudget(),
      ledgerContract.getIsOverBudget(),
      ledgerContract.getIsBudgetWarning(),
    ])
      .then(([balance, expense, budget, overBudget, warning]) => {
        if (sameChain.current(thisChainId) && thisLedgerAddress === ledgerRef.current?.address && sameSigner.current(thisEthersSigner)) {
          setBalanceHandle(balance);
          setMonthlyExpenseHandle(expense);
          setMonthlyBudgetHandle(budget);
          setIsOverBudgetHandle(overBudget);
          setIsBudgetWarningHandle(warning);
        }
        isRefreshingRef.current = false;
        setIsRefreshing(false);
      })
      .catch((e) => {
        setMessage("Ledger data fetch failed! error=" + e);
        isRefreshingRef.current = false;
        setIsRefreshing(false);
      });
  }, [ethersSigner, sameChain, sameSigner]);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  const canDecrypt = useMemo(() => {
    return (
      ledger.address &&
      instance &&
      ethersSigner &&
      !isRefreshing &&
      !isDecrypting &&
      balanceHandle &&
      balanceHandle !== ethers.ZeroHash
    );
  }, [ledger.address, instance, ethersSigner, isRefreshing, isDecrypting, balanceHandle]);

  const canDecryptStats = useMemo(() => {
    const hasExpense = monthlyExpenseHandle && monthlyExpenseHandle !== ethers.ZeroHash;
    const hasBudget = monthlyBudgetHandle && monthlyBudgetHandle !== ethers.ZeroHash;
    return (
      ledger.address &&
      instance &&
      ethersSigner &&
      !isRefreshing &&
      !isDecrypting &&
      (hasExpense || hasBudget)
    );
  }, [ledger.address, instance, ethersSigner, isRefreshing, isDecrypting, monthlyExpenseHandle, monthlyBudgetHandle]);

  const decryptBalance = useCallback(() => {
    if (isRefreshingRef.current || isDecryptingRef.current) {
      return;
    }

    if (!ledger.address || !instance || !ethersSigner || !balanceHandle) {
      return;
    }

    if (balanceHandle === clearBalanceRef.current?.handle) {
      return;
    }

    if (balanceHandle === ethers.ZeroHash) {
      setClearBalance({ handle: balanceHandle, clear: BigInt(0) });
      clearBalanceRef.current = { handle: balanceHandle, clear: BigInt(0) };
      return;
    }

    const thisChainId = chainId;
    const thisLedgerAddress = ledger.address;
    const thisBalanceHandle = balanceHandle;
    const thisEthersSigner = ethersSigner;

    isDecryptingRef.current = true;
    setIsDecrypting(true);
    setMessage("Start decrypting balance...");

    const run = async () => {
      const isStale = () =>
        thisLedgerAddress !== ledgerRef.current?.address ||
        !sameChain.current(thisChainId) ||
        !sameSigner.current(thisEthersSigner);

      try {
        const sig: FhevmDecryptionSignature | null =
          await FhevmDecryptionSignature.loadOrSign(
            instance,
            [ledger.address as `0x${string}`],
            ethersSigner,
            fhevmDecryptionSignatureStorage
          );

        if (!sig) {
          setMessage("Unable to build FHEVM decryption signature");
          return;
        }

        if (isStale()) {
          setMessage("Ignore FHEVM decryption");
          return;
        }

        setMessage("Call FHEVM userDecrypt...");

        const res = await instance.userDecrypt(
          [{ handle: thisBalanceHandle, contractAddress: thisLedgerAddress }],
          sig.privateKey,
          sig.publicKey,
          sig.signature,
          sig.contractAddresses,
          sig.userAddress,
          sig.startTimestamp,
          sig.durationDays
        );

        setMessage("FHEVM userDecrypt completed!");

        if (isStale()) {
          setMessage("Ignore FHEVM decryption");
          return;
        }

        setClearBalance({ handle: thisBalanceHandle, clear: res[thisBalanceHandle] });
        clearBalanceRef.current = {
          handle: thisBalanceHandle,
          clear: res[thisBalanceHandle],
        };

        setMessage("Balance decrypted: " + clearBalanceRef.current.clear);
      } finally {
        isDecryptingRef.current = false;
        setIsDecrypting(false);
      }
    };

    run();
  }, [
    fhevmDecryptionSignatureStorage,
    ethersSigner,
    ledger.address,
    instance,
    balanceHandle,
    chainId,
    sameChain,
    sameSigner,
  ]);

  const decryptStats = useCallback(() => {
    if (isRefreshingRef.current || isDecryptingRef.current) {
      return;
    }

    if (!ledger.address || !instance || !ethersSigner) {
      return;
    }

    if (!monthlyExpenseHandle && !monthlyBudgetHandle) {
      return;
    }

    const thisChainId = chainId;
    const thisLedgerAddress = ledger.address;
    const thisEthersSigner = ethersSigner;
    const thisExpenseHandle = monthlyExpenseHandle;
    const thisBudgetHandle = monthlyBudgetHandle;

    isDecryptingRef.current = true;
    setIsDecrypting(true);
    setMessage("Start decrypting statistics...");

    const run = async () => {
      const isStale = () =>
        thisLedgerAddress !== ledgerRef.current?.address ||
        !sameChain.current(thisChainId) ||
        !sameSigner.current(thisEthersSigner);

      try {
        const sig: FhevmDecryptionSignature | null =
          await FhevmDecryptionSignature.loadOrSign(
            instance,
            [ledger.address as `0x${string}`],
            ethersSigner,
            fhevmDecryptionSignatureStorage
          );

        if (!sig) {
          setMessage("Unable to build FHEVM decryption signature");
          return;
        }

        if (isStale()) {
          setMessage("Ignore FHEVM decryption");
          return;
        }

        setMessage("Call FHEVM userDecrypt for statistics...");

        const decryptItems: Array<{ handle: string; contractAddress: string }> = [];
        if (thisExpenseHandle && thisExpenseHandle !== ethers.ZeroHash) {
          decryptItems.push({ handle: thisExpenseHandle, contractAddress: thisLedgerAddress });
        }
        if (thisBudgetHandle && thisBudgetHandle !== ethers.ZeroHash) {
          decryptItems.push({ handle: thisBudgetHandle, contractAddress: thisLedgerAddress });
        }

        if (decryptItems.length === 0) {
          setMessage("No statistics data to decrypt");
          return;
        }

        const res = await instance.userDecrypt(
          decryptItems,
          sig.privateKey,
          sig.publicKey,
          sig.signature,
          sig.contractAddresses,
          sig.userAddress,
          sig.startTimestamp,
          sig.durationDays
        );

        setMessage("FHEVM userDecrypt completed!");

        if (isStale()) {
          setMessage("Ignore FHEVM decryption");
          return;
        }

        if (thisExpenseHandle && thisExpenseHandle !== ethers.ZeroHash) {
          const expenseValue = res[thisExpenseHandle] ?? BigInt(0);
          setClearMonthlyExpense({ handle: thisExpenseHandle, clear: expenseValue });
        }

        if (thisBudgetHandle && thisBudgetHandle !== ethers.ZeroHash) {
          const budgetValue = res[thisBudgetHandle] ?? BigInt(0);
          setClearMonthlyBudget({ handle: thisBudgetHandle, clear: budgetValue });
        }

        setMessage("Statistics decrypted successfully");
      } finally {
        isDecryptingRef.current = false;
        setIsDecrypting(false);
      }
    };

    run();
  }, [
    fhevmDecryptionSignatureStorage,
    ethersSigner,
    ledger.address,
    instance,
    monthlyExpenseHandle,
    monthlyBudgetHandle,
    chainId,
    sameChain,
    sameSigner,
  ]);

  const addTransaction = useCallback(
    (amount: number, isIncome: boolean, category: number, categoryKey: number) => {
      if (isRefreshingRef.current || isSubmittingRef.current) {
        return;
      }

      if (!ledger.address || !instance || !ethersSigner) {
        return;
      }

      const thisChainId = chainId;
      const thisLedgerAddress = ledger.address;
      const thisEthersSigner = ethersSigner;

      isSubmittingRef.current = true;
      setIsSubmitting(true);
      setMessage("Starting transaction encryption...");

      const run = async () => {
        const isStale = () =>
          thisLedgerAddress !== ledgerRef.current?.address ||
          !sameChain.current(thisChainId) ||
          !sameSigner.current(thisEthersSigner);

        try {
          await new Promise((resolve) => setTimeout(resolve, 100));

          // Only encrypt the amount, other fields are plaintext
          const userAddr = await thisEthersSigner.getAddress();
          setDebugEncryptionContractAddress(thisLedgerAddress);
          setDebugEncryptionUserAddress(userAddr);
          setDebugEncryptionChainId(thisChainId);
          setLastAddAmount(amount);
          setLastAddIsIncome(isIncome);
          setLastAddCategory(category);
          setLastAddCategoryKey(categoryKey);

          const amountInput = instance.createEncryptedInput(
            thisLedgerAddress,
            userAddr
          );
          amountInput.add32(amount);
          const amountEnc = await amountInput.encrypt();
          setLastAddAmountHandle(amountEnc.handles?.[0] ? ethers.hexlify(amountEnc.handles[0]) : undefined);
          setLastAddAmountProof(typeof amountEnc.inputProof === 'string' ? amountEnc.inputProof : ethers.hexlify(amountEnc.inputProof));

          if (isStale()) {
            setMessage("Ignore transaction submission");
            return;
          }

          setMessage("Submitting transaction...");

          const ledgerContract = new ethers.Contract(
            thisLedgerAddress,
            ledger.abi,
            thisEthersSigner
          );

          const month = new Date().getMonth() + 1; // 1-12
          const timestamp = Math.floor(Date.now() / 1000);
          setLastAddMonth(month);
          setLastAddTimestamp(timestamp);

          const tx: ethers.TransactionResponse = await ledgerContract.addTransaction(
            amountEnc.handles[0],      // amount (encrypted)
            timestamp,                 // timestamp (plaintext)
            category,                  // category (plaintext)
            isIncome,                  // isIncome (plaintext)
            categoryKey,               // categoryKey (unencrypted)
            month,                     // month
            amountEnc.inputProof       // amountProof
          );

          setMessage(`Wait for tx:${tx.hash}...`);
          setLastAddTxHash(tx.hash);

          const receipt = await tx.wait();

          setMessage(`Transaction completed status=${receipt?.status}`);
          setLastAddReceiptStatus(receipt?.status as number | undefined);

          if (isStale()) {
            setMessage("Ignore transaction submission");
            return;
          }

          refreshData();
        } catch (e) {
          setMessage(`Transaction failed! ${e}`);
          try {
            setLastAddError(String(e));
          } catch {}
        } finally {
          isSubmittingRef.current = false;
          setIsSubmitting(false);
        }
      };

      run();
    },
    [
      ethersSigner,
      ledger.address,
      ledger.abi,
      instance,
      chainId,
      refreshData,
      sameChain,
      sameSigner,
    ]
  );

  const setBudget = useCallback(
    (budget: number) => {
      if (isRefreshingRef.current || isSubmittingRef.current) {
        return;
      }

      if (!ledger.address || !instance || !ethersSigner) {
        return;
      }

      const thisChainId = chainId;
      const thisLedgerAddress = ledger.address;
      const thisEthersSigner = ethersSigner;

      isSubmittingRef.current = true;
      setIsSubmitting(true);
      setMessage("Starting budget encryption...");

      const run = async () => {
        const isStale = () =>
          thisLedgerAddress !== ledgerRef.current?.address ||
          !sameChain.current(thisChainId) ||
          !sameSigner.current(thisEthersSigner);

        try {
          await new Promise((resolve) => setTimeout(resolve, 100));

          const input = instance.createEncryptedInput(
            thisLedgerAddress,
            await thisEthersSigner.getAddress()
          );
          input.add32(budget);

          const enc = await input.encrypt();

          if (isStale()) {
            setMessage("Ignore budget submission");
            return;
          }

          setMessage("Setting budget...");

          const ledgerContract = new ethers.Contract(
            thisLedgerAddress,
            ledger.abi,
            thisEthersSigner
          );

          const tx: ethers.TransactionResponse = await ledgerContract.setMonthlyBudget(
            enc.handles[0],
            enc.inputProof
          );

          setMessage(`Wait for tx:${tx.hash}...`);

          const receipt = await tx.wait();

          setMessage(`Budget set completed status=${receipt?.status}`);

          if (isStale()) {
            setMessage("Ignore budget submission");
            return;
          }

          refreshData();
        } catch (e) {
          setMessage(`Budget setting failed! ${e}`);
        } finally {
          isSubmittingRef.current = false;
          setIsSubmitting(false);
        }
      };

      run();
    },
    [
      ethersSigner,
      ledger.address,
      ledger.abi,
      instance,
      chainId,
      refreshData,
      sameChain,
      sameSigner,
    ]
  );

  return {
    contractAddress: ledger.address,
    contractChainId: ledger.chainId,
    contractChainName: ledger.chainName,
    canDecrypt,
    canDecryptStats,
    canGetData,
    decryptBalance,
    decryptStats,
    refreshData,
    addTransaction,
    setBudget,
    isDecrypted: balanceHandle && balanceHandle === clearBalance?.handle,
    isStatsDecrypted: (monthlyExpenseHandle && monthlyExpenseHandle === clearMonthlyExpense?.handle) || 
                      (monthlyBudgetHandle && monthlyBudgetHandle === clearMonthlyBudget?.handle),
    message,
    clearBalance: clearBalance?.clear,
    clearMonthlyExpense: clearMonthlyExpense?.clear,
    clearMonthlyBudget: clearMonthlyBudget?.clear,
    balanceHandle,
    monthlyExpenseHandle,
    monthlyBudgetHandle,
    isDecrypting,
    isRefreshing,
    isSubmitting,
    isDeployed,
    // Diagnostics export
    debugEncryptionContractAddress,
    debugEncryptionUserAddress,
    debugEncryptionChainId,
    lastAddAmount,
    lastAddIsIncome,
    lastAddCategory,
    lastAddCategoryKey,
    lastAddMonth,
    lastAddTimestamp,
    lastAddAmountHandle,
    lastAddAmountProof,
    lastAddTxHash,
    lastAddReceiptStatus,
    lastAddError,
  };
};

