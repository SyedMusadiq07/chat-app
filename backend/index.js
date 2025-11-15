const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const dotenv = require('dotenv');
const { connect } = require('mongoose');
const connectDB = require('./config/dbConnect');
const bodyParser = require('body-parser');

const authRoute = require('./routes/authRoute');

dotenv.config();


const PORT = process.env.PORT || 8000;

const app = express();

//Middlewares
app.use(express.json());
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: true }));



//Connect to DB
connectDB();

//Routes
app.use("/api/auth", authRoute);



app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
