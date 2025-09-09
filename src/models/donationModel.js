import mongoose, { Schema } from "mongoose"

const donationSchema = new Schema({
    campaign_id: {
        type: Schema.Types.ObjectId,
        ref: "Campaign",
        required: true
    },
    donatur_id: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    amount: {
        type: Number,
        required: true,
        min: 1000 // Minimum donation 1000 IDR
    },
    message: {
        type: String,
        trim: true,
        maxLength: 500
    },
    donation_id: {
        type: String,
        required: true,
        unique: true
    },
    payment_method: {
        type: String,
        enum: ['qris'], // qris only
        required: true
    },
    payment_status: {
        type: String,
        enum: ['pending', 'paid', 'expired', 'cancelled', 'failed'],
        default: 'pending'
    },
    xendit_invoice_id: {
        type: String,
        required: true
    },
    xendit_invoice_url: {
        type: String,
        required: true
    },
    xendit_external_id: {
        type: String,
        required: true
    },
    paid_at: {
        type: Date
    },
    expires_at: {
        type: Date,
        required: true
    },
    webhook_data: {
        type: Object // Store Xendit webhook response
    },
    is_anonymous: {
        type: Boolean,
        default: false
    }
}, { timestamps: true })

// Indexes for better query performance
donationSchema.index({ donation_id: 1 })
donationSchema.index({ xendit_invoice_id: 1 })
donationSchema.index({ xendit_external_id: 1 })
donationSchema.index({ campaign_id: 1, payment_status: 1 })
donationSchema.index({ donatur_id: 1, payment_status: 1 })

export const Donation = mongoose.model("Donation", donationSchema)
