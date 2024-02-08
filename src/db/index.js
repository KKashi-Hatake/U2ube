import mongoose from "mongoose";
import {DB_NAME} from "../constants.js"


async function connectDB(){
    try {
        const connectionInstance = await mongoose.connect(`${process.env.MONGO_URL}/${DB_NAME}`)
        console.log("MongoDB Connected DB Host: ",connectionInstance.connection.host);
    } catch (error) {
        console.error("ERROR from connectDB: ", error)
        process.exit(1)
    }
}

export default connectDB