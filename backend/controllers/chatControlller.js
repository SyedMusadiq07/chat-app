const { uploadFileToCloudinary } = require("../config/cloudinaryConfig");
const Conversation = require("../models/Conversation");
const Message = require("../models/Message");
const response = require("../utils/response");

const sendMessage = async (req, res) => {
  try {
    // Implementation for sending a message
    const { senderId, receiverId, content, messageStatus } = req.body;
    const file = req.file;

    const participants = [senderId, receiverId].sort();

    //check if conversation exists
    let conversation = await Conversation.findOne({
      participants: { $all: participants },
    });

    //if not create new conversation
    if (!conversation) {
      conversation = new Conversation({ participants });
      await conversation.save();
    }

    let imageOrVideoUrl = null;
    let contentType = null;

    //handle file upload if exists
    if (file) {
      const uploadFile = await uploadFileToCloudinary(file);
      if (!uploadFile?.secure_url) {
        return response(res, 500, "failed to upload media");
      }

      imageOrVideoUrl = uploadFile.secure_url;

      if (file.mimetype.startsWith("image")) {
        contentType = "image";
      } else if (file.mimetype.startsWith("video")) {
        contentType = "video";
      } else {
        return response(res, 400, "Unsupported media type");
      }
    } else if (content?.trim()) {
      contentType = "text";
    } else {
      return response(res, 400, "Message content or media is required");
    }

    const message = await Message.create({
      conversationId: conversation?._id,
      sender: senderId,
      reciever: receiverId,
      content,
      contentType,
      imageOrVideoUrl,
      messageStatus,
    });

    await message.save();

    if (message?.content) {
      conversation.lastMessage = message?.id;
    }

    conversation.unreadCount += 1;
    await conversation.save();

    const populatedMessage = await Message.findOne(message._id)
      .populate("sender", "username profilePicture")
      .populate("reciever", "username profilePicture");

    return response(res, 200, "Message sent successfully", populatedMessage);
  } catch (error) {
    console.error("Error in sendMessage:", error);
    return response(res, 500, "Internal Server Error");
  }
};

module.exports = {
  sendMessage,
};
