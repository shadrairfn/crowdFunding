import mongoose from "mongoose"

const connectDB = async () => {
    try {
        const connectionInstance = await mongoose.connect(`${process.env.DB_URL}/${process.env.DB_NAME}?retryWrites=true&w=majority`)

        console.log(`\nMongoDB Connected ! DB host: ${connectionInstance.connection.host}`)
    
    } catch (error) {
        console.log(`MongoDB Connection Error ${error}`);
    
        process.exit(1)
    }
}

export default connectDB