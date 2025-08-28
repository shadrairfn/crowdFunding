import { apiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/userModel.js"
import nodemailer from "nodemailer";
import crypto from "crypto";

// setup nodemailer
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// generate OTP
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

const sendOtpEmail = asyncHandler(async (req, res, next) => {
  const { email } = req.body;

  const user = await User.findOne({ email });
  if (!user) {
    throw new apiError(404, "User tidak ditemukan");
  }

  const otp = generateOTP();
  const expiry = Date.now() + 5 * 60 * 1000;

  user.otp = otp;
  user.otpExpiry = expiry;
  await user.save();

  await transporter.sendMail({
    from: `"MyApp" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "Kode OTP Verifikasi",
    text: `Kode OTP Anda adalah ${otp}. Berlaku selama 5 menit.`,
    html: `<p>Kode OTP Anda adalah <b>${otp}</b><br>Berlaku 5 menit.</p>`
  });

  res.json({ success: true, message: "OTP terkirim ke email Anda" });
});

const verifyOtpEmail = asyncHandler(async (req, res, next) => {
  const { email, otp } = req.body;

  const user = await User.findOne({ email });
  if (!user) {
    throw new apiError(404, "User tidak ditemukan");
  }

  if (user.otp !== otp) {
    throw new apiError(400, "OTP salah");
  }

  if (Date.now() > user.otpExpiry) {
    throw new apiError(400, "OTP kadaluarsa");
  }

  user.verification = true;
  user.otp = undefined;
  user.otpExpiry = undefined;
  await user.save();

  res.json({ success: true, message: "Email berhasil diverifikasi!" });
});

export {
    sendOtpEmail,
    verifyOtpEmail
}