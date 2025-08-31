import { apiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Campaign } from "../models/campaignModel.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js";

const createCampaign = asyncHandler(async (req, res) => {
    const {title, description, goal_amount, location, images, event_date} = req.body;

    if ([title, description, goal_amount, location, images, event_date].some((field) => field?.trim() === "")) {
        throw new apiError(400, "All fields are required");
    }

    const imageFiles = req.files;
    if (!imageFiles || imageFiles.length === 0) {
        throw new apiError(400, "At least one image is required");
    }

    // Get image paths
    const imageLocalPaths = imageFiles.map(file => file.path);

    // Upload to cloudinary
    const imageLinks = [];
    for (const path of imageLocalPaths) {
        const result = await uploadOnCloudinary(path);
        imageLinks.push(result.url);
    }

    const campaign = await Campaign.create({
        title, 
        description, 
        goal_amount, 
        location, 
        images: imageLinks, 
        event_date, 
        creator: req.user._id
    });

    return res.status(201).json({
        message: "Campaign created successfully",
        campaign
    });
})

const getAllCampaigns = asyncHandler(async (req, res) => {
    const campaigns = await Campaign.find().populate("creator");
    
    // Sort by closest to goal amount
    const sortedCampaigns = campaigns.sort((a, b) => {
        const percentageA = (a.current_amount / a.goal_amount) * 100;
        const percentageB = (b.current_amount / b.goal_amount) * 100;
        return percentageB - percentageA; // Descending order 
    });
    
    return res.status(200).json({
        campaigns: sortedCampaigns,
        message: "Campaigns sorted by closest to goal amount"
    });
})

export {
    createCampaign,
    getAllCampaigns
}