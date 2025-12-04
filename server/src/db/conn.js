const { connect } = require('http2');
const mongoose = require('mongoose');
const MONGO_URI = process.env.MONGO_URI;
function mongooconnect() {
    mongoose.connect(MONGO_URI, {
        useNewUrlParser: true,
        useUnifiedTopology : true,
    }
    ).then(() => {
        console.log("Connection Success");
    }).catch((e) => {
        console.log(e);
    })
}
mongooconnect();