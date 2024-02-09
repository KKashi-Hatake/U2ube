import dotenv from "dotenv"
import connectDB from "./db/index.js"
import app from './app.js'


dotenv.config({
    path:"./.env"
})

connectDB()
const port=process.env.PORT||5000

app.listen(port,(req,res)=>{
    console.log("server is listening on: ", port)
})