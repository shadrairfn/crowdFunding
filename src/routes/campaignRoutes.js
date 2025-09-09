import { Router } from "express"
import {
    createCampaign, 
    getAllCampaigns, 
    getCampaignById 
} from "../controllers/campaignController.js"
import { verifyJWT, mitraOnly } from "../middlewares/authMiddleware.js"
import { upload } from "../middlewares/multer.js"

const router = Router()

router.route("/uploadCampaign").post(verifyJWT, mitraOnly, upload.array("images", 5), createCampaign)
router.route("/campaigns").get(getAllCampaigns)
router.route("/campaigns/:id").get(getCampaignById)

export default router