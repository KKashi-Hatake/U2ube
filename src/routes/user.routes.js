import Router from "express"
import { changeCurrentPassword, getChannelDetails, getCurrentUser, getWatchHistory, loginUser, logoutUser, refreshAccessToken, registerUser, updateAccountDetails, updateAvatar, updateCoverImage } from '../controllers/user.controller.js'
import { upload } from "../middlewares/multer.middleware.js"
import { auth } from "../middlewares/auth.js";
import asyncHandler from "../utils/asyncHandler.js";
import { Subscription } from '../models/subscriber.model.js'




const router = Router();
router.route("/register").post(
    upload.fields([
        {
            name: "avatar",
            maxCount: 1
        },
        {
            name: "coverImage",
            maxCount: 1
        }
    ]),
    registerUser)

router.route("/login").post(loginUser)


//Secure Routes
router.route("/current-user").get(auth, getCurrentUser)
router.route("/c/:username").get(auth, getChannelDetails)
router.route("/history").get(auth, getWatchHistory)

router.route("/logout").post(auth, logoutUser)
router.route("/refresh-token").post(refreshAccessToken)
router.route("/change-password").post(auth, changeCurrentPassword)

router.route("/update-account").patch(auth, updateAccountDetails)
router.route("/avatar").patch(auth, upload.single("avatar"), updateAvatar)
router.route("/cover-image").patch(auth, upload.single("coverImage"), updateCoverImage)



export default router