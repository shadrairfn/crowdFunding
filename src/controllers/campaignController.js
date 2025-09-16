import { apiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Campaign } from "../models/campaignModel.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js";

/**
 * Create a new campaign.
 * @route   POST /api/v1/campaign/uploadCampaign
 * @param   {Object} req.body - Campaign details
 * @param   {Array} req.files - Campaign images
 * @returns {Object} 200 - Created campaign object
 * @throws  {apiError} 400 - Invalid input
 */
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

    return res.status(200).json({
        message: "Campaign created successfully",
        campaign
    });
})

/**
 * Get all campaigns.
 * @route   GET /api/v1/campaign/campaigns
 * @returns {Object} 200 - Array of campaign objects
 */
const getAllCampaigns = asyncHandler(async (req, res) => {
    const campaigns = await Campaign.find().populate("creator", "username email fullname");
    
    // Sort by closest to goal amount (highest percentage completion first)
    const sortedCampaigns = campaigns.sort((a, b) => {
        const percentageA = (a.current_amount / a.goal_amount) * 100;
        const percentageB = (b.current_amount / b.goal_amount) * 100;
        return percentageB - percentageA;
    });
    
    // Add completion percentage to each campaign
    const campaignsWithPercentage = sortedCampaigns.map(campaign => ({
        ...campaign.toObject(),
        completion_percentage: Math.round((campaign.current_amount / campaign.goal_amount) * 100),
        remaining_amount: campaign.goal_amount - campaign.current_amount
    }));
    
    return res.status(200).json({
        campaigns: campaignsWithPercentage,
        message: "Campaigns sorted by closest to goal amount"
    });
})

/**
 * Get a single campaign by ID.
 * @route   GET /api/v1/campaign/campaigns/:id
 * @param   {String} req.params.id - Campaign ID
 * @returns {Object} 200 - Campaign object
 * @throws  {apiError} 404 - Campaign not found
 */
const getCampaignById = asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    const campaign = await Campaign.findById(id).populate("creator", "username email fullname");
    if (!campaign) {
        throw new apiError(404, "Campaign not found");
    }
    
    const campaignWithDetails = {
        ...campaign.toObject(),
        completion_percentage: Math.round((campaign.current_amount / campaign.goal_amount) * 100),
        remaining_amount: campaign.goal_amount - campaign.current_amount
    };
    
    return res.status(200).json({
        campaign: campaignWithDetails,
        message: "Campaign retrieved successfully"
    });
})

/** * Update a campaign by ID.
 * @route   PUT /api/v1/campaign/campaigns/:id
 * @param   {String} req.params.id - Campaign ID
 * @param   {Object} req.body - Updated campaign details
 * @returns {Object} 200 - Updated campaign object
 * @throws  {apiError} 404 - Campaign not found
 */
// Placeholder for updateCampaign function
const updateCampaign = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { descriptionUpdate, images } = req.body;

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

    const campaign = await Campaign.findById(id)
    if (!campaign) {
        throw new apiError(404, "Campaign not found");
    }

    campaign.descriptionUpdate = descriptionUpdate;
    campaign.images = imageLinks;
    await campaign.save();

    return res.status(200).json({
        message: "Campaign update successfully",
        campaign
    })
})

export {
    createCampaign,
    getAllCampaigns,
    getCampaignById,
    updateCampaign
}