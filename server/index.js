const express = require('express');
const cors = require('cors');
require('dotenv').config()
const connectDB = require('./config/connectDB');
const router = require('./routes/index');
const cookiesParser = require('cookie-parser');
const { app, server } = require('./socket/index');

// const app = express()
app.use(cors({
    origin: process.env.FRONTEND_URL,
    credentials: true
}))
app.use(express.json())
app.use(cookiesParser())

const PORT = process.env.PORT || 8080

app.get('/', (request, response) => {
    response.json({
        message: "Server running at " + PORT
    })
})

//api endpoints
app.use('/api', router)

// -------------------- Deployment -------------------

// const __dirname1 = path.resolve();
// if (process.env.NODE_ENV === 'production') {
//     app.use(express.static(path.join(__dirname1, "../client/build")))
//     app.get("*", (req, res) => {
//         res.sendFile(path.resolve(__dirname1, "client", "build", "index.html"))
//     })
// } else {
//     app.get('/', (request, response) => {
//         response.json({
//             message: "Server running at " + PORT
//         })
//     })
// }

// -------------------- Deployment -------------------

connectDB().then(() => {
    server.listen(PORT, () => {
        console.log("server running at " + PORT)
    })
})
