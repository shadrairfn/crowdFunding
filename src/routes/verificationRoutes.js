import { Router } from "express"
import { sendOtpEmail, verifyOtpEmail } from "../controllers/verificationController.js"

const router = Router()

router.route("/send-otp").post(sendOtpEmail)
router.route("/verify-otp").post(verifyOtpEmail)

export default router
