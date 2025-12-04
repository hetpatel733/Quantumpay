const mongoose = require('mongoose');

const Schema = new mongoose.Schema({
    email: {
        type: String,
        required: true
    },
    subject: {
        type: String,
        required: true
    },
    comment: {
        type: String,
        required: true
    },
}, { timestamps: true });

const contactsave = mongoose.model("contactus_responses", Schema);

module.exports = { contactsave };