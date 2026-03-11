"""Flask API for donor availability prediction."""

import os
import joblib
import numpy as np
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

MODEL_DIR = os.path.join(os.path.dirname(__file__), 'model')
model = None
meta = None


def load_model():
    global model, meta
    model_path = os.path.join(MODEL_DIR, 'donor_predictor.pkl')
    meta_path = os.path.join(MODEL_DIR, 'model_meta.pkl')

    if os.path.exists(model_path) and os.path.exists(meta_path):
        model = joblib.load(model_path)
        meta = joblib.load(meta_path)
        print(f"Loaded model: {meta['model_name']}")
    else:
        print("WARNING: No trained model found. Run scripts/train_model.py first.")


@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        'status': 'ok',
        'model_loaded': model is not None,
        'model_name': meta['model_name'] if meta else None,
    })


@app.route('/predict', methods=['POST'])
def predict():
    if model is None:
        return jsonify({'error': 'Model not loaded'}), 503

    data = request.get_json()
    features_list = data.get('features', [])

    if not features_list:
        return jsonify({'error': 'No features provided'}), 400

    feature_names = meta['features']

    # Build feature matrix
    X = []
    for donor_features in features_list:
        row = [donor_features.get(f, 0) for f in feature_names]
        X.append(row)

    X = np.array(X)
    probabilities = model.predict_proba(X)[:, 1]

    return jsonify({
        'predictions': probabilities.tolist(),
        'model': meta['model_name'],
        'count': len(probabilities),
    })


if __name__ == '__main__':
    load_model()
    port = int(os.environ.get('ML_PORT', 5001))
    app.run(host='0.0.0.0', port=port, debug=os.environ.get('FLASK_DEBUG', 'false').lower() == 'true')
else:
    load_model()
