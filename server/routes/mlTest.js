const express = require('express');
const router = express.Router();
const MLService = require('../services/mlService');

// Test ML service connection
router.get('/health', async (req, res) => {
    const health = await MLService.checkHealth();
    res.json({
        message: 'ML Service Status',
        ...health
    });
});

// Test prediction with sample data
router.post('/predict-sample', async (req, res) => {
    const sampleDonors = [
        {
            distance: 3.5,
            pastDonations: 5,
            avgResponseTime: 2.5,
            daysSinceLastDonation: 45,
            bloodGroup: 'A+'
        },
        {
            distance: 8.2,
            pastDonations: 1,
            avgResponseTime: 8.0,
            daysSinceLastDonation: 120,
            bloodGroup: 'A+'
        },
        {
            distance: 12.0,
            pastDonations: 0,
            avgResponseTime: 15.0,
            daysSinceLastDonation: 300,
            bloodGroup: 'B+'
        }
    ];
    
    const predictions = await MLService.predictDonorAvailability(sampleDonors, {
        requiredBloodGroup: 'A+',
        urgency: 2
    });
    
    res.json({
        message: 'Sample Predictions',
        predictions: predictions.map(p => ({
            distance_km: p.distance,
            past_donations: p.pastDonations,
            response_probability: p.responseProbability,
            ml_score: p.mlScore
        }))
    });
});

// Test with custom donors
router.post('/predict-custom', async (req, res) => {
    const { donors, requiredBloodGroup, urgency } = req.body;
    
    if (!donors || !Array.isArray(donors)) {
        return res.status(400).json({ error: 'Please provide donors array' });
    }
    
    const predictions = await MLService.predictDonorAvailability(donors, {
        requiredBloodGroup: requiredBloodGroup || 'A+',
        urgency: urgency || 1
    });
    
    res.json({
        count: predictions.length,
        predictions: predictions
    });
});

module.exports = router;