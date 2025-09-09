import { apiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/userModel.js"
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";

// setup nodemailer
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

/**
 * Generate a 6-digit OTP code as string
 * @returns {string} OTP (One-Time Password)
 */
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Generate access and refresh tokens for user
 * @param {string} userId - User ID
 * @returns {Object} Object containing new access and refresh tokens
 */
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

/**
 * Initiate user registration by creating temporary user
 * and sending OTP email for verification.
 * 
 * @route   POST /api/v1/user/register/initiate
 * @param   {string} fullname - Full name of the user
 * @param   {string} username - Unique username
 * @param   {string} email - Email address
 * @param   {string} password - Plain password
 * @param   {string} phone - User phone number
 * @param   {string} role - User role ("donor" / "mitra")
 * @returns {Object} 200 - Success message and userId
 * @throws  {apiError} 400 - Missing or invalid fields
 * @throws  {apiError} 409 - Duplicate email/username
 */
const initiateRegistration = asyncHandler(async (req, res) => {
    const {fullname, username, email, password, phone, role} = req.body

    // validation
    if (
        [fullname, username, email, password, phone, role].some((field) => field?.trim() === "") 
    ) {
        throw new apiError(400, "All fields are required")
    }
    
    const existedUser = await User.findOne({
        $or: [{email}]
    })

    if (existedUser) {
        throw new apiError(400, "Email already exist")
    }

    // Create temporary user with unverified status
    const tempUser = await User.create({
        fullname,
        email,
        password,
        username: username.toLowerCase(),
        phone,
        role,
        verification: false
    })

    // Generate OTP
    const otp = generateOTP();
    const expiry = Date.now() + 5 * 60 * 1000;

    tempUser.otp = otp;
    tempUser.otpExpiry = expiry;
    await tempUser.save();

    // Send OTP email
    await transporter.sendMail({
        from: `"CrowdFunding App" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: "Verify Your Registration - OTP Code",
        text: `Your OTP code is ${otp}. Valid for 5 minutes.`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2>Welcome to CrowdFunding!</h2>
                <p>Your OTP verification code is:</p>
                <div style="background-color: #f0f0f0; padding: 20px; text-align: center; font-size: 24px; font-weight: bold; margin: 20px 0;">
                    ${otp}
                </div>
                <p>This code will expire in 5 minutes.</p>
                <p>If you didn't request this, please ignore this email.</p>
            </div>
        `
    });

    return res
        .status(200)
        .json({
            message: "OTP sent to your email. Please verify to complete registration.",
            userId: tempUser._id,
            email: tempUser.email
        })
})

/**
 * Complete user registration by verifying OTP and updating user status.
 * @route   POST /api/v1/user/register/verify
 * @param   {string} email - User email
 * @param   {string} otp - OTP code received via email
 * @returns {Object} 200 - Created user object
 * @throws  {apiError} 400 - Missing email or OTP, Invalid OTP, User already verified
 * @throws  {apiError} 404 - User not found
 */
const completeRegistration = asyncHandler(async (req, res) => {
    const { email, otp } = req.body;

    if (!email || !otp) {
        throw new apiError(400, "Email and OTP are required");
    }

    const user = await User.findOne({ email });
    if (!user) {
        throw new apiError(404, "User not found");
    }

    if (user.verification) {
        throw new apiError(400, "User already verified");
    }

    if (user.otp !== otp) {
        throw new apiError(400, "Invalid OTP");
    }

    if (Date.now() > user.otpExpiry) {
        throw new apiError(400, "OTP has expired. Please request a new one.");
    }

    // Complete registration
    user.verification = true;
    user.otp = undefined;
    user.otpExpiry = undefined;
    await user.save();

    const verifiedUser = await User.findById(user._id).select(
        "-password -refreshToken -otp -otpExpiry"
    )

    return res
        .status(200)
        .json({
            message: "Registration completed successfully!",
            user: {
                id: verifiedUser._id,
                email: verifiedUser.email,
                username: verifiedUser.username,
                fullname: verifiedUser.fullname,
                verification: verifiedUser.verification
            }
        })
})

/**
 * Resend OTP for user registration.
 * @route   POST /api/v1/user/register/resend-otp
 * @param   {string} email - User email
 * @returns {Object} 200 - Success message
 * @throws  {apiError} 400 - Missing email or User already verified
 * @throws  {apiError} 404 - User not found
 */
const resendRegistrationOTP = asyncHandler(async (req, res) => {
    const { email } = req.body;

    if (!email) {
        throw new apiError(400, "Email is required");
    }

    const user = await User.findOne({ email });
    if (!user) {
        throw new apiError(404, "User not found");
    }

    if (user.verification) {
        throw new apiError(400, "User already verified");
    }

    // Generate new OTP
    const otp = generateOTP();
    const expiry = Date.now() + 5 * 60 * 1000;

    user.otp = otp;
    user.otpExpiry = expiry;
    await user.save();

    // Send new OTP email
    await transporter.sendMail({
        from: `"CrowdFunding App" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: "New OTP Code - Complete Your Registration",
        text: `Your new OTP code is ${otp}. Valid for 5 minutes.`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2>New OTP Code</h2>
                <p>Your new OTP verification code is:</p>
                <div style="background-color: #f0f0f0; padding: 20px; text-align: center; font-size: 24px; font-weight: bold; margin: 20px 0;">
                    ${otp}
                </div>
                <p>This code will expire in 5 minutes.</p>
            </div>
        `
    });

    return res
        .status(200)
        .json({
            message: "New OTP sent to your email"
        })
})

/**
 * Login user and generate access and refresh tokens.
 * @route   POST /api/v1/user/login
 * @param   {string} email - User email
 * @param   {string} password - User password
 * @returns {Object} 200 - Access token and user object
 * @throws  {apiError} 400 - Missing email or password, Password incorrect, User not verified
 * @throws  {apiError} 404 - User not found
 */
const loginUser = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    if ([email, password].some((field) => field?.trim() == "")) {
        throw new apiError(400, "All fields are required");
    }

    const user = await User.findOne({ email });
    if (!user) {
        throw new apiError(404, "User can't be found");
    }

    if (!user.verification) {
        throw new apiError(400, "Please verify your email before logging in");
    }

    const isPasswordMatched = await bcrypt.compare(password, user.password);
    if (!isPasswordMatched) {
        throw new apiError(400, "Password incorrect");
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
            fullname: user.fullname,
            verification: user.verification
        },
    });
});

/**
 * Logout user and clear refresh token cookie.
 * @route   POST /api/v1/user/logout
 * @returns {Object} 200 - Success message
 */
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

/**
 * Get user profile.
 * @route   GET /api/v1/user/:username
 * @param   {string} username - User username
 * @returns {Object} 200 - User object
 * @throws  {apiError} 404 - User not found
 */
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

/**
 * Refresh access token using refresh token from cookie.
 * @route   POST /api/v1/user/refresh-token
 * @returns {Object} 200 - New access token
 * @throws  {apiError} 400 - Refresh token missing
 */
const accessRefreshToken = asyncHandler (async (req, res) => {
    console.log(req.cookies);
    
    const tokenFromCookie = req.cookies.refreshToken

    if (!tokenFromCookie) {
        throw new apiError(400, "Refresh token missing")
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
    initiateRegistration,
    completeRegistration,
    resendRegistrationOTP,
    loginUser,
    getUserProfile,
    accessRefreshToken,
    logoutUser
}