import Router from "express"
import { loginUser, logoutUser, registerUser } from '../controllers/user.controller.js'
import {upload} from "../middlewares/multer.middleware.js"
import auth
 from "../middlewares/auth.js";




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
router.route("/logout").post(auth, logoutUser)


export default router