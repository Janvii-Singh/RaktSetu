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

// GET ML Service Health
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
        let query = {};
        
        if (req.user.role === 'donor') {
            query = {
                bloodGroup: req.user.bloodGroup,
                status: { $in: ['open', 'matched'] }
            };
        }
        
        const requests = await BloodRequest.find(query)
            .populate('requesterId', 'name email phone')
            .populate('matchedDonors.donorId', 'name email phone bloodGroup location')
            .sort('-createdAt')
            .limit(50);
            
        res.json({ success: true, requests });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// CREATE BLOOD REQUEST with ML ranking
router.post('/', protect, async (req, res) => {
    try {
        const { bloodGroup, location, urgency, radius = 10, patientName, hospitalName, contactPhone, notes } = req.body;
        
        if (!bloodGroup || !location || !contactPhone) {
            return res.status(400).json({ 
                success: false, 
                error: 'Missing required fields: bloodGroup, location, contactPhone' 
            });
        }
        
        const requesterId = req.user._id;
        
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
                    title: 'New Blood Request',
                    message: `New ${request.urgency} blood request for ${request.bloodGroup} - ${(donor.distance).toFixed(1)}km away`,
                    requestId: request._id,
                    isRead: false
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

// GET single request
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

// GET REQUEST with ML-ranked donors
router.get('/:id/ml-rankings', protect, async (req, res) => {
    try {
        const request = await BloodRequest.findById(req.params.id);
        
        if (!request) {
            return res.status(404).json({ success: false, error: 'Request not found' });
        }
        
        const matchedDonorsWithDetails = [];
        
        for (const match of request.matchedDonors) {
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

// POST respond to request (FIXED - Working Accept/Decline)
router.post('/:id/respond', protect, async (req, res) => {
    try {
        console.log('=== RESPOND REQUEST RECEIVED ===');
        console.log('Request ID:', req.params.id);
        console.log('Request Body:', req.body);
        console.log('Authenticated User ID:', req.user?._id);
        console.log('Authenticated User Role:', req.user?.role);
        
        const { donorId, accepted } = req.body;
        
        // Use the authenticated user's ID if donorId not provided or mismatch
        let finalDonorId = donorId;
        if (!finalDonorId || (req.user?.role === 'donor' && req.user?._id)) {
            finalDonorId = req.user._id;
            console.log('Using authenticated user ID as donorId:', finalDonorId);
        }
        
        if (!finalDonorId) {
            console.log('ERROR: No donorId available');
            return res.status(400).json({ 
                success: false, 
                error: 'Donor ID is required' 
            });
        }
        
        const request = await BloodRequest.findById(req.params.id);
        
        if (!request) {
            console.log('ERROR: Request not found');
            return res.status(404).json({ 
                success: false, 
                error: 'Request not found' 
            });
        }
        
        console.log('Request found. Blood Group:', request.bloodGroup);
        console.log('Matched Donors count:', request.matchedDonors?.length || 0);
        
        if (!request.matchedDonors || request.matchedDonors.length === 0) {
            console.log('ERROR: No matched donors in this request');
            return res.status(400).json({ 
                success: false, 
                error: 'No donors are matched to this request yet' 
            });
        }
        
        // Find the matched donor
        const matchedDonor = request.matchedDonors.find(m => {
            const mId = m.donorId.toString();
            const dId = finalDonorId.toString();
            return mId === dId;
        });
        
        if (!matchedDonor) {
            console.log('Available donor IDs in request:', request.matchedDonors.map(m => m.donorId.toString()));
            console.log('Looking for donor ID:', finalDonorId.toString());
            return res.status(404).json({ 
                success: false, 
                error: 'You are not matched to this request. Please check your dashboard for available requests.' 
            });
        }
        
        console.log('Matched donor found. Current status:', matchedDonor.status);
        
        // Update donor status
        matchedDonor.status = accepted ? 'accepted' : 'declined';
        matchedDonor.respondedAt = new Date();
        await request.save();
        
        console.log('Donor status updated to:', matchedDonor.status);
        
        const donor = await User.findById(finalDonorId);
        
        // Create notification for the requester
        await Notification.create({
            userId: request.requesterId,
            type: 'donor-response',
            title: `Donor ${accepted ? 'Accepted' : 'Declined'}`,
            message: `${donor?.name || 'A donor'} has ${accepted ? 'accepted' : 'declined'} your blood request for ${request.bloodGroup}`,
            requestId: request._id,
            isRead: false
        });
        
        // Send real-time notification via Socket.io
        const io = req.app.get('io');
        if (io) {
            io.to(`user_${request.requesterId}`).emit('donor_response_update', {
                requestId: request._id,
                donorId: finalDonorId,
                donorName: donor?.name || 'A donor',
                status: accepted ? 'accepted' : 'declined',
                bloodGroup: request.bloodGroup,
                distance: matchedDonor.distance,
                score: matchedDonor.score
            });
        }
        
        console.log('=== RESPOND SUCCESS ===');
        res.json({ 
            success: true, 
            message: `Request ${accepted ? 'accepted' : 'declined'} successfully`,
            request: request
        });
        
    } catch (error) {
        console.error('=== RESPOND ERROR ===');
        console.error('Error:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// PUT fulfill request
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
        
        const donor = await User.findById(donorId);
        
        await Notification.create({
            userId: request.requesterId,
            type: 'request-fulfilled',
            title: 'Request Fulfilled',
            message: `Your blood request for ${request.bloodGroup} has been fulfilled by ${donor?.name || 'a donor'}`,
            requestId: request._id,
            isRead: false
        });
        
        const io = req.app.get('io');
        if (io) {
            io.to(`user_${request.requesterId}`).emit('request_fulfilled', {
                requestId: request._id,
                message: `Your blood request for ${request.bloodGroup} has been fulfilled`
            });
        }
        
        res.json({ success: true, message: 'Request fulfilled' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;