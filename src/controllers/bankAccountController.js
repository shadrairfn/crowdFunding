import { apiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { BankAccount } from "../models/bankAccountModel.js"

/**
 * Create a new bank account.
 * @route   POST /api/v1/bankAccount/createBankAccount
 * @param   {Object} req.body - Bank account details
 * @returns {Object} 200 - Created bank account object
 * @throws  {apiError} 400 - All fields are required or Bank account already exists
 */
const createBankAccount = asyncHandler(async(req, res) => {
    const {bankCode, accountNumber, accountHolder} = req.body; 

    if ([bankCode, accountNumber, accountHolder].some((field) => field?.trim() === "")) {
        throw new apiError(400, "All fields are required");
    }

    const bankAccountExists = await BankAccount.findOne({owner: req.user._id});
    if (bankAccountExists) {
        throw new apiError(400, "Bank account already exists");
    }

    const bankAccount = await BankAccount.create({
        owner: req.user._id,
        banks: [{bankCode: bankCode?.trim(), accountNumber: accountNumber?.trim(), accountHolder}]
    });

    return res.status(200).json({
        message: "Bank account created successfully",
        bankAccount
    });
})

/**
 * Get all bank accounts of the user.
 * @route   GET /api/v1/bankAccount/
 * @param   {String} req.user._id - User ID
 * @returns {Object} 200 - Array of bank account objects
 */
const getBankAccounts = asyncHandler(async(req, res) => {
    const bankAccounts = await BankAccount.find({owner: req.user._id});
    return res.status(200).json({
        bankAccounts,
        message: "Bank accounts fetched successfully"
    });
})

/**
 * Add a new bank account to the user's account.
 * @route   POST /api/v1/bankAccount/addBankAccount
 * @param   {Object} req.body - Bank account details
 * @returns {Object} 200 - Added bank account object
 * @throws  {apiError} 400 - All fields are required or Bank account already exists
 */
const addBankAccount = asyncHandler(async(req, res) => {
    const {bankCode, accountNumber, accountHolder} = req.body; 

    if ([bankCode, accountNumber, accountHolder].some((field) => field?.trim() === "")) {
        throw new apiError(400, "All fields are required");
    }

    const bankAccount = await BankAccount.findOne({owner: req.user._id});
    if (!bankAccount) {
        throw new apiError(404, "Bank account not found");
    }

    for (let bank of bankAccount.banks) {
        if (bank.bankCode === bankCode?.trim() && bank.accountNumber === accountNumber?.trim() && bank.accountHolder === accountHolder?.trim()) {
            throw new apiError(400, "Bank account already exists");
        }
    }

    bankAccount.banks.push({bankCode: bankCode?.trim(), accountNumber: accountNumber?.trim(), accountHolder: accountHolder?.trim()});
    await bankAccount.save();

    return res.status(200).json({
        message: "Bank account added successfully",
        bankAccount
    });
});

export {createBankAccount, getBankAccounts, addBankAccount}