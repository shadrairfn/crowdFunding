import { Router } from "express"
import { verifyJWT } from "../middlewares/authMiddleware.js"
import {
    createPayout, 
    getPayouts, 
    handleDisbursementWebhook 
} from "../controllers/payoutController.js"

const router = Router()

router.route("/").post(verifyJWT, createPayout)
router.route("/webhook").post(handleDisbursementWebhook)
router.route("/:campaign_id").get(verifyJWT, getPayouts)

export default router
