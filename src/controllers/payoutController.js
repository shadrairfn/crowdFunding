import { apiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Campaign } from "../models/campaignModel.js";
import { BankAccount } from "../models/bankAccountModel.js";
import { Payout } from "../models/payoutModel.js";
import { sendPayoutEmail } from "../services/emailService.js";
import xenditService from "../services/xenditService.js"; 

/**
 * Create a new payout.
 * @route   POST /api/v1/payout/
 * @param   {Object} req.body - Payout details
 * @returns {Object} 200 - Created payout object
 * @throws  {apiError} 404 - Campaign not found, Not authorized or Bank account not found
 * @throws  {apiError} 500 - Failed to create disbursement
 */
const createPayout = asyncHandler(async (req, res) => {
    const { campaign_id, bank_id, amount } = req.body;
    const user_id = req.user._id;
    
    // 1. Pastikan campaign milik user
    const campaign = await Campaign.findById(campaign_id);
    if (!campaign) throw new apiError(404, "Campaign not found");
    if (String(campaign.creator._id) !== String(user_id)) {
      throw new apiError(404, "Not authorized");
    }
    
    // 2. Ambil bank account tertentu
    const bankAccount = await BankAccount.findOne(
      { owner: user_id, "banks._id": bank_id },
      { "banks.$": 1 } 
    );
    
    if (!bankAccount) {
      throw new apiError(404, "Bank account not found");
    }
    
    const selectedBank = bankAccount.banks[0];
    
    // 3. Panggil API disbursement
    const disbursement = await xenditService.createDisbursement({
      external_id: `payout_${Date.now()}_${campaign_id}`,
      amount,
      bank_code: selectedBank.bankCode,
      account_number: selectedBank.accountNumber,
      account_holder_name: selectedBank.accountHolder,
      description: `Payout for ${campaign.title}`
    });
    

    if (!disbursement.success) {
        throw new apiError(500, "Failed to create disbursement", disbursement.error);
    }

    const payout = await Payout.create({
        campaignID: campaign_id,
        bankAccountID: bank_id,
        amount,
        status: "pending",
        xenditDisbursementID: disbursement.data.id,
        requestTime: new Date()
    });

    return res.status(200).json({
        message: "Payout request created successfully",
        payout
    });
});

/**
 * Get all payouts of a campaign.
 * @route   GET /api/v1/payout/:campaign_id
 * @param   {String} req.params.campaign_id - Campaign ID
 * @returns {Object} 200 - Array of payout objects
 */
const getPayouts = asyncHandler(async (req, res) => {
    const payouts = await Payout.find({campaignID: req.params.campaign_id});
    return res.status(200).json({payouts, message: "Payouts fetched successfully"});
});

/**
 * Handle disbursement webhook from Xendit.
 * @route   POST /api/v1/payout/webhook
 * @param   {Object} req.body - Webhook data from Xendit
 * @returns {Object} 200 - Webhook processed successfully
 */
const handleDisbursementWebhook = asyncHandler(async (req, res) => {
    const signature = req.headers["x-callback-token"];
    if (signature !== process.env.XENDIT_WEBHOOK_TOKEN) {
      return res.status(401).json({ message: "Unauthorized webhook" });
    }
  
    const { id, status, amount } = req.body;
  
    const payout = await Payout.findOne({ xenditDisbursementID: id });
    if (!payout) return res.status(404).json({ message: "Payout not found" });
  
    payout.status = status.toLowerCase();
    payout.completed_at = status === "COMPLETED" ? new Date() : null;
    await payout.save();
  
    // Jika payout selesai → kirim email ke mitra
    if (status === "COMPLETED") {
      const campaign = await Campaign.findById(payout.campaignID).populate("creator");
      if (campaign && campaign.creator) {
        await sendPayoutEmail(
          campaign.creator.email,
          amount,
          campaign.title
        );
        console.log(`📧 Email sent to ${campaign.creator.email}`);
      }
      campaign.payoutAmount += amount;
      campaign.current_amount -= amount;
      await campaign.save();
    }
  
    return res.status(200).json({ message: "Webhook processed" });
});

export {createPayout, getPayouts, handleDisbursementWebhook};


