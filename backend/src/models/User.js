import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
    {
        email: { type: String, unique: true, required: true, index: true, lowercase: true },
        passwordHash: { type: String, required: true },
        refreshToken: { type: String },
        role: { type: String, enum: ['user', 'admin'], default: 'user' },
        isActive: { type: Boolean, default: true },
        lastLogin: { type: Date },
        profile: {
            firstName: String,
            lastName: String,
            phone: String,
        },
    },
    { timestamps: true }
);

// Index for faster queries
userSchema.index({ email: 1, isActive: 1 });

export const User = mongoose.model('User', userSchema);
