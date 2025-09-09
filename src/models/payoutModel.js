import mongoose, {Schema} from "mongoose"

const payoutSchema = new Schema({
    campaignID: {
        type: Schema.Types.ObjectId,
        ref: "Campaign"
    },
    bankAccountID: {
        type: Schema.Types.ObjectId,
        ref: "BankAccount"
    },
    amount: {
        type: Number,
        require: true
    },
    status: {
        type: String,
        enum: ["pending", "processing", "completed", "failed"],
        default: "pending"
    },
    xenditDisbursementID: {
        type: String
    },
    requestTime: {
        type: Date,
        default: Date.now
    },
    completedTime: {
        type: Date
    }
}, {timestamps: true})

export const Payout = mongoose.model("Payout", payoutSchema)