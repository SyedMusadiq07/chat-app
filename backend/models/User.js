const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    phoneNumber: {
        type: String,

        unique: true,
        sparse: true, 
    },
    phoneSuffix: {
        type: String,
        unique: false,
    },
    email: {
        type: String,
        required: false,
        lowercase: true,
         validate: {
            validator: function(v) {
                return /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(v);
            },
            message: "Please enter a valid email"
        },
    },
    emailOtp: {
        type: String,
    },
    emailOtpExpiry: {
        type: Date,
    },
    profilePicture: {
        type: String,
    },
    about: {
        type: String,
    },
    lastSeen: {
        type: Date,
    },
    isOnline: {
        type: Boolean,
        default: false,
    },
    isVerfied: {
        type: Boolean,
        default: false,
    },
    agreed: {
        type: Boolean,
        default: false,
    }, 

}, { timestamps: true });


const User = mongoose.model('User', userSchema);
module.exports = User;