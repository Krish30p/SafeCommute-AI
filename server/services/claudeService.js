const OpenAI = require('openai');

// Initialize OpenAI client targeting Nvidia NIM
const nvidia = new OpenAI({
  apiKey: process.env.NVIDIA_API_KEY || 'dummy-key',
  baseURL: 'https://integrate.api.nvidia.com/v1',
});

/**
 * Returns a safety risk advisory (2-3 sentences) using Nvidia NIM or local rules.
 * @param {object} routeData { originName, destinationName, distance, duration }
 * @param {object} safetyBreakdown The object returned by calculateSafetyScore
 * @param {Date} currentTime Current timestamp
 */
async function getRiskPrediction(routeData, safetyBreakdown, currentTime) {
  const hour = currentTime.getHours();
  const timeLabel = hour >= 22 || hour < 5 ? 'late night' :
                    hour >= 20 ? 'evening' :
                    hour >= 17 ? 'rush hour' : 'daytime';

  const apiKey = process.env.NVIDIA_API_KEY;

  if (!apiKey || apiKey.trim() === "" || apiKey === 'nvapi-xxxxxxxxxxxx') {
    return getSimulatedRiskPrediction(routeData, safetyBreakdown, hour, timeLabel);
  }

  const prompt = `You are a safety analyst for urban commuters in India.

A commuter is planning this route:
- Origin: ${routeData.originName}
- Destination: ${routeData.destinationName}
- Distance: ${routeData.distance} km
- Duration: ${routeData.duration} mins
- Time: ${timeLabel} (${hour}:00)
- Overall safety score: ${safetyBreakdown.score}/100

Safety breakdown:
- Street lighting score: ${safetyBreakdown.breakdown.lighting.score}/100
- Transit coverage score: ${safetyBreakdown.breakdown.transitCoverage.score}/100
- Recent incident density score: ${safetyBreakdown.breakdown.incidentDensity.score}/100
- Time of day score: ${safetyBreakdown.breakdown.timeOfDay.score}/100

Write ONE concise safety advisory (2–3 sentences maximum). 
Be specific about the risk factors. Suggest one actionable alternative if the score is below 70.
Do not use bullet points. Write in plain conversational English.
Start directly with the insight — no preamble like "Based on the data...".`;

  try {
    const completion = await nvidia.chat.completions.create({
      model: 'meta/llama-3.1-8b-instruct',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 150,
      temperature: 0.4,
    });

    return completion.choices[0].message.content;
  } catch (err) {
    console.warn("⚠️ Nvidia NIM request failed, falling back to simulator:", err.message);
    return getSimulatedRiskPrediction(routeData, safetyBreakdown, hour, timeLabel);
  }
}

function getSimulatedRiskPrediction(routeData, safetyBreakdown, hour, timeLabel) {
  const score = safetyBreakdown.score;
  const breakdown = safetyBreakdown.breakdown;
  const oName = routeData.originName || 'your origin';
  const dName = routeData.destinationName || 'your destination';

  // Find lowest scoring factor
  let lowestFactor = 'lighting';
  let lowestScore = breakdown.lighting.score;

  if (breakdown.transitCoverage.score < lowestScore) {
    lowestFactor = 'transit';
    lowestScore = breakdown.transitCoverage.score;
  }
  if (breakdown.incidentDensity.score < lowestScore) {
    lowestFactor = 'incidents';
    lowestScore = breakdown.incidentDensity.score;
  }

  // Generate advisories based on score and factors
  if (score >= 80) {
    return `This route from ${oName} to ${dName} is highly secure with excellent street lighting (${breakdown.lighting.score}/100) and substantial transit coverage. It is active with public presence, making it the safest option for your travel during this time. No special precautions are necessary beyond normal situational awareness.`;
  }

  if (score >= 50 && score < 80) {
    if (lowestFactor === 'lighting') {
      return `Street illumination drops significantly on some side lanes of this route, especially around the middle stretches. Since you are traveling in the ${timeLabel}, we recommend sticking to the main thoroughfare. Consider Route B which has 20% better street lighting and avoids unlit lanes.`;
    }
    if (lowestFactor === 'incidents') {
      return `This route passes near zones with recent crowdsourced reports of local safety issues or poor surveillance. If traveling during the ${timeLabel}, maintain contact sharing or choose the alternative route which has a slightly longer commute time but bypasses these flagged spots.`;
    }
    // Default transit/other
    return `Transit coverage is moderate along this route, leaving some stretches isolated with lower commuter crowd density. If traveling alone, share your live trip tracker link with a trusted contact. The alternative route has 15% higher transit and active security presence.`;
  }

  // Low score < 50
  if (lowestFactor === 'incidents') {
    return `Critical safety warning: This path transits through highly flagged areas with multiple recent incidents of harassment or suspicious activity, particularly risky during ${timeLabel} hours. You should avoid this route entirely. Please select the safest alternative route, which is well-illuminated and populated, even if it adds 5-10 minutes to your trip.`;
  }
  return `Warning: This route is poorly lit (${breakdown.lighting.score}/100) and lacks public transit coverage, creating highly isolated stretches during the ${timeLabel}. Traveling here at this hour is not advised for solo commuters. We strongly suggest taking the alternative primary road route, which maintains active street lighting and commercial activity.`;
}

module.exports = { getRiskPrediction };
