import asyncHandler from '../utils/asyncHandler.js'
import apiErrorHandler from '../utils/apiErrorHandler.js';
import { User } from "../models/user.model.js"
import uploadOnCloudinary from "../utils/cloudinary.js"
import apiResponseHandler from "../utils/apiResponseHandler.js"


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
    if (!username || !email) {
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
    const {accessToken, refreshToken}=await generateAccessAndRefreshToken(user._id);
    const options={
        httpOnly:true,
        secure:true
    }
    res
    .status(200)
    .cookie("accessToken", accessToken)
    .cookie("refreshToken", refreshToken)
    .json(
        new apiResponseHandler(
            201,
            "Logged in successfully",
            delete(user.password)
        )
    )


})

export const logoutUser=apiErrorHandler(async(req,res)=>{
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set:{refreshToken:undefined}
        },
        {
            new:true
        }
    )
    const options={
        httpOnly:true,
        secure:true
    }
    res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new apiResponseHandler(200, "User logged out"))

})

