const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

// Configure mongoose to allow query virtuals and remove deprecation warnings
mongoose.set('strictQuery', false);

// Helper to add virtual 'id' mapping to '_id' for frontend compatibility
const addVirtualId = (schema) => {
  schema.virtual('id').get(function() {
    return this._id;
  });
  schema.set('toJSON', { virtuals: true });
  schema.set('toObject', { virtuals: true });
};

// 1. User Schema
const userSchema = new mongoose.Schema({
  _id: { type: String, default: uuidv4 },
  phone: { type: String, required: true },
  name: { type: String, required: true },
  created_at: { type: Date, default: Date.now }
});
addVirtualId(userSchema);

// 2. Trusted Contact Schema
const trustedContactSchema = new mongoose.Schema({
  _id: { type: String, default: uuidv4 },
  user_id: { type: String, required: true, ref: 'User' },
  name: { type: String, required: true },
  phone: { type: String, required: true }
});
addVirtualId(trustedContactSchema);

// 3. Trip Schema
const tripSchema = new mongoose.Schema({
  _id: { type: String, default: uuidv4 },
  user_id: { type: String, ref: 'User' },
  origin_lat: Number,
  origin_lng: Number,
  destination_lat: Number,
  destination_lng: Number,
  origin_name: String,
  destination_name: String,
  selected_route: mongoose.Schema.Types.Mixed,
  safety_score: Number,
  status: { type: String, default: 'active' },
  eta: Date,
  started_at: { type: Date, default: Date.now },
  ended_at: Date,
  share_token: { type: String, unique: true }
});
addVirtualId(tripSchema);

// 4. Incident Schema with 2dsphere index for location
const incidentSchema = new mongoose.Schema({
  _id: { type: String, default: uuidv4 },
  lat: { type: Number, required: true },
  lng: { type: Number, required: true },
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number] } // [longitude, latitude]
  },
  type: { type: String, required: true },
  description: String,
  reported_at: { type: Date, default: Date.now },
  weight: { type: Number, default: 1.0 }
});
incidentSchema.index({ location: '2dsphere' });
addVirtualId(incidentSchema);

// Pre-save middleware to automatically sync coordinate fields with GeoJSON location
incidentSchema.pre('save', function() {
  if (this.lng !== undefined && this.lat !== undefined) {
    this.location = {
      type: 'Point',
      coordinates: [this.lng, this.lat]
    };
  }
});

// 5. Safety Scores Cache Schema
const safetyScoresCacheSchema = new mongoose.Schema({
  _id: { type: String, default: uuidv4 },
  route_hash: { type: String, required: true, unique: true },
  score: Number,
  breakdown: mongoose.Schema.Types.Mixed,
  ai_advisory: String,
  cached_at: { type: Date, default: Date.now }
});
addVirtualId(safetyScoresCacheSchema);

// Compile Models
const User = mongoose.model('User', userSchema);
const TrustedContact = mongoose.model('TrustedContact', trustedContactSchema);
const Trip = mongoose.model('Trip', tripSchema);
const Incident = mongoose.model('Incident', incidentSchema);
const SafetyScoresCache = mongoose.model('SafetyScoresCache', safetyScoresCacheSchema);

module.exports = {
  User,
  TrustedContact,
  Trip,
  Incident,
  SafetyScoresCache
};
