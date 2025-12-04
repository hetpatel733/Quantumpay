const { User } = require("../models/User");

const updateUser = async (req, res) => {
    try {
        console.log("🔍 REQUEST RECEIVED: Update user for ID:", req.params.id);
        
        const userId = req.params.id;
        const updateData = req.body;
        
        // Validate user ID format
        if (!userId.match(/^[0-9a-fA-F]{24}$/)) {
            console.log("📤 RESPONSE SENT: Invalid user ID format - Status: 400");
            return res.status(400).json({
                success: false,
                message: "Invalid user ID format"
            });
        }

        // Find and update user
        const user = await User.findByIdAndUpdate(
            userId,
            { $set: updateData },
            { new: true, runValidators: true }
        ).select('-passwordHash -token');

        if (!user) {
            console.log("📤 RESPONSE SENT: User not found - Status: 404");
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        console.log("User updated successfully:", userId);
        console.log("📤 RESPONSE SENT: User updated - Status: 200");

        return res.status(200).json({
            success: true,
            message: "Profile updated successfully",
            user: user
        });

    } catch (error) {
        console.error("Update user error:", error);
        console.log("📤 RESPONSE SENT: Update failed - Status: 500");
        return res.status(500).json({
            success: false,
            message: "Failed to update profile: " + error.message
        });
    }
};

module.exports = {
    updateUser
};
