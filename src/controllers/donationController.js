import { apiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Donation } from "../models/donationModel.js";
import { Campaign } from "../models/campaignModel.js";
import { User } from "../models/userModel.js";
import xenditService from "../services/xenditService.js";
import crypto from "crypto";
import axios from "axios";

// Generate unique donation ID
const generateDonationId = () => {
    return `DON_${Date.now()}_${crypto.randomBytes(6).toString('hex').toUpperCase()}`;
};

/**
 * Create a new donation.
 * @route   POST /api/v1/donation/create
 * @param   {Object} req.body - Donation details
 * @returns {Object} 200 - Created donation object
 * @throws  {apiError} 400 - Invalid input or Campaign is already completed
 * @throws  {apiError} 404 - Campaign not found or Donatur not found
 * @throws  {apiError} 500 - Failed to create payment invoice
 */
const createDonation = asyncHandler(async (req, res) => {
    const { campaign_id, amount, message, payment_method, is_anonymous = false } = req.body;
    const donatur_id = req.user._id;

    // Validation
    if (!campaign_id || !amount || !payment_method) {
        throw new apiError(400, "Campaign ID, amount, and payment method are required");
    }

    if (amount < 1000) {
        throw new apiError(400, "Minimum donation amount is IDR 1,000");
    }

    // Verify campaign exists and is active
    const campaign = await Campaign.findById(campaign_id);
    if (!campaign) {
        throw new apiError(404, "Campaign not found");
    }

    if (campaign.status === 'completed') {
        throw new apiError(400, "Campaign is already completed");
    }

    // Get donatur details
    const donatur = await User.findById(donatur_id);
    if (!donatur) {
        throw new apiError(404, "Donatur not found");
    }

    // Generate unique IDs
    const donation_id = generateDonationId();
    const external_id = `${donation_id}_${campaign_id}`;

    // Create Xendit invoice
    const invoiceData = {
        external_id,
        amount,
        description: `Donation for: ${campaign.title}`,
        customer_name: is_anonymous ? "Anonymous Donatur" : donatur.fullname,
        customer_email: donatur.email,
        payment_methods: [payment_method.toUpperCase()]
    };

    const xenditResponse = await xenditService.createInvoice(invoiceData);
    
    if (!xenditResponse.success) {
        throw new apiError(500, "Failed to create payment invoice");
    }

    const { id: invoice_id, invoice_url, expiry_date } = xenditResponse.data;

    // Create donation record
    const donation = await Donation.create({
        campaign_id,
        donatur_id,
        amount,
        message: message || "",
        donation_id,
        payment_method: payment_method.toLowerCase(),
        xendit_invoice_id: invoice_id,
        xendit_invoice_url: invoice_url,
        xendit_external_id: external_id,
        expires_at: new Date(expiry_date),
        is_anonymous
    });

    return res.status(200).json({
        message: "Donation created successfully",
        donation: {
            donation_id: donation.donation_id,
            campaign_title: campaign.title,
            amount: donation.amount,
            payment_url: donation.xendit_invoice_url,
            expires_at: donation.expires_at,
            payment_status: donation.payment_status
        }
    });
});

/**
 * Handle Xendit webhook. This is called by Xendit when a payment status changes.
 * @route   POST /api/v1/donation/webhook/xendit
 * @param   {Object} req.body - Webhook data from Xendit
 * @returns {Object} 200 - Webhook processed successfully
 * @throws  {apiError} 400 - Invalid webhook token
 * @throws  {apiError} 404 - Donation not found
 */
const handleXenditWebhook = asyncHandler(async (req, res) => {
    console.log('🔔 Webhook received from Xendit:', {
        headers: req.headers,
        body: req.body,
        timestamp: new Date().toISOString()
    });

    const signature = req.headers['x-callback-token'];
    const rawBody = JSON.stringify(req.body);

    // Verify webhook signature
    if (signature !== process.env.XENDIT_WEBHOOK_TOKEN) {
        console.error('❌ Invalid webhook token');
        return res.status(400).json({ message: "Invalid webhook token" });
    }
    console.log('✅ Webhook token verified');

    const webhookData = req.body;
    const processedData = xenditService.processWebhookData(webhookData);

    // Find donation by external_id
    const donation = await Donation.findOne({
        xendit_external_id: processedData.external_id
    }).populate('campaign_id');

    if (!donation) {
        console.log('❌ Donation not found for external_id:', processedData.external_id);
        return res.status(404).json({ message: "Donation not found" });
    }

    // Update donation status
    donation.payment_status = processedData.payment_status;
    donation.webhook_data = processedData.webhook_data;

    if (processedData.payment_status === 'paid') {
        donation.paid_at = processedData.paid_at;
        
        // Update campaign current_amount
        const campaign = await Campaign.findById(donation.campaign_id);
        if (campaign) {
            const oldAmount = campaign.current_amount;
            campaign.current_amount += donation.amount;
            
            console.log(`💰 Campaign funding updated: ${oldAmount} → ${campaign.current_amount}`);
            
            // Check if campaign reached its goal
            if (campaign.current_amount >= campaign.goal_amount) {
                campaign.status = 'completed';
                console.log('🎉 Campaign completed! Goal reached.');
            }
            
            await campaign.save();
        }
    }

    await donation.save();
    console.log(`✅ Donation ${donation.donation_id} status updated to: ${processedData.payment_status}`);

    return res.status(200).json({ 
        message: "Webhook processed successfully",
        donation_status: processedData.payment_status 
    });
});

/**
 * Get donation status.
 * @route   GET /api/v1/donation/status/:donation_id
 * @param   {String} req.params.donation_id - Donation ID
 * @returns {Object} 200 - Donation status object
 * @throws  {apiError} 404 - Donation not found
 */
const getDonationStatus = asyncHandler(async (req, res) => {
    const { donation_id } = req.params;

    const donation = await Donation.findOne({ donation_id })
        .populate('campaign_id', 'title goal_amount current_amount images')
        .populate('donatur_id', 'username fullname');

    if (!donation) {
        throw new apiError(404, "Donation not found");
    }

    // Hide donatur info if anonymous
    const donationData = donation.toObject();
    if (donation.is_anonymous) {
        donationData.donatur_id = {
            username: "anonymous",
            fullname: "Anonymous Donatur"
        };
    }

    return res.status(200).json({
        message: "Donation status retrieved successfully",
        donation: donationData
    });
});

/**
 * Get donatur's donation history.
 * @route   GET /api/v1/donation/history
 * @param   {String} req.user._id - Donatur ID
 * @param   {Object} req.query - Query parameters
 * @param   {String} req.query.status - Donation status
 * @returns {Object} 200 - Donatur's donation history
 */
const getDonaturHistory = asyncHandler(async (req, res) => {
    const donatur_id = req.user._id;
    const { page = 1, limit = 10, status } = req.query;

    const filter = { donatur_id };
    if (status) {
        filter.payment_status = status;
    }

    const donations = await Donation.find(filter)
        .populate('campaign_id', 'title goal_amount current_amount images')
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);

    const total = await Donation.countDocuments(filter);

    return res.status(200).json({
        message: "Donation history retrieved successfully",
        donations,
        pagination: {
            current_page: parseInt(page),
            total_pages: Math.ceil(total / limit),
            total_donations: total,
            per_page: parseInt(limit)
        }
    });
});

/**
 * Get campaign donations (for campaign owner or public view).
 * @route   GET /api/v1/donation/campaign/:campaign_id
 * @param   {String} req.params.campaign_id - Campaign ID
 * @param   {Object} req.query - Query parameters
 * @param   {String} req.query.page - Page number
 * @param   {String} req.query.limit - Number of donations per page
 * @returns {Object} 200 - Campaign donations array
 * @throws  {apiError} 404 - Campaign not found
 */
const getCampaignDonations = asyncHandler(async (req, res) => {
    const { campaign_id } = req.params;
    const { page = 1, limit = 10 } = req.query;

    // Verify campaign exists
    const campaign = await Campaign.findById(campaign_id);
    if (!campaign) {
        throw new apiError(404, "Campaign not found");
    }

    const donations = await Donation.find({ 
        campaign_id, 
        payment_status: 'paid' 
    })
        .populate('donatur_id', 'username fullname')
        .sort({ paid_at: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);

    // Hide donatur info for anonymous donations
    const sanitizedDonations = donations.map(donation => {
        const donationData = donation.toObject();
        if (donation.is_anonymous) {
            donationData.donatur_id = {
                username: "anonymous",
                fullname: "Anonymous Donatur"
            };
        }
        return donationData;
    });

    const total = await Donation.countDocuments({ 
        campaign_id, 
        payment_status: 'paid' 
    });

    return res.status(200).json({
        message: "Campaign donations retrieved successfully",
        donations: sanitizedDonations,
        campaign_title: campaign.title,
        pagination: {
            current_page: parseInt(page),
            total_pages: Math.ceil(total / limit),
            total_donations: total,
            per_page: parseInt(limit)
        }
    });
});

/**
 * Cancel pending donation.
 * @route   POST /api/v1/donation/cancel/:donation_id
 * @param   {String} req.params.donation_id - Donation ID
 * @returns {Object} 200 - Donation cancellation status
 * @throws  {apiError} 404 - Donation not found
 * @throws  {apiError} 400 - Only pending donations can be cancelled
 */
const cancelDonation = asyncHandler(async (req, res) => {
    const { donation_id } = req.params;
    const donatur_id = req.user._id;

    const donation = await Donation.findOne({ 
        donation_id, 
        donatur_id 
    });

    if (!donation) {
        throw new apiError(404, "Donation not found");
    }

    if (donation.payment_status !== 'pending') {
        throw new apiError(400, "Only pending donations can be cancelled");
    }

    console.log("Cancelling invoice:", donation.xendit_invoice_id);
    console.log("Donation data:", {
        donation_id: donation.donation_id,
        xendit_invoice_id: donation.xendit_invoice_id,
        xendit_external_id: donation.xendit_external_id,
        payment_status: donation.payment_status
    });
    console.log("Using API Key:", process.env.XENDIT_SECRET_KEY.slice(0, 6) + "...");

    try {
        // Check if invoice ID format is correct
        const invoiceId = donation.xendit_invoice_id;
        const apiUrl = `https://api.xendit.co/v2/invoices/${invoiceId}/expire!`;
        
        console.log('📞 Calling Xendit API:', apiUrl);
        
        // Panggil API Xendit untuk expire invoice
        const xenditResponse = await axios.post(
          apiUrl,
          {},
          {
            auth: {
              username: process.env.XENDIT_SECRET_KEY,
              password: "",
            },
          }
        );
    
        console.log("Xendit invoice expired:", xenditResponse.data);
    
        // Update database
        donation.payment_status = "cancelled"; // mapping local status
        await donation.save();
    
        return res.status(200).json({
          message: "Donation cancelled successfully",
          donation_id: donation.donation_id,
          xendit_status: xenditResponse.data.status, // biasanya "EXPIRED"
        });
      } catch (error) {
        console.error(
          "Failed to expire invoice in Xendit:",
          error.response?.data || error.message
        );
        console.error("Full error details:", {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          url: error.config?.url
        });
        
        // If invoice not found, it might already be expired/cancelled
        if (error.response?.status === 404) {
          console.log("Invoice not found in Xendit, updating local status anyway");
          donation.payment_status = "cancelled";
          await donation.save();
          
          return res.status(200).json({
            message: "Donation cancelled successfully (invoice already expired)",
            donation_id: donation.donation_id,
            note: "Invoice was already expired or not found in Xendit"
          });
        }
        
        throw new apiError(500, "Failed to cancel donation in Xendit: " + (error.response?.data?.message || error.message));
      }
});

export {
    createDonation,
    handleXenditWebhook,
    getDonationStatus,
    getDonaturHistory,
    getCampaignDonations,
    cancelDonation
}
