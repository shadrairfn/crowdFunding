import { Router } from "express"
import { verifyJWT } from "../middlewares/authMiddleware.js"
import {
    createBankAccount, 
    getBankAccounts, 
    addBankAccount 
} from "../controllers/bankAccountController.js"

const router = Router()

router.route("/createBankAccount").post(verifyJWT, createBankAccount)
router.route("/addBankAccount").post(verifyJWT, addBankAccount)
router.route("/").get(verifyJWT, getBankAccounts)

export default router