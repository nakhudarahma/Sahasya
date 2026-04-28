export interface TimelineGenerationDto {
  incidentId: string;
  transcript: string;
}

export interface RecommendationRequestDto {
  context?: string;
  lat?: number;
  lng?: number;
}
