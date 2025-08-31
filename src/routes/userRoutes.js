import { Router } from "express"
import { 
    initiateRegistration, 
    completeRegistration, 
    resendRegistrationOTP, 
    loginUser, 
    getUserProfile, 
    logoutUser 
} from "../controllers/userController.js"

const router = Router()

// Registration routes
router.route("/register/initiate").post(initiateRegistration)
router.route("/register/verify").post(completeRegistration)
router.route("/register/resend-otp").post(resendRegistrationOTP)

// Other user routes
router.route("/login").post(loginUser)
router.route("/:username").get(getUserProfile)
router.route("/logout").post(logoutUser)

export default router