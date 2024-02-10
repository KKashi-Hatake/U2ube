import asyncHandler from '../utils/asyncHandler.js'
import apiErrorHandler from '../utils/apiErrorHandler.js';
import { User } from "../models/user.model.js"
import uploadOnCloudinary from "../utils/cloudinary.js"
import apiResponseHandler from "../utils/apiResponseHandler.js"
import jwt, { decode } from 'jsonwebtoken'
import mongoose from 'mongoose';


const generateAccessAndRefreshToken = async (userId) => {
    try {
        const user = await User.findById(userId)
        const accessToken = await user.generateAccessToken()
        const refreshToken = await user.generateRefreshToken()
        await user.save({ validateBeforeSave: false })
        return { accessToken, refreshToken }
    } catch (error) {
        throw new apiErrorHandler(500, "Something went wrong while generating access and refresh token.")
    }
}


export const registerUser = asyncHandler(async (req, res) => {
    const { username, fullName, email, password } = req.body;
    if ([username, fullName, email, password].some(field => field?.trim() === "")) {
        throw new apiErrorHandler(400, "All fields are mandatory.")
    }
    if (!email.includes("@")) {
        throw new apiErrorHandler(400, "Email is not valid")
    }
    const existedUser = await User.findOne({
        $or: [{ username }, { email }]
    })
    if (existedUser) {
        throw new apiErrorHandler(409, "User with email or username is already exists.")
    }
    const avatarLocalPath = req.files?.avatar[0]?.path;
    let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path;
    }
    if (!avatarLocalPath) {
        throw new apiErrorHandler(400, "Avatar is required.")
    }
    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)
    if (!avatar) {
        throw new apiErrorHandler(500, "Avatar image is not uploaded successfully.")
    }

    const user = await User.create({
        username: username.toLowerCase(),
        fullName,
        email,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        password
    })

    const createdUser = await User.findById(user._id).select("-password -refreshToken")
    if (!createdUser) {
        throw new apiErrorHandler(500, "Something went wrong while creating the user.")
    }

    return res.status(201).json(
        new apiResponseHandler(200, "user Registered Successfully.", createdUser)

    )
})

export const loginUser = asyncHandler(async (req, res) => {
    const { username, email, password } = req.body;
    if (!(username || email)) {
        throw new apiErrorHandler(400, "username or email is required.")
    }
    const user = await User.findOne({
        $or: [{ username }, { email }]
    })
    if (!user) {
        throw new apiErrorHandler(404, "User does not exists.")
    }
    const isPasswordValid = await user.isPasswordCorrect(password);
    if (!isPasswordValid) {
        throw new apiErrorHandler(401, "Invalid User Credentials.")
    }
    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id);
    const options = {
        httpOnly: true,
        secure: true
    }
    delete (user.password)
    res
        .status(200)
        .cookie("accessToken", accessToken)
        .cookie("refreshToken", refreshToken)
        .json(
            new apiResponseHandler(
                201,
                "Logged in successfully",
                user
            )
        )


})

export const logoutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $unset: { refreshToken: 1 }
        },
        {
            new: true
        }
    )
    const options = {
        httpOnly: true,
        secure: true
    }
    res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new apiResponseHandler(200, "User logged out"))

})

export const refreshAccessToken = asyncHandler(async (req, res) => {
    try {
        const incomingRfreshToken = req.cookie?.refreshToken || req.body?.refreshToken;
        if (!incomingRfreshToken) {
            throw new apiErrorHandler(401, "Unauthorized Token")
        }
        const decodedToken = jwt.verify(incomingRfreshToken, process.env.REFRESH_TOKEN_SECRET)
        if (!decodedToken) {
            throw new apiErrorHandler(401, "Invalid Refresh Token")
        }
        const user = await User.findById(decodedToken?._id);
        if (!user) {
            throw new apiErrorHandler(401, "Invalid Refresh Token")
        }
        if (incomingRfreshToken !== user?.refreshToken) {
            throw new apiErrorHandler(401, "Refresh Token is used or expired")
        }
        const options = {
            httpOnly: true,
            secure: true
        }
        const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id)
        res.status(200)
            .cookie("refreshToken", refreshToken)
            .cookie("accessToken", accessToken)
            .json(
                new apiResponseHandler(
                    200,
                    "Access Token is refreshed",
                    { accessToken, refreshToken }
                )
            )

    } catch (error) {
        throw new apiErrorHandler(401, "Refresh Token Invalid")
    }
})


export const getChannelDetails = asyncHandler(async (req, res) => {
    const { username } = req.params;
    if (!username?.trim()) {
        throw new apiErrorHandler(400, "username is missing.")
    }
    const channel = await User.aggregate([
        {
            $match: { username: username?.toLowerCase() }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers"
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo"
            }
        },
        {
            $addFields: {
                subscribersCount: {
                    $size: "$subscribers"
                },
                subscribedToCount: {
                    $size: "$subscribedTo"
                },
                isSubscribed: {
                    $cond: {
                        if: { $in: [req.user?._id, "$subscribers.subscriber"] },
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $project: {
                fullName: 1,
                username: 1,
                email: 1,
                avatar: 1,
                coverImage: 1,
                subscribedToCount: 1,
                subscribersCount: 1,
                isSubscribed: 1
            }
        }
    ])
    if (!channel?.length) {
        throw new apiErrorHandler(404, "Channel does not exists")
    }
    res
        .status(200)
        .json(
            new apiResponseHandler(200, "User found", channel)
        )




})


export const getWatchHistory = asyncHandler(async (req, res) => {
    const user = await User.aggregate([
        {
            $match: {
                _id: mongoose.Types.ObjectId(req.user?._id)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline: [
                                {
                                    $project: {
                                        fullName: 1,
                                        username: 1,
                                        avatar: 1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields: {
                            owner: {
                                $first: "$owner"
                            }
                        }
                    }
                ]
            }
        }
    ])
    res
        .status(200)
        .json(
            new apiResponseHandler(200, "Watch History Fetched.", user)
        )
})

export const changeCurrentPassword = asyncHandler(async (req, res) => {
    const { originalPassword, newPassword } = req.body;
    if (!(originalPassword && newPassword)) {
        throw new apiErrorHandler(400, "all fields are required.")
    }
    const user = await User.findById(req.user?._id);
    const isPasswordValid = await user.isPasswordCorrect(oldPassword);
    if (!isPasswordValid) {
        throw new apiErrorHandler(400, "Old password is not correct.")
    }
    user.password = newPassword;
    await user.save({ validateBeforeSave: false })
    res.status(200)
        .json(
            new apiResponseHandler(200, "Password changed successfully", {})
        )

})

export const getCurrentUser = asyncHandler(async (req, res) => {
    res
        .status(200)
        .json(
            new apiResponseHandler(200, "Current User", req.user)
        )
})

export const updateAccountDetails = asyncHandler(async (req, res) => {
    const { fullName, email } = req.body;
    if (!(fullName && email)) {
        throw new apiErrorHandler(400, "Fullname or email is missing")
    }
    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                fullName,
                email
            }
        },
        {
            new:true
        }
    ).select("-password -refreshToken")

        res
        .status(200)
        .json(
            new apiResponseHandler(200,"Account details are updated successfuly.", user)
        )

})

export const updateAvatar = asyncHandler(async(req,res)=>{
    const avatarLocalPath = req?.file?.path;
    if (!avatarLocalPath) {
        throw new apiErrorHandler(400, "Avatar File is required")
    }
    const avatar = await uploadOnCloudinary(avatarLocalPath)
    if(!avatar){
        throw new apiErrorHandler(500, "Something went wrong while uploading avatar on cloudinary")
    }
    const user =await User.findByIdAndUpdate(req.user?._id,{
        $set:{
            avatar:avatar?.url
        }
    },{
        new:true
    }).select("-password -refreshToken")

    res
    .status(200)
    .json(
        new apiResponseHandler(200, "avatar updated", user)
    )

})


export const updateCoverImage = asyncHandler(async(req,res)=>{
    const coverImageLocalPath = req?.file?.path;
    if (!coverImageLocalPath) {
        throw new apiErrorHandler(400, "Cover Image File is required")
    }
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)
    if(!coverImage){
        throw new apiErrorHandler(500, "Something went wrong while uploading avatar on cloudinary")
    }
    const user =await User.findByIdAndUpdate(req.user?._id,{
        $set:{
            coverImage:avcoverImageatar?.url
        }
    },{
        new:true
    }).select("-password -refreshToken")

    res
    .status(200)
    .json(
        new apiResponseHandler(200, "Cover Image updated", user)
    )

})