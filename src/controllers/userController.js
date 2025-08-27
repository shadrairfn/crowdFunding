import { apiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/userModel.js"
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const generateAndAccessToken = async (userId) => {
    try {
        const user = await User.findById(userId)

        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave: false })

        return { accessToken, refreshToken }
    } catch (error) {
        console.log(`Error generating tokens: ${error}`)
        throw new apiError(500, "Failed to generate tokens")
    }
}

const registerUser = asyncHandler(async (req, res) => {
    const {fullname, username, email, password, phone, role} = req.body

    // validation
    if (
        [fullname, username, email, password, phone, role].some((field) => field?.trim() === "") 
    ) {
        throw new apiError(400, "All fields are required")
    }
    
    const existedUser = await User.findOne({
        $or: [{username},{email}]
    })

    if (existedUser) {
        throw new apiError(409, "username or email already exist")
    }

    const user = await User.create({
        fullname,
        email,
        password,
        username: username.toLowerCase(),
        phone,
        role
    })

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if (!createdUser) {
        throw new apiError(500, "Something went wrong when creating user")
    }

    return res
        .status(201)
        .json({
            message: "Registration Successfully",
            user: {
                id: user._id,
                email: user.email,
                username: user.username,
            }
        })
})

const loginUser = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    if ([email, password].some((field) => field?.trim() == "")) {
        throw new apiError(400, "All fields are required");
    }

    const user = await User.findOne({ email });
    if (!user) {
        throw new apiError(404, "User can't be found");
    }

    const isPasswordMatched = await bcrypt.compare(password, user.password);
    if (!isPasswordMatched) {
        throw new apiError(401, "Password incorrect");
    }

    const { accessToken, refreshToken } = await generateAndAccessToken(user._id)

    res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production", 
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000
    });


    res.status(200).json({
        message: "Login Successfully",
        accessToken,
        user: {
            id: user._id,
            email: user.email,
            username: user.username,
            fullname: user.fullname
        },
    });
});

const logoutUser = asyncHandler(async (req, res) => {
    console.log("request cookies:", req.cookies);
    
    const tokenFromCookie = req.cookies.refreshToken;
    if (!tokenFromCookie) {
        return res.status(200).json({ message: "Logout successful" });
    }

    try {
        const decoded = jwt.verify(tokenFromCookie, process.env.REFRESH_TOKEN_SECRET);
        console.log("Decoded refresh token:", decoded);

        const user = await User.findById(decoded.userID);

        if (user) {
            user.set("refreshToken", null);
            user.markModified("refreshToken"); 
            await user.save({ validateBeforeSave: false });
            console.log("Refresh token removed!");
        } else {
            console.log("user tidak ditemukan");
        }

        res.clearCookie("refreshToken", {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
        });

        res.status(200).json({ message: `Logout successful + ${user}`});
    } catch (err) {
        console.log("JWT verify failed:", err);
        res.clearCookie("refreshToken");
        return res.status(200).json({ message: "Logout handled gracefully" });
    }
});

const getUserProfile = asyncHandler(async (req, res) => {
    const { username } = req.params;
    const user = await User.findOne({ username }).select("-password -refreshToken");
    if (!user) {
        throw new apiError(404, "User not found");
    }
    res.status(200).json({
        message: "User profile fetched successfully",
        success: true,
        user
    });
});

const accessRefreshToken = asyncHandler (async (req, res) => {
    console.log(req.cookies);
    
    const tokenFromCookie = req.cookies.refreshToken

    if (!tokenFromCookie) {
        throw new apiError(401, "Refresh token missing")
    }

    try {
        const decoded = jwt.verify(tokenFromCookie, process.env.REFRESH_TOKEN_SECRET)

        const user = await User.findById(decoded.userID)
        if (!user || user.refreshToken !== tokenFromCookie) {
            throw new apiError(403, "Invalid Refresh Token")
        }

        const newAccessToken = user.generateAccessToken()
        const newRefreshToken = user.generateRefreshToken()

        user.refreshToken = newRefreshToken
        await user.save({validateBeforeSave: false})

        res.cookie("refreshToken", newRefreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        console.log("Sending new accessToken:", newAccessToken);
        res.status(200).json({ accessToken: newAccessToken})
    } catch (error) {
        console.log(error);
        throw new apiError(403, "Invalid or expired refresh token");
    }
})

export {
    registerUser,
    loginUser,
    getUserProfile,
    accessRefreshToken,
    logoutUser
}