import { Router } from "express"
import { registerUser, loginUser, getUserProfile, logoutUser } from "../controllers/userController.js"

const router = Router()

router.route("/register").post(registerUser)
router.route("/login").post(loginUser)
router.route("/:username").get(getUserProfile)
router.route("/logout").post(logoutUser)

export default router