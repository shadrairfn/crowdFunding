import mongoose, {Schema} from "mongoose"
import bcrypt from "bcrypt"
import jwt from "jsonwebtoken"

const userSchema = new Schema(
    {
        username: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
            index: true
        },
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true
        },
        fullname: {
            type: String,
            required: true,
            trim: true,
            index: true
        },
        description: {
            type: String,
            trim: true,
            default: "No description"
        },
        avatar: {
            type: String
        },
        password: {
            type: String,
            required: [true, "password is required"]
        },
        phone : {
            type: String,
            required: true
        },
        role : {
            type: String,
            required: true,
            enum: ['mitra', 'donatur']
        },
        bank_account: {
            bank_code: {type: String},
            account_number: {type: String},
            account_name: {type: String}
        },
        refreshToken: {
            type: String
        },
        verification : {
            type: Boolean,
            default: false
        },
        otp: {
            type: String
        },
        otpExpiry: {
            type: Date
        }
    },
    { timestamps: true}
)

userSchema.pre("save", async function (next) {
    if (!this.isModified("password")) return next() 

    this.password = await bcrypt.hash(this.password, 10)
    next()
})

userSchema.methods.isPasswordCorrect = async function(password) {
    return await bcrypt.compare(password, this.password)
}
 
userSchema.methods.generateAccessToken = function() {
    // Ada masa expired untuk tiap token
    return jwt.sign({
        userID: this._id,
        email: this.email,
        username: this.username
        }, 
        process.env.JWT_SECRET,
        { expiresIn: process.env.ACCESS_TOKEN_EXPIRED }
    );
}

userSchema.methods.generateRefreshToken = function() {
    // Ada masa expired untuk tiap token
    return jwt.sign({
        userID: this._id
        }, 
        process.env.REFRESH_TOKEN_SECRET,
        { expiresIn: process.env.REFRESH_TOKEN_EXPIRED }
    );
}

export const User = mongoose.model("User", userSchema)