const { contactsave } = require("../models/contact");

const contact = async (req, res, app) => {
    try {
        var { email, subject, comment } = req.body;
        var contactdata = new contactsave({
            email: email,
            subject: subject,
            comment: comment,
        })
        const contactconfirmed = await contactdata.save();
        Success = true;
        return res.status(200).json({
            success: true,
            message: "Your message has been sent successfully",

        });
    } catch (error) {
        console.log(error);
        return res.status(401).json({
            success: false,
            message: "Internal server error",
        });
    }
}

module.exports = {
    contact
};