import { apiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { BankAccount } from "../models/bankAccountModel.js"

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

    return res.status(201).json({
        message: "Bank account created successfully",
        bankAccount
    });
})

const getBankAccounts = asyncHandler(async(req, res) => {
    const bankAccounts = await BankAccount.find({owner: req.user._id});
    return res.status(200).json({
        bankAccounts,
        message: "Bank accounts fetched successfully"
    });
})

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