import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser" 
import userRoutes from "./routes/userRoutes.js"
import verificationRoutes from "./routes/verificationRoutes.js"

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

// Verification
app.use("/api/v1/verification", verificationRoutes)

export default app