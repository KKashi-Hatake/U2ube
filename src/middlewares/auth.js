import jwt from "jsonwebtoken";
import apiErrorHandler from "../utils/apiErrorHandler";
import asyncHandler from "../utils/asyncHandler";
import { User } from "../models/user.model";



export default auth = asyncHandler(async (req, _, next) => {
    try {
        const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "")
        if (!token) {
            throw new apiErrorHandler(401, "Unauthorised request")
        }
        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
        const user = await User.findById(decodedToken?._id).select("-password -refreshToken")
        if (!user) {
            throw new apiErrorHandler(401, "Invalid Acess Token")
        }
        req.user = user;
        next()

    } catch (error) {
        throw new apiErrorHandler(401, error?.message || "Invalid Access Token")
    }
})