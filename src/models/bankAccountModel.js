import mongoose, {Schema} from "mongoose"

const bankAccountSchema = Schema({
    owner : {
        type: Schema.Types.ObjectId,
        ref: "User"
    },
    banks : [
        {
            bankCode : {
                type: String,
                require: true
            },
            accountNumber : {
                type: String,
                require: true
            },
            accountHolder : {
                type: String,
                require: true
            }
        }
    ]
}, {timestamps: true})

export const BankAccount = mongoose.model("BankAccount", bankAccountSchema)