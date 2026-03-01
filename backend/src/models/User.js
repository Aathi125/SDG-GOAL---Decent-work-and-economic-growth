import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: ['youth', 'organization', 'admin'],
    default: 'youth',
  },
  profile: {
    skills: [String],
    education: {
      level: String,
      field: String,
      institution: String,
      graduationYear: Number,
    },
    location: {
      village: String,
      district: String,
      state: String,
      isRural: {
        type: Boolean,
        default: true,
      },
    },
    bio: String,
    incomeCriteria: {
      familyIncome: Number,
      meetsCriteria: Boolean,
    },
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model('User', userSchema);