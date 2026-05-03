const express = require('express');
const router = express.Router();
const User = require('../models/User');
const BloodRequest = require('../models/BloodRequest');
const Notification = require('../models/Notification');
const DonationHistory = require('../models/DonationHistory');
const MLService = require('../services/mlService');
const { protect } = require('../middleware/auth');

// Helper: Calculate distance between coordinates (in km)
function calculateDistance(coord1, coord2) {
    const toRad = (value) => (value * Math.PI) / 180;
    const R = 6371;
    const dLat = toRad(coord2[1] - coord1[1]);
    const dLon = toRad(coord2[0] - coord1[0]);
    const lat1 = toRad(coord1[1]);
    const lat2 = toRad(coord2[1]);
    
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.sin(dLon/2) * Math.sin(dLon/2) * Math.cos(lat1) * Math.cos(lat2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

// ========== IMPORTANT: Specific routes MUST come BEFORE dynamic routes ==========

// GET ML Service Health (must be before /:id routes)
router.get('/ml-health', async (req, res) => {
    try {
        const health = await MLService.checkHealth();
        res.json(health);
    } catch (error) {
        res.json({ status: 'unavailable', error: error.message });
    }
});

// GET all requests (protected)
router.get('/', protect, async (req, res) => {
    try {
        const requests = await BloodRequest.find()
            .populate('requesterId', 'name email phone')
            .sort('-createdAt')
            .limit(50);
        res.json({ success: true, requests });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// CREATE BLOOD REQUEST with ML ranking (protected)
router.post('/', protect, async (req, res) => {
    try {
        const { bloodGroup, location, urgency, radius = 10, patientName, hospitalName, contactPhone, notes } = req.body;
        
        // Validate required fields
        if (!bloodGroup || !location || !contactPhone) {
            return res.status(400).json({ 
                success: false, 
                error: 'Missing required fields: bloodGroup, location, contactPhone' 
            });
        }
        
        // IMPORTANT: Get user from the protect middleware
        const requesterId = req.user._id;
        
        if (!requesterId) {
            return res.status(401).json({ 
                success: false, 
                error: 'User not authenticated. Please login again.' 
            });
        }
        
        // Create the request
        const request = new BloodRequest({
            bloodGroup,
            location,
            urgency: urgency || 'normal',
            radius,
            patientName,
            hospitalName,
            contactPhone,
            notes,
            requesterId: requesterId,
            status: 'open'
        });
        await request.save();
        
        // Find nearby eligible donors
        const nearbyDonors = await User.find({
            role: 'donor',
            isAvailable: true,
            bloodGroup: bloodGroup,
            location: {
                $near: {
                    $geometry: location,
                    $maxDistance: radius * 1000
                }
            }
        }).limit(50);
        
        let rankedDonors = [];
        
        if (nearbyDonors.length > 0) {
            const donorIds = nearbyDonors.map(d => d._id);
            const donationHistory = await DonationHistory.find({
                donorId: { $in: donorIds },
                accepted: true
            });
            
            const donorsWithFeatures = nearbyDonors.map(donor => {
                const donorHistory = donationHistory.filter(h => h.donorId.toString() === donor._id.toString());
                const pastDonations = donorHistory.length;
                const lastDonation = donorHistory.sort((a,b) => b.donatedAt - a.donatedAt)[0];
                
                return {
                    ...donor.toObject(),
                    distance: calculateDistance(location.coordinates, donor.location.coordinates),
                    pastDonations: pastDonations,
                    avgResponseTime: 8,
                    daysSinceLastDonation: lastDonation ? 
                        Math.floor((Date.now() - new Date(lastDonation.donatedAt)) / (1000 * 60 * 60 * 24)) : 180
                };
            });
            
            const urgencyMap = { 'normal': 1, 'urgent': 2, 'critical': 3 };
            rankedDonors = await MLService.predictDonorAvailability(donorsWithFeatures, {
                requiredBloodGroup: bloodGroup,
                urgency: urgencyMap[urgency] || 1
            });
            
            rankedDonors.sort((a, b) => b.responseProbability - a.responseProbability);
            
            request.matchedDonors = rankedDonors.slice(0, 15).map(donor => ({
                donorId: donor._id,
                score: donor.responseProbability,
                distance: donor.distance,
                status: 'pending'
            }));
            
            await request.save();
            
            const topDonors = rankedDonors.slice(0, 5);
            for (const donor of topDonors) {
                const io = req.app.get('io');
                if (io) {
                    io.to(`user_${donor._id}`).emit('new_blood_request', {
                        requestId: request._id,
                        bloodGroup: request.bloodGroup,
                        urgency: request.urgency,
                        distance: donor.distance,
                        probability: donor.responseProbability,
                        message: `New ${request.urgency} blood request for ${request.bloodGroup}`
                    });
                }
                
                await Notification.create({
                    userId: donor._id,
                    type: 'new-request',
                    message: `New ${request.urgency} blood request for ${request.bloodGroup} - ${(donor.distance).toFixed(1)}km away`,
                    requestId: request._id
                });
            }
        }
        
        res.status(201).json({
            success: true,
            request,
            mlRankedDonors: rankedDonors.slice(0, 10).map(d => ({
                id: d._id,
                name: d.name,
                bloodGroup: d.bloodGroup,
                distance: `${d.distance.toFixed(1)}km`,
                responseProbability: `${(d.responseProbability * 100).toFixed(1)}%`,
                mlScore: d.mlScore
            })),
            totalDonorsFound: nearbyDonors.length
        });
        
    } catch (error) {
        console.error('Error creating request:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET single request (protected - must come AFTER specific routes)
router.get('/:id', protect, async (req, res) => {
    try {
        const request = await BloodRequest.findById(req.params.id)
            .populate('requesterId', 'name email phone')
            .populate('matchedDonors.donorId', 'name email phone bloodGroup location isAvailable');
        
        if (!request) {
            return res.status(404).json({ success: false, error: 'Request not found' });
        }
        
        res.json({ success: true, request });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET REQUEST with ML-ranked donors (FIXED - now properly returns donor details)
router.get('/:id/ml-rankings', protect, async (req, res) => {
    try {
        const request = await BloodRequest.findById(req.params.id);
        
        if (!request) {
            return res.status(404).json({ success: false, error: 'Request not found' });
        }
        
        // Get full donor details for all matched donors
        const matchedDonorsWithDetails = [];
        
        for (const match of request.matchedDonors) {
            // Fetch complete donor information
            const donor = await User.findById(match.donorId).select('name email phone bloodGroup location isAvailable');
            
            if (donor) {
                matchedDonorsWithDetails.push({
                    donor: {
                        _id: donor._id,
                        name: donor.name,
                        email: donor.email,
                        phone: donor.phone,
                        bloodGroup: donor.bloodGroup,
                        location: donor.location,
                        isAvailable: donor.isAvailable
                    },
                    mlScore: match.score || 0.5,
                    distance: match.distance || 0,
                    status: match.status || 'pending',
                    respondedAt: match.respondedAt
                });
            }
        }
        
        // Sort by ML score (highest first)
        matchedDonorsWithDetails.sort((a, b) => b.mlScore - a.mlScore);
        
        res.json({
            success: true,
            requestId: request._id,
            requestDetails: {
                bloodGroup: request.bloodGroup,
                urgency: request.urgency,
                location: request.location
            },
            rankedDonors: matchedDonorsWithDetails,
            totalDonors: matchedDonorsWithDetails.length
        });
    } catch (error) {
        console.error('Error fetching ML rankings:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST respond to request (protected)
router.post('/:id/respond', protect, async (req, res) => {
    try {
        const { donorId, accepted } = req.body;
        const request = await BloodRequest.findById(req.params.id);
        
        if (!request) {
            return res.status(404).json({ success: false, error: 'Request not found' });
        }
        
        const matchedDonor = request.matchedDonors.find(m => m.donorId.toString() === donorId);
        if (matchedDonor) {
            matchedDonor.status = accepted ? 'accepted' : 'declined';
            matchedDonor.respondedAt = new Date();
            await request.save();
            
            const donor = await User.findById(donorId);
            await Notification.create({
                userId: request.requesterId,
                type: 'donor-response',
                message: `${donor.name} has ${accepted ? 'accepted' : 'declined'} your blood request`,
                requestId: request._id
            });
        }
        
        res.json({ success: true, message: `Response recorded` });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// PUT fulfill request (protected)
router.put('/:id/fulfill', protect, async (req, res) => {
    try {
        const { donorId } = req.body;
        const request = await BloodRequest.findById(req.params.id);
        
        if (!request) {
            return res.status(404).json({ success: false, error: 'Request not found' });
        }
        
        request.status = 'fulfilled';
        request.fulfilledBy = donorId;
        request.fulfilledAt = new Date();
        await request.save();
        
        await Notification.create({
            userId: request.requesterId,
            type: 'request-fulfilled',
            message: 'Your blood request has been fulfilled',
            requestId: request._id
        });
        
        res.json({ success: true, message: 'Request fulfilled' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;