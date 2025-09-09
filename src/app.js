import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser" 
import userRoutes from "./routes/userRoutes.js"
import campaignRoutes from "./routes/campaignRoutes.js"
import donationRoutes from "./routes/donationRoutes.js"
import bankAccountRoutes from "./routes/bankAccountRoutes.js"
import payoutRoutes from "./routes/payoutRoutes.js"

const app = express()

app.use(
    cors({
        origin: "http://localhost:5500",
        credentials: true,
        exposedHeaders: ["Authorization"]
    })
)

app.use(express.json())
app.use(express.urlencoded({extended:true}))
app.use(express.static("public"))

app.use(cookieParser())

// User
app.use("/api/v1/user", userRoutes)

// Campaign
app.use("/api/v1/campaign", campaignRoutes)

// Donation
app.use("/api/v1/donation", donationRoutes)

// Bank Account
app.use("/api/v1/bankAccount", bankAccountRoutes)

// Payout
app.use("/api/v1/payout", payoutRoutes)

export default app