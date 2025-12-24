const { contactsave } = require("../models/contact");

// Handle contact form submission
async function handleContact(req, res) {
    try {
        const { email, subject, comment } = req.body;

        console.log('📧 Contact form submission:', { email, subject });

        // Validate input
        if (!email || !subject || !comment) {
            return res.status(400).json({
                success: false,
                message: "All fields are required"
            });
        }

        // Save contact message
        const contactMessage = new contactsave({
            email,
            subject,
            comment
        });

        await contactMessage.save();
        console.log('✅ Contact message saved:', email);

        return res.status(200).json({
            success: true,
            message: "Your message has been sent successfully. We'll get back to you soon!"
        });

    } catch (error) {
        console.error('❌ Contact form error:', error);
        return res.status(500).json({
            success: false,
            message: "Failed to send message. Please try again later."
        });
    }
}

module.exports = {
    handleContact
};
