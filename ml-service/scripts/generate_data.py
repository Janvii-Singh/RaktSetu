"""Generate synthetic donor interaction dataset for training."""

import numpy as np
import pandas as pd
import os

np.random.seed(42)
N = 6000

data = {
    'distance_km': np.round(np.random.exponential(5, N).clip(0.1, 50), 2),
    'time_of_day': np.random.randint(0, 24, N),
    'day_of_week': np.random.randint(0, 7, N),
    'past_donations_count': np.random.poisson(3, N),
    'days_since_last_donation': np.random.randint(30, 730, N),
    'blood_group_match': np.random.choice([0, 1], N, p=[0.4, 0.6]),
    'request_urgency': np.random.choice([0, 1, 2], N, p=[0.5, 0.3, 0.2]),
}

df = pd.DataFrame(data)

# Avg response time (hours) - correlated with past donations
df['avg_response_time'] = np.round(
    np.maximum(0.5, 10 - df['past_donations_count'] * 0.8 + np.random.normal(0, 2, N)),
    2
)

# Generate target: responded (0/1) based on realistic correlations
prob = (
    -0.03 * df['distance_km']
    + 0.08 * df['past_donations_count']
    - 0.05 * df['avg_response_time']
    + 0.15 * df['blood_group_match']
    + 0.2 * df['request_urgency']
    + 0.001 * df['days_since_last_donation']
    - 0.02 * np.abs(df['time_of_day'] - 12)  # less likely at extreme hours
)

# Sigmoid to get probability
prob = 1 / (1 + np.exp(-prob))
# Add noise
prob = np.clip(prob + np.random.normal(0, 0.05, N), 0.05, 0.95)
df['responded'] = (np.random.random(N) < prob).astype(int)

os.makedirs(os.path.join(os.path.dirname(__file__), '..', 'data'), exist_ok=True)
output_path = os.path.join(os.path.dirname(__file__), '..', 'data', 'donor_interactions.csv')
df.to_csv(output_path, index=False)

print(f"Generated {len(df)} records")
print(f"Response rate: {df['responded'].mean():.2%}")
print(f"Saved to {output_path}")
