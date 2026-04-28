import { TimelineGenerationDto, RecommendationRequestDto } from './ai.interface';
import { gemini } from '../../config/gemini.config';
import { SafetyService } from '../safety/safety.service';

const safetyService = new SafetyService();

export class AiService {
  async generateTimeline(data: TimelineGenerationDto): Promise<string> {
    if (!gemini) return 'AI not configured';
    
    const prompt = `Extract a chronological structured timeline of events from this incident report or transcript and output it as simple markdown:
Transcript/Description: ${data.transcript}

Please just list the time and event for each point clearly sorted by time.`;

    // Try Flash first, then Pro as fallback
    const models = ['gemini-2.5-flash', 'gemini-pro-latest'];
    
    for (const modelName of models) {
      try {
        const model = gemini.getGenerativeModel({ model: modelName });
        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text() || 'Failed to extract timeline.';
      } catch (err: any) {
        console.warn(`⚠️ Gemini ${modelName} failed:`, err.message || err);
        // If it's a 404 or unsupported error, continue to next model
        if (modelName !== models[models.length - 1]) continue;
      }
    }

    return 'Could not generate timeline due to an error.';
  }

  async getSafetyRecommendations(data: RecommendationRequestDto): Promise<string> {
    if (!gemini) return 'AI not configured';

    const userLat = data.lat ?? 0;
    const userLng = data.lng ?? 0;

    let hotspotContext = 'No specific danger zones reported nearby.';
    
    if (userLat !== 0 && userLng !== 0) {
        try {
            const hotspots = await safetyService.getNearbyHotspots();
            const nearby = hotspots.filter(h => {
                const d = Math.sqrt(Math.pow(h.lat - userLat, 2) + Math.pow(h.lng - userLng, 2));
                return d < 0.01; 
            });

            if (nearby.length > 0) {
                hotspotContext = `The user is near ${nearby.length} safety hotspots:
${nearby.map(h => `- ${h.label} (${h.type}): ${h.description}`).join('\n')}`;
            }
        } catch (e) {
            console.log('Context fetching failed, falling back to generic tips');
        }
    }

    const prompt = `You are SAHASYA, a high-intelligence women's safety AI. 
The user is currently at: Latitude ${userLat}, Longitude ${userLng}.
Context: ${data.context || 'Mobile tracking active.'}

Safety Environment Context:
${hotspotContext}

Based on this context, provide EXACTLY 3 PRIORITY ACTIONS the user should take right now for their safety. 
Focus on emergency preparedness, localized danger, and immediate physical safety.
Keep each action under 10 words.
Output format:
1. [Action 1]
2. [Action 2]
3. [Action 3]`;

    // Try Flash first, then Pro
    const models = ['gemini-2.5-flash', 'gemini-pro-latest'];
    
    for (const modelName of models) {
      try {
        const model = gemini.getGenerativeModel({ model: modelName });
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text() || '';
        if (text.trim()) return text.trim();
      } catch (err: any) {
        console.warn(`⚠️ Gemini ${modelName} failed:`, err.message || err);
        if (modelName !== models[models.length - 1]) continue;
      }
    }

    return '1. Stay alert and observant\n2. Share live location with family\n3. Move towards nearest safe point';
  }
}
