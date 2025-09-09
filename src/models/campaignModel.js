import mongoose, {Schema} from "mongoose"

const campaignSchema = new Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        required: true,
        trim: true
    }, 
    goal_amount: {
        type: Number,
        required: true
    },
    location: {
        type: String,
        required: true
    },
    images: {
        type: [String], required: true
    },
    creator: {
        type: Schema.Types.ObjectId,
        ref: "User"
    },
    current_amount: {
        type: Number,
        default: 0
    },
    event_date: {
        type: Date,
        required: true
    },
    status: {
        type: String,
        enum: ['fundraising', 'ongoing', 'completed'],
        default: 'fundraising'
    },
    payoutAmount : {
        type: Number,
        default: 0
    }
}, {timestamps: true})

export const Campaign = mongoose.model("Campaign", campaignSchema)