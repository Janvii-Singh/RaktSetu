import numpy as np
import pandas as pd
import os

np.random.seed(42)
N = 6000

data = {
    "distance_km": np.random.exponential(5, N),
    "time_of_day": np.random.randint(0, 24, N),
    "day_of_week": np.random.randint(0, 7, N),
    "past_donations_count": np.random.poisson(3, N),
    "days_since_last_donation": np.random.randint(30, 730, N),
    "blood_group_match": np.random.choice([0, 1], N, p=[0.4, 0.6]),
    "request_urgency": np.random.choice([0, 1, 2], N, p=[0.5, 0.3, 0.2]),
}

df = pd.DataFrame(data)

df["avg_response_time"] = np.round(
    np.maximum(0.5, (10 - df["past_donations_count"]) * 0.8 + np.random.normal(6, 2, N)),
    2
)

prob = (
    -0.3 * df['distance_km']
    + 0.4 * df['past_donations_count']
    - 0.05 * df['avg_response_time']
    + 0.2 * df['blood_group_match']
    + 0.1 * df['request_urgency']
    - 0.001 * df['days_since_last_donation']
    - 0.02 * np.abs(df['time_of_day'] - 12)
)

prob = 1 / (1 + np.exp(-prob))
prob = np.clip(prob + np.random.normal(0, 0.1, N), 0, 1)
df['responded'] = (np.random.rand(N) < prob).astype(int)

os.makedirs(os.path.join(os.path.dirname(__file__), "data"), exist_ok=True)
output_path = os.path.join(os.path.dirname(__file__), "data", "donor_interactions.csv")
df.to_csv(output_path, index=False)
print(f"Generated {len(df)} records")
print(f"Response rate: {df['responded'].mean():.2f}")
print(f"Saved to {output_path}")