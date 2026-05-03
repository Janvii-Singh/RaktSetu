import numpy as np
import pandas as pd
import os
import joblib
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, roc_auc_score, confusion_matrix, classification_report
from sklearn.ensemble import RandomForestClassifier

try:
    from xgboost import XGBClassifier
    HAS_XGB = True
except ImportError:
    HAS_XGB = False
    print("XGBoost not available, using only RandomForest")

# Load data from the data folder at same level as scripts
data_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "donor_interactions.csv")
print(f"Looking for data at: {data_path}")

if not os.path.exists(data_path):
    print(f"ERROR: File not found at {data_path}")
    print("Please run generate_data.py first")
    exit(1)

df = pd.read_csv(data_path)
print(f"Loaded {len(df)} records")

# Define features and target
FEATURES = [
    'distance_km', 'time_of_day', 'day_of_week', 'past_donations_count',
    'avg_response_time', 'days_since_last_donation', 'blood_group_match', 
    'request_urgency'
]
TARGET = 'responded'

X = df[FEATURES]
y = df[TARGET]

# Split data
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# Define models
models = {
    'RandomForest': RandomForestClassifier(n_estimators=100, max_depth=10, random_state=42)
}

if HAS_XGB:
    models['XGBoost'] = XGBClassifier(n_estimators=100, max_depth=6, learning_rate=0.1, random_state=42, eval_metric='logloss')

results = {}

for name, model in models.items():
    print(f"\n{'-'*40}")
    print(f"Training {name}...")
    model.fit(X_train, y_train)
    
    y_pred = model.predict(X_test)
    y_prob = model.predict_proba(X_test)[:, 1]
    
    metrics = {
        'accuracy': accuracy_score(y_test, y_pred),
        'precision': precision_score(y_test, y_pred),
        'recall': recall_score(y_test, y_pred),
        'f1': f1_score(y_test, y_pred),
        'auc_roc': roc_auc_score(y_test, y_prob)
    }
    results[name] = metrics
    
    print(f"\n{name} Results:")
    for metric, value in metrics.items():
        print(f"  {metric}: {value:.4f}")
    print(f"\nClassification Report:")
    print(classification_report(y_test, y_pred))
    print(f"Confusion Matrix:")
    print(confusion_matrix(y_test, y_pred))
    
    if hasattr(model, "feature_importances_"):
        importances = sorted(zip(FEATURES, model.feature_importances_), key=lambda x: -x[1])
        print(f"\nFeature Importances:")
        for feat, imp in importances:
            print(f"  {feat}: {imp:.4f}")

# Select best model by AUC-ROC
best_name = max(results, key=lambda x: results[x]['auc_roc'])
best_model = models[best_name]

print(f"\n{'='*50}")
print(f"Best model: {best_name} (AUC-ROC: {results[best_name]['auc_roc']:.4f})")

# Save model to the model folder (at same level as scripts, not inside scripts)
model_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "model")
os.makedirs(model_dir, exist_ok=True)

model_path = os.path.join(model_dir, 'donor_predictor.pkl')
joblib.dump(best_model, model_path)
print(f"Model saved to {model_path}")

meta_path = os.path.join(model_dir, 'model_meta.pkl')
joblib.dump({'features': FEATURES, 'model_name': best_name}, meta_path)
print(f"Metadata saved to {meta_path}")