const express = require('express');
const router = express.Router();
const { spawn } = require('child_process');
const path = require('path');

// Forecast the risk for a given segment and time
router.post('/', async (req, res) => {
  const { originCoords, destinationCoords, departureTime } = req.body;

  if (!departureTime) {
    return res.status(400).json({ error: "Missing departureTime" });
  }

  // Parse departure time
  const targetTime = new Date(departureTime);
  if (isNaN(targetTime.getTime())) {
    return res.status(400).json({ error: "Invalid departureTime format" });
  }

  const hour = targetTime.getHours();
  const day_of_week = targetTime.getDay();
  
  // Simulate fetching features based on location/time
  // In a real system, you'd query weather API and events DB
  const is_raining = Math.random() < 0.1 ? 1 : 0; // 10% chance of rain
  const has_event = Math.random() < 0.2 ? 1 : 0; // 20% chance of an event
  const incident_density = Math.floor(Math.random() * 40) + 30; // random density 30-70

  const input_data = {
    hour,
    day_of_week,
    incident_density,
    has_event,
    is_raining
  };

  const scriptPath = path.join(__dirname, '../ml/predict_risk.py');
  
  // Also run a baseline for "now" or "30 mins earlier" to compare
  const earlierTime = new Date(targetTime.getTime() - 30 * 60000);
  const earlier_input_data = {
    ...input_data,
    hour: earlierTime.getHours(),
    day_of_week: earlierTime.getDay(),
  };

  try {
    const targetPrediction = await runPythonScript(scriptPath, input_data);
    const earlierPrediction = await runPythonScript(scriptPath, earlier_input_data);

    let advice = "";
    const riskDiff = targetPrediction.predicted_risk - earlierPrediction.predicted_risk;
    
    // Generate AI advice based on the model's predictions
    if (riskDiff > 5) {
      advice = `This route's risk index rises from ${earlierPrediction.predicted_risk} to ${targetPrediction.predicted_risk} around ${formatTime(targetTime)}. Leaving by ${formatTime(earlierTime)} is significantly safer.`;
      if (input_data.has_event) advice += " There's a high likelihood of crowd surges due to a nearby event.";
      if (input_data.is_raining) advice += " Rain reduces visibility and street activity.";
    } else if (riskDiff < -5) {
      advice = `Waiting until ${formatTime(targetTime)} lowers your risk from ${earlierPrediction.predicted_risk} to ${targetPrediction.predicted_risk}. Traffic and crowd conditions will be more favorable.`;
    } else {
      advice = `The risk index remains relatively stable around ${targetPrediction.predicted_risk} for your departure time.`;
      if (targetPrediction.predicted_risk > 70) {
        advice += " However, the baseline risk is high. Please stay vigilant.";
      }
    }

    res.json({
      target_time: targetTime.toISOString(),
      predicted_risk: targetPrediction.predicted_risk,
      factors: targetPrediction.factors,
      comparison: {
        earlier_time: earlierTime.toISOString(),
        predicted_risk: earlierPrediction.predicted_risk
      },
      advice: advice
    });

  } catch (error) {
    console.error("ML Prediction Error:", error);
    res.status(500).json({ error: "Failed to generate risk forecast" });
  }
});

function formatTime(date) {
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

function runPythonScript(scriptPath, data) {
  return new Promise((resolve, reject) => {
    const pythonProcess = spawn('python', [scriptPath, JSON.stringify(data)]);

    let output = '';
    let errorOutput = '';

    pythonProcess.stdout.on('data', (chunk) => {
      output += chunk.toString();
    });

    pythonProcess.stderr.on('data', (chunk) => {
      errorOutput += chunk.toString();
    });

    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        return reject(new Error(`Python script exited with code ${code}: ${errorOutput}`));
      }
      try {
        const result = JSON.parse(output.trim());
        if (result.error) {
          reject(new Error(result.error));
        } else {
          resolve(result);
        }
      } catch (err) {
        reject(new Error(`Failed to parse python output: ${output} - Error: ${err.message}`));
      }
    });
  });
}

module.exports = router;
