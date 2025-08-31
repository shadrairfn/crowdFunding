import { Router } from "express"
import { createCampaign, getAllCampaigns } from "../controllers/campaignController.js"
import { verifyJWT, mitraOnly } from "../middlewares/authMiddleware.js"
import { upload } from "../middlewares/multer.js"

const router = Router()

router.route("/uploadCampaign").post(verifyJWT, mitraOnly, upload.array("images", 5), createCampaign)
router.route("/campaigns").get(getAllCampaigns)

export default router