import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser" 
import userRoutes from "./routes/userRoutes.js"

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
export default app