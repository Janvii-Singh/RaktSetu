class MLService {
    constructor() {
        this.baseUrl = process.env.ML_SERVICE_URL || 'http://localhost:5001';
    }

    async checkHealth() {
        try {
            const response = await fetch(`${this.baseUrl}/health`);
            if (!response.ok) return { status: 'unavailable' };
            return await response.json();
        } catch (error) {
            console.error('❌ ML Service health check failed:', error.message);
            return { status: 'unavailable', error: error.message };
        }
    }

    async predictDonorAvailability(donors, requestDetails) {
        if (!donors || donors.length === 0) return [];
        
        // Prepare features for each donor
        const features = donors.map(donor => ({
            distance_km: donor.distance || 10,
            time_of_day: new Date().getHours(),
            day_of_week: new Date().getDay(),
            past_donations_count: donor.pastDonations || 0,
            avg_response_time: donor.avgResponseTime || 12,
            days_since_last_donation: donor.daysSinceLastDonation || 180,
            blood_group_match: donor.bloodGroup === requestDetails.requiredBloodGroup ? 1 : 0,
            request_urgency: requestDetails.urgency || 1
        }));
        
        try {
            console.log(`📊 Predicting for ${donors.length} donors...`);
            const response = await fetch(`${this.baseUrl}/predict`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ features })
            });
            
            if (!response.ok) {
                throw new Error(`ML Service returned ${response.status}`);
            }
            
            const result = await response.json();
            console.log(`✅ ML predictions received: ${result.count} donors`);
            
            // Merge predictions with donor data
            return donors.map((donor, index) => ({
                ...donor,
                responseProbability: result.predictions[index],
                mlScore: (result.predictions[index] * 100).toFixed(1) + '%'
            }));
        } catch (error) {
            console.error('❌ ML prediction failed:', error.message);
            // Return donors without ML scores if service fails
            return donors.map(donor => ({
                ...donor,
                responseProbability: 0.5,
                mlScore: 'Unavailable'
            }));
        }
    }
}

module.exports = new MLService();