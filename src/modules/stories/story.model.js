const mongoose = require("mongoose");

const storySchema = new mongoose.Schema({
  title: {
    type: String,
    trim: true
  },

  media: {
    type: String, // image or video URL
    required: true
  },

  mediaType: {
    type: String,
    enum: ["image", "video"],
    required: true
  },

  duration: {
    type: Number, // in seconds (for video/image display)
    default: 5
  },

  thumbnail: {
    type: String // optional for video preview
  },

  isActive: {
    type: Boolean,
    default: true
  },

  startTime: {
    type: Date,
    default: Date.now
  },

  expireAt: {
    type: Date,
    required: true
  },

  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Admin"
  }

}, { timestamps: true });

// Auto delete after expiry
storySchema.index({ expireAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("Story", storySchema);
