/**
 * Seed script — populates RaktSetu with sample users, blood requests, and notifications.
 * Run: node seed.js
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('./config/env');

const User = require('./models/User');
const BloodRequest = require('./models/BloodRequest');
const DonationHistory = require('./models/DonationHistory');
const Notification = require('./models/Notification');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/raktsetu';

// Delhi-NCR area coordinates for realistic geo data
const locations = [
  { coords: [77.2090, 28.6139], address: 'Connaught Place, New Delhi' },
  { coords: [77.2295, 28.6129], address: 'India Gate, New Delhi' },
  { coords: [77.1855, 28.6126], address: 'Karol Bagh, New Delhi' },
  { coords: [77.2507, 28.5535], address: 'Sarita Vihar, New Delhi' },
  { coords: [77.0688, 28.4595], address: 'Gurgaon Sector 29' },
  { coords: [77.3091, 28.5355], address: 'Noida Sector 18' },
  { coords: [77.2167, 28.6667], address: 'Civil Lines, Delhi' },
  { coords: [77.1025, 28.7041], address: 'Rohini, Delhi' },
  { coords: [77.2800, 28.6300], address: 'Laxmi Nagar, Delhi' },
  { coords: [77.1500, 28.5800], address: 'Dwarka, Delhi' },
];

async function seed() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB');

  // Clear existing data
  await Promise.all([
    User.deleteMany({}),
    BloodRequest.deleteMany({}),
    DonationHistory.deleteMany({}),
    Notification.deleteMany({}),
  ]);
  console.log('Cleared existing data');

  const plainPassword = 'password123';

  // Create donors
  const donorData = [
    { name: 'Rahul Sharma', email: 'rahul@example.com', bloodGroup: 'O+', phone: '9876543210', locIdx: 0 },
    { name: 'Priya Singh', email: 'priya@example.com', bloodGroup: 'A+', phone: '9876543211', locIdx: 1 },
    { name: 'Amit Kumar', email: 'amit@example.com', bloodGroup: 'B+', phone: '9876543212', locIdx: 2 },
    { name: 'Sneha Gupta', email: 'sneha@example.com', bloodGroup: 'O-', phone: '9876543213', locIdx: 3 },
    { name: 'Vikram Patel', email: 'vikram@example.com', bloodGroup: 'AB+', phone: '9876543214', locIdx: 4 },
    { name: 'Ananya Reddy', email: 'ananya@example.com', bloodGroup: 'A-', phone: '9876543215', locIdx: 6 },
    { name: 'Karan Mehta', email: 'karan@example.com', bloodGroup: 'B-', phone: '9876543216', locIdx: 7 },
    { name: 'Deepa Nair', email: 'deepa@example.com', bloodGroup: 'O+', phone: '9876543217', locIdx: 8 },
    { name: 'Ravi Joshi', email: 'ravi@example.com', bloodGroup: 'A+', phone: '9876543218', locIdx: 9 },
    { name: 'Meera Iyer', email: 'meera@example.com', bloodGroup: 'AB-', phone: '9876543219', locIdx: 5 },
  ];

  const donors = [];
  for (const d of donorData) {
    const user = await User.create({
      name: d.name,
      email: d.email,
      password: plainPassword,
      role: 'donor',
      phone: d.phone,
      bloodGroup: d.bloodGroup,
      isAvailable: true,
      lastDonationDate: new Date(Date.now() - (100 + Math.random() * 200) * 24 * 60 * 60 * 1000),
      location: {
        type: 'Point',
        coordinates: locations[d.locIdx].coords,
        address: locations[d.locIdx].address,
      },
    });
    donors.push(user);
  }
  console.log(`Created ${donors.length} donors`);

  // Create patients
  const patients = [];
  const patientData = [
    { name: 'Arun Verma', email: 'arun@example.com', bloodGroup: 'B+', phone: '9871111111', locIdx: 1 },
    { name: 'Suman Das', email: 'suman@example.com', bloodGroup: 'O+', phone: '9871111112', locIdx: 3 },
  ];
  for (const p of patientData) {
    const user = await User.create({
      name: p.name,
      email: p.email,
      password: plainPassword,
      role: 'patient',
      phone: p.phone,
      bloodGroup: p.bloodGroup,
      location: {
        type: 'Point',
        coordinates: locations[p.locIdx].coords,
        address: locations[p.locIdx].address,
      },
    });
    patients.push(user);
  }
  console.log(`Created ${patients.length} patients`);

  // Create hospital
  const hospital = await User.create({
    name: 'City General Hospital',
    email: 'hospital@example.com',
    password: plainPassword,
    role: 'hospital',
    phone: '01112345678',
    location: {
      type: 'Point',
      coordinates: [77.2090, 28.6139],
      address: 'Connaught Place, New Delhi',
    },
  });
  console.log('Created hospital user');

  // Create blood requests
  // Request 1: Open request from patient (O+ needed near India Gate)
  const request1 = await BloodRequest.create({
    requesterId: patients[0]._id,
    bloodGroup: 'O+',
    urgency: 'urgent',
    unitsNeeded: 2,
    location: { type: 'Point', coordinates: [77.2295, 28.6129], address: 'India Gate, New Delhi' },
    hospitalName: 'AIIMS Hospital',
    contactPhone: '9871111111',
    notes: 'Needed for surgery tomorrow morning',
    status: 'matched',
    matchedDonors: [
      { donorId: donors[0]._id, score: 0.85, distance: 1.5, status: 'accepted', respondedAt: new Date() },
      { donorId: donors[7]._id, score: 0.72, distance: 4.2, status: 'pending' },
      { donorId: donors[3]._id, score: 0.65, distance: 8.1, status: 'declined', respondedAt: new Date() },
    ],
  });

  // Request 2: Critical request from hospital (B+ needed)
  const request2 = await BloodRequest.create({
    requesterId: hospital._id,
    bloodGroup: 'B+',
    urgency: 'critical',
    unitsNeeded: 3,
    location: { type: 'Point', coordinates: [77.2090, 28.6139], address: 'City General Hospital, CP' },
    hospitalName: 'City General Hospital',
    contactPhone: '01112345678',
    notes: 'Emergency - accident victim',
    status: 'matched',
    matchedDonors: [
      { donorId: donors[2]._id, score: 0.91, distance: 2.0, status: 'accepted', respondedAt: new Date() },
      { donorId: donors[4]._id, score: 0.68, distance: 15.3, status: 'pending' },
    ],
  });

  // Request 3: Fulfilled request
  const request3 = await BloodRequest.create({
    requesterId: patients[1]._id,
    bloodGroup: 'A+',
    urgency: 'normal',
    unitsNeeded: 1,
    location: { type: 'Point', coordinates: [77.2507, 28.5535], address: 'Sarita Vihar, New Delhi' },
    hospitalName: 'Max Hospital',
    contactPhone: '9871111112',
    status: 'fulfilled',
    fulfilledBy: donors[1]._id,
    matchedDonors: [
      { donorId: donors[1]._id, score: 0.88, distance: 3.0, status: 'accepted', respondedAt: new Date(Date.now() - 86400000) },
      { donorId: donors[8]._id, score: 0.71, distance: 7.5, status: 'declined', respondedAt: new Date(Date.now() - 86400000) },
    ],
  });

  // Request 4: Open O- request (universal donor needed)
  const request4 = await BloodRequest.create({
    requesterId: hospital._id,
    bloodGroup: 'O-',
    urgency: 'critical',
    unitsNeeded: 4,
    location: { type: 'Point', coordinates: [77.2090, 28.6139], address: 'City General Hospital, CP' },
    hospitalName: 'City General Hospital',
    contactPhone: '01112345678',
    notes: 'Multiple trauma patients',
    status: 'matched',
    matchedDonors: [
      { donorId: donors[3]._id, score: 0.79, distance: 8.0, status: 'pending' },
    ],
  });

  console.log('Created 4 blood requests');

  // Create donation history
  await DonationHistory.create([
    { donorId: donors[0]._id, requestId: request1._id, accepted: true, donatedAt: null },
    { donorId: donors[3]._id, requestId: request1._id, accepted: false },
    { donorId: donors[2]._id, requestId: request2._id, accepted: true, donatedAt: null },
    { donorId: donors[1]._id, requestId: request3._id, accepted: true, donatedAt: new Date(Date.now() - 43200000) },
    { donorId: donors[8]._id, requestId: request3._id, accepted: false },
  ]);
  console.log('Created donation history records');

  // Create notifications
  const notifications = [
    // Notifications for donors about request1
    { userId: donors[0]._id, type: 'new-request', message: 'New urgent blood request for O+ near India Gate', requestId: request1._id, read: true },
    { userId: donors[7]._id, type: 'new-request', message: 'New urgent blood request for O+ near India Gate', requestId: request1._id, read: false },
    { userId: donors[3]._id, type: 'new-request', message: 'New urgent blood request for O+ near India Gate', requestId: request1._id, read: true },
    // Notification for patient about donor response
    { userId: patients[0]._id, type: 'donor-response', message: 'A donor has accepted your blood request for O+', requestId: request1._id, read: false },
    { userId: patients[0]._id, type: 'donor-response', message: 'A donor has declined your blood request for O+', requestId: request1._id, read: false },
    // Critical request notifications
    { userId: donors[2]._id, type: 'new-request', message: 'New CRITICAL blood request for B+ at City General Hospital', requestId: request2._id, read: true },
    { userId: donors[4]._id, type: 'new-request', message: 'New CRITICAL blood request for B+ at City General Hospital', requestId: request2._id, read: false },
    // Fulfilled notification
    { userId: patients[1]._id, type: 'request-fulfilled', message: 'Blood request for A+ has been fulfilled', requestId: request3._id, read: true },
    { userId: donors[1]._id, type: 'request-fulfilled', message: 'Blood request for A+ has been fulfilled', requestId: request3._id, read: false },
    // O- request
    { userId: donors[3]._id, type: 'new-request', message: 'New CRITICAL blood request for O- at City General Hospital', requestId: request4._id, read: false },
  ];
  await Notification.create(notifications);
  console.log(`Created ${notifications.length} notifications`);

  // Print summary
  console.log('\n========================================');
  console.log('  SEED DATA SUMMARY');
  console.log('========================================');
  console.log(`\nAll users have password: password123\n`);
  console.log('DONORS (10):');
  donors.forEach((d) => console.log(`  ${d.email} | ${d.bloodGroup} | ${d.name}`));
  console.log('\nPATIENTS (2):');
  patients.forEach((p) => console.log(`  ${p.email} | ${p.bloodGroup} | ${p.name}`));
  console.log('\nHOSPITAL (1):');
  console.log(`  ${hospital.email} | City General Hospital`);
  console.log('\nBLOOD REQUESTS (4):');
  console.log(`  #1 O+ urgent  - matched (1 accepted, 1 pending, 1 declined)`);
  console.log(`  #2 B+ critical - matched (1 accepted, 1 pending)`);
  console.log(`  #3 A+ normal  - fulfilled`);
  console.log(`  #4 O- critical - matched (1 pending)`);
  console.log('========================================\n');

  await mongoose.connection.close();
  console.log('Done! Database seeded successfully.');
}

seed().catch((err) => {
  console.error('Seed error:', err);
  process.exit(1);
});
