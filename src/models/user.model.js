import mongoose from "mongoose"
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: [true, "username is required"],
        unique: [true, 'Username should be unique'],
        lowercase: true,
        trim: true,
        index: true
    },
    fullName: {
        type: String,
        required: [true, "username is required"],
        lowercase: true,
        index: true
    },
    email: {
        type: String,
        required: [true, "username is required"],
        unique: [true, 'Email should be unique'],
        lowercase: true,
        trim: true
    },
    password: {
        type: String,
        required: [true, "username is required"],
    },
    avatar: {
        type: String,
        required: [true, "Avatar is required"]
    },
    coverImage: {
        type: String,
    },
    watchHistory: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Video",
        }
    ],
    refreshToken: {
        type: String
    }
}, { timestamps: true })

userSchema.pre("save", async function (next) {
    if (this.isModified("password")) {
        this.password = await bcrypt.hash(this.password, 10)
        next()
    } else {
        return next()
    }
})

userSchema.methods.isPasswordCorrect = async function (password) {
    return await bcrypt.compare(password, this.password)
}

userSchema.methods.generateAccessToken = async function () {
    return await jwt.sign({
        _id: this._id,
        email: this.email,
        username: this.username,
        fulName: this.fullName,
    },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY
        }
    )
}
userSchema.methods.generateRefreshToken = async function () {
    return await jwt.sign({
        _id: this._id,
    },
        process.env.REFRESH_TOKEN_SECRET,
        { expiresIn: process.env.REFRESH_TOKEN_EXPIRY }
    )
}






export const User = mongoose.model("User", userSchema)