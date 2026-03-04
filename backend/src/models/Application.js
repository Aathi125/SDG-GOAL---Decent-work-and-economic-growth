import mongoose from 'mongoose';

const applicationSchema = new mongoose.Schema({
  youthId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },

  internshipId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Internship',
    required: true,
  },

  // 🔹 Snapshot of applicant info (important)
  name: {
    type: String,
    required: true,
    trim: true,
  },

  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
  },

  phoneNumber: {
    type: String,
    required: true,
    trim: true,
  },

  cvUrl: {
    type: String,
    required: true,
  },

  eligibilityScore: {
    type: Number,
    min: 0,
    max: 100,
    required: true,
  },

  scoreBreakdown: {
    skillMatch: { type: Number, default: 0 },
    educationMatch: { type: Number, default: 0 },
    locationMatch: { type: Number, default: 0 },
    priorityBoost: { type: Number, default: 0 },
  },

  status: {
    type: String,
    enum: ['Applied', 'Under Review', 'Accepted', 'Rejected'],
    default: 'Applied',
  },

  appliedDate: {
    type: Date,
    default: Date.now,
  },

  updatedDate: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: false, // you are manually controlling dates
});

// Prevent duplicate applications
applicationSchema.index({ youthId: 1, internshipId: 1 }, { unique: true });

// Auto update updatedDate
applicationSchema.pre('save', function () {
  this.updatedDate = Date.now();
});

export default mongoose.model('Application', applicationSchema);