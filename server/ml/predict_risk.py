import sys
import json
import pickle
import os
import warnings

# Suppress scikit-learn warnings about feature names if any
warnings.filterwarnings("ignore")

def predict():
    try:
        # Read JSON string from command line arguments
        if len(sys.argv) < 2:
            print(json.dumps({"error": "No input data provided"}))
            sys.exit(1)
            
        input_data = json.loads(sys.argv[1])
        
        # Load the model
        model_path = os.path.join(os.path.dirname(__file__), 'risk_model.pkl')
        if not os.path.exists(model_path):
            print(json.dumps({"error": f"Model file not found at {model_path}"}))
            sys.exit(1)
            
        with open(model_path, 'rb') as f:
            model = pickle.load(f)
            
        # Extract features
        hour = int(input_data.get('hour', 12))
        day_of_week = int(input_data.get('day_of_week', 0))
        incident_density = float(input_data.get('incident_density', 50.0))
        has_event = int(input_data.get('has_event', 0))
        is_raining = int(input_data.get('is_raining', 0))
        
        # Make prediction
        features = [[hour, day_of_week, incident_density, has_event, is_raining]]
        predicted_risk = float(model.predict(features)[0])
        
        # Ensure it's between 0 and 100
        predicted_risk = max(0.0, min(100.0, predicted_risk))
        
        result = {
            "predicted_risk": round(predicted_risk, 1),
            "factors": {
                "hour": hour,
                "incident_density": incident_density,
                "has_event": has_event,
                "is_raining": is_raining
            }
        }
        
        print(json.dumps(result))
        
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)

if __name__ == "__main__":
    predict()
