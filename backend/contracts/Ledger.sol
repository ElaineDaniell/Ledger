// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, euint32, externalEuint32, ebool} from "@fhevm/solidity/lib/FHE.sol";
import {SepoliaConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title Ledger - Privacy-preserving encrypted ledger system
/// @notice A FHEVM-based ledger system for encrypted income/expense tracking
/// @dev Only transaction amounts are encrypted, other fields (timestamp, category, isIncome) are stored in plaintext
contract Ledger is SepoliaConfig {
    // User account structure
    struct UserAccount {
        euint32 balance;              // Encrypted balance
        euint32 monthlyExpense;        // Encrypted monthly expense
        euint32 monthlyBudget;         // Encrypted monthly budget
        ebool isOverBudget;           // Encrypted over-budget flag
        ebool isBudgetWarning;        // Encrypted budget warning flag
        uint256 lastUpdateMonth;      // Last update month (unencrypted for filtering)
    }

    // Transaction record structure
    struct Transaction {
        euint32 amount;               // Encrypted amount
        uint256 timestamp;            // Plaintext timestamp
        uint256 category;             // Plaintext category identifier
        bool isIncome;                // Plaintext income/expense flag
        uint256 month;                // Month (unencrypted for filtering)
    }

    // Mapping from user address to account
    mapping(address => UserAccount) public accounts;
    
    // Mapping from user address to transaction array
    mapping(address => Transaction[]) public transactions;
    
    // Mapping from user address to category totals (category => total)
    mapping(address => mapping(uint256 => euint32)) public categoryTotals;

    // Events
    event TransactionAdded(address indexed user, uint256 transactionIndex);
    event BudgetUpdated(address indexed user);
    event BalanceUpdated(address indexed user);

    /// @notice Check whether an euint32 handle is zero (uninitialized)
    function _isZero(euint32 v) internal pure returns (bool) {
        return euint32.unwrap(v) == bytes32(0);
    }

    /// @notice Check whether an ebool handle is zero (uninitialized)
    function _isZero(ebool v) internal pure returns (bool) {
        return ebool.unwrap(v) == bytes32(0);
    }

    /// @notice Ensure numeric encrypted fields are initialized to encrypted zero
    function _ensureNumericInitialized(UserAccount storage account) internal {
        if (_isZero(account.balance)) {
            account.balance = FHE.asEuint32(0);
        }
        if (_isZero(account.monthlyExpense)) {
            account.monthlyExpense = FHE.asEuint32(0);
        }
        if (_isZero(account.monthlyBudget)) {
            account.monthlyBudget = FHE.asEuint32(0);
        }
    }

    /// @notice Allow decryption for euint32 if not zero handle
    function _allowIfNotZero(euint32 v) internal {
        if (!_isZero(v)) {
            FHE.allowThis(v);
            FHE.allow(v, msg.sender);
        }
    }

    /// @notice Allow decryption for ebool if not zero handle
    function _allowIfNotZero(ebool v) internal {
        if (!_isZero(v)) {
            FHE.allowThis(v);
            FHE.allow(v, msg.sender);
        }
    }

    /// @notice Get user's encrypted balance
    /// @return The encrypted balance
    function getBalance() external view returns (euint32) {
        return accounts[msg.sender].balance;
    }

    /// @notice Get user's encrypted monthly expense
    /// @return The encrypted monthly expense
    function getMonthlyExpense() external view returns (euint32) {
        return accounts[msg.sender].monthlyExpense;
    }

    /// @notice Get user's encrypted monthly budget
    /// @return The encrypted monthly budget
    function getMonthlyBudget() external view returns (euint32) {
        return accounts[msg.sender].monthlyBudget;
    }

    /// @notice Get user's encrypted over-budget flag
    /// @return The encrypted over-budget flag
    function getIsOverBudget() external view returns (ebool) {
        return accounts[msg.sender].isOverBudget;
    }

    /// @notice Get user's encrypted budget warning flag
    /// @return The encrypted budget warning flag
    function getIsBudgetWarning() external view returns (ebool) {
        return accounts[msg.sender].isBudgetWarning;
    }

    /// @notice Get transaction count for the caller
    /// @return The number of transactions
    function getTransactionCount() external view returns (uint256) {
        return transactions[msg.sender].length;
    }

    /// @notice Get a specific transaction by index
    /// @param index The transaction index
    /// @return The transaction (only amount is encrypted, other fields are plaintext)
    function getTransaction(uint256 index) external view returns (Transaction memory) {
        require(index < transactions[msg.sender].length, "Transaction index out of bounds");
        return transactions[msg.sender][index];
    }

    /// @notice Add a transaction (income or expense)
    /// @param amountEuint32 The encrypted amount
    /// @param timestamp The plaintext timestamp
    /// @param category The plaintext category identifier
    /// @param isIncome The plaintext income flag (true for income, false for expense)
    /// @param categoryKey The category key for indexing (unencrypted for mapping key)
    /// @param month The month (unencrypted for filtering)
    /// @param amountProof The proof for amount
    function addTransaction(
        externalEuint32 amountEuint32,
        uint256 timestamp,
        uint256 category,
        bool isIncome,
        uint256 categoryKey,  // Unencrypted category key for mapping
        uint256 month,
        bytes calldata amountProof
    ) external {
        // Ensure account fields are initialized to encrypted zero before any arithmetic
        _ensureNumericInitialized(accounts[msg.sender]);

        // Convert external encrypted amount to internal euint32
        euint32 amount = FHE.fromExternal(amountEuint32, amountProof);

        // Create transaction
        Transaction memory newTransaction = Transaction({
            amount: amount,
            timestamp: timestamp,
            category: category,
            isIncome: isIncome,
            month: month
        });

        // Add transaction to array
        transactions[msg.sender].push(newTransaction);

        // Update balance: add income, subtract expense
        // Use plaintext isIncome for conditional logic
        if (isIncome) {
            accounts[msg.sender].balance = FHE.add(accounts[msg.sender].balance, amount);
        } else {
            accounts[msg.sender].balance = FHE.sub(accounts[msg.sender].balance, amount);
        }
        
        // Always allow decryption of balance after update (it's a new handle after arithmetic)
        FHE.allowThis(accounts[msg.sender].balance);
        FHE.allow(accounts[msg.sender].balance, msg.sender);

        // Update monthly expense if it's an expense
        if (!isIncome) {
            if (month == accounts[msg.sender].lastUpdateMonth) {
                accounts[msg.sender].monthlyExpense = FHE.add(accounts[msg.sender].monthlyExpense, amount);
            } else {
                accounts[msg.sender].monthlyExpense = amount;
                accounts[msg.sender].lastUpdateMonth = month;
            }
        }

        // Update category total (using unencrypted categoryKey for mapping)
        // Initialize category bucket if needed
        if (_isZero(categoryTotals[msg.sender][categoryKey])) {
            categoryTotals[msg.sender][categoryKey] = FHE.asEuint32(0);
        }
        categoryTotals[msg.sender][categoryKey] = FHE.add(categoryTotals[msg.sender][categoryKey], amount);

        // Update budget flags
        _updateBudgetFlags();

        // Allow decryption of updated values (skip zero handles)
        _allowIfNotZero(accounts[msg.sender].balance);
        _allowIfNotZero(accounts[msg.sender].monthlyExpense);
        _allowIfNotZero(accounts[msg.sender].isOverBudget);
        _allowIfNotZero(accounts[msg.sender].isBudgetWarning);

        emit TransactionAdded(msg.sender, transactions[msg.sender].length - 1);
        emit BalanceUpdated(msg.sender);
    }

    /// @notice Set monthly budget
    /// @param budgetEuint32 The encrypted budget amount
    /// @param budgetProof The proof for budget
    function setMonthlyBudget(
        externalEuint32 budgetEuint32,
        bytes calldata budgetProof
    ) external {
        // Ensure numeric fields initialized before computing flags
        _ensureNumericInitialized(accounts[msg.sender]);
        euint32 budget = FHE.fromExternal(budgetEuint32, budgetProof);
        accounts[msg.sender].monthlyBudget = budget;
        
        // Update budget flags
        _updateBudgetFlags();

        _allowIfNotZero(accounts[msg.sender].monthlyBudget);
        _allowIfNotZero(accounts[msg.sender].isOverBudget);
        _allowIfNotZero(accounts[msg.sender].isBudgetWarning);

        emit BudgetUpdated(msg.sender);
    }

    /// @notice Get category total for a specific category
    /// @param category The category identifier (unencrypted for now)
    /// @return The encrypted category total
    function getCategoryTotal(uint256 category) external view returns (euint32) {
        return categoryTotals[msg.sender][category];
    }

    /// @notice Internal function to update budget flags
    function _updateBudgetFlags() internal {
        UserAccount storage account = accounts[msg.sender];
        
        // Ensure fields are initialized before comparison operations
        _ensureNumericInitialized(account);
        
        // Check if over budget: monthlyExpense > monthlyBudget
        account.isOverBudget = FHE.gt(account.monthlyExpense, account.monthlyBudget);
        
        // Check if budget warning: monthlyExpense > monthlyBudget * 0.8
        // Since we can't do floating point, we'll use: monthlyExpense * 10 > monthlyBudget * 8
        euint32 expenseTimes10 = FHE.mul(account.monthlyExpense, FHE.asEuint32(10));
        euint32 budgetTimes8 = FHE.mul(account.monthlyBudget, FHE.asEuint32(8));
        account.isBudgetWarning = FHE.gt(expenseTimes10, budgetTimes8);
    }

    /// @notice Query transactions by month (returns transaction data with encrypted amounts)
    /// @param month The month to query
    /// @return An array of transaction indices matching the month
    function queryTransactionsByMonth(uint256 month) external view returns (uint256[] memory) {
        Transaction[] memory userTransactions = transactions[msg.sender];
        uint256 count = 0;
        
        // First pass: count matching transactions
        for (uint256 i = 0; i < userTransactions.length; i++) {
            if (userTransactions[i].month == month) {
                count++;
            }
        }
        
        // Second pass: collect indices
        uint256[] memory indices = new uint256[](count);
        uint256 index = 0;
        for (uint256 i = 0; i < userTransactions.length; i++) {
            if (userTransactions[i].month == month) {
                indices[index] = i;
                index++;
            }
        }
        
        return indices;
    }
}

