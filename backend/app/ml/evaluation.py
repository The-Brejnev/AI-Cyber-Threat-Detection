import os
import json

def load_metrics() -> dict:
    model_dir = os.path.join(os.path.dirname(__file__), 'models')
    try:
        with open(os.path.join(model_dir, 'metrics.json'), 'r') as f:
            return json.load(f)
    except:
        return {"message": "Metrics not found"}
