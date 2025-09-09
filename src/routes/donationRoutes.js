import { Router } from "express"
import { 
    createDonation,
    handleXenditWebhook,
    getDonationStatus,
    getDonaturHistory,
    getCampaignDonations,
    cancelDonation
} from "../controllers/donationController.js"
import { verifyJWT, donaturOnly } from "../middlewares/authMiddleware.js"

const router = Router()

// Donation routes (protected for donatur role)
router.route("/create").post(verifyJWT, donaturOnly, createDonation)
router.route("/status/:donation_id").get(verifyJWT, getDonationStatus)
router.route("/history").get(verifyJWT, donaturOnly, getDonaturHistory)
router.route("/cancel/:donation_id").post(verifyJWT, donaturOnly, cancelDonation)

// Public routes
router.route("/campaign/:campaign_id").get(getCampaignDonations)

// Webhook route (no authentication needed)
router.route("/webhook/xendit").post(handleXenditWebhook)

export default router