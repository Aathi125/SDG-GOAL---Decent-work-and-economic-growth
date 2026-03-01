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
  cvUrl: {                // ✅ store Cloudinary URL
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
    skillMatch: Number,
    educationMatch: Number,
    locationMatch: Number,
    priorityBoost: Number,
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
});

applicationSchema.index({ youthId: 1, internshipId: 1 }, { unique: true });

applicationSchema.pre('save', function () {
  this.updatedDate = Date.now();
});

export default mongoose.model('Application', applicationSchema);