import jwt from "jsonwebtoken";
import { User } from "../models/userModel.js";

/**
 * Verify JWT token from Authorization header.
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const verifyJWT = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  console.log("Auth Header:", authHeader);

  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Unauthorized: No token provided" });
  }

  const token = authHeader.split(" ")[1];
  console.log("Token:", token);

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("Decoded Token:", decoded);

    if (!decoded?.userID) {
      return res.status(401).json({ message: "Unauthorized: Invalid token payload" });
    }

    const user = await User.findById(decoded.userID).select("-password");
    console.log("User from DB:", user);

    if (!user) {
      return res.status(401).json({ message: "Unauthorized: User not found" });
    }

    req.user = user;
    next();
  } catch (err) {
    console.error("JWT Error:", err.message);
    return res.status(401).json({ message: "Unauthorized: Token verification failed" });
  }
};

/**
 * Middleware to check if user is mitra.
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const mitraOnly = (req, res, next) => {
  if (req.user && req.user.role === "mitra") {
    next();
  } else {
    return res.status(403).json({ message: "Access denied, mitra only" });
  }
};

/**
 * Middleware to check if user is donatur.
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const donaturOnly = (req, res, next) => {
  if (req.user && req.user.role === "donatur") {
    next();
  } else {
    return res.status(403).json({ message: "Access denied, donatur only" });
  }
};

export { verifyJWT, mitraOnly, donaturOnly };
