import mongoose, { isValidObjectId } from "mongoose"
import { Video } from "../models/video.model.js"
import { User } from "../models/user.model.js"
import apiResponseHandler from "../utils/apiResponseHandler.js"
import apiErrorHandler from '../utils/apiErrorHandler.js';
import asyncHandler from "../utils/asyncHandler.js"
import uploadOnCloudinary from "../utils/cloudinary.js"


const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query;
    const skip = (page - 1) * limit;
    let video;
    if (userId) {
        video = await Video.find({ owner: userId }).limit(Number(limit)).skip(skip);
    } else {
        video = await Video.find().skip(skip).limit(Number(limit));
    }



    res.json(video)
    //TODO: get all videos based on query, sort, pagination
})

const publishAVideo = asyncHandler(async (req, res) => {
    const { title, description } = req.body;
    if (!(title && description)) {
        throw new apiErrorHandler(400, "Title and description both are required.")
    }
    const videoLocalPath = req.files?.videoFile[0]?.path;
    const thumbnailLocalPath = req.files?.thumbnail[0]?.path;
    if (!(videoLocalPath && thumbnailLocalPath)) {
        throw new apiErrorHandler(400, "Video and thumbnail both are required.")
    }
    const videoFile = await uploadOnCloudinary(videoLocalPath)
    const thumbnail = await uploadOnCloudinary(thumbnailLocalPath)
    if (!(videoFile && thumbnail)) {
        throw new apiErrorHandler(500, "Something went wrong while uploading video and thumbnail")
    }
    const video = await Video.create({
        videoFile: videoFile?.url,
        thumbnail: thumbnail?.url,
        title,
        description,
        duration: videoFile.duration,
        owner: req.user?._id
    })

    res
        .status(200)
        .json(
            new apiResponseHandler(200, "Video uploaded successfully", video)
        )
    // TODO: get video, upload to cloudinary, create video
})

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: get video by id
})

const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: update video details like title, description, thumbnail

})

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: delete video
})

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params
})

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}