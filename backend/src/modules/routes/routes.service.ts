import { RouteRequestDto, SafeRouteResponse, HelpCenter } from './routes.interface';
import { Client } from '@googlemaps/google-maps-services-js';
import { env } from '../../config/env.config';

const client = new Client({});

export class RoutesService {
  async getSafeRoute(data: RouteRequestDto): Promise<SafeRouteResponse> {
    if (!env.GOOGLE_MAPS_API_KEY) {
       throw new Error("Google Maps API Key not configured.");
    }

    const response = await client.directions({
      params: {
        origin: [data.originLat, data.originLng],
        destination: [data.destLat, data.destLng],
        key: env.GOOGLE_MAPS_API_KEY,
        alternatives: true,
      }
    });

    if (response.data.routes && response.data.routes.length > 0) {
      const route = response.data.routes[0];
      return {
        polyline: route.overview_polyline.points,
        estimatedTimeMins: Math.ceil((route.legs?.[0]?.duration?.value || 0) / 60),
        safetyScore: 85, // Stub: could calculate based on hotspots
        alertsOnRoute: [],
      };
    }
    
    throw new Error('No route found');
  }

  async getNearbyHelpCenters(lat: number, lng: number): Promise<HelpCenter[]> {
    if (!env.GOOGLE_MAPS_API_KEY) {
       throw new Error("Google Maps API Key not configured.");
    }

    const response = await client.placesNearby({
       params: {
           location: [lat, lng],
           radius: 3000, // 3km radius
           type: 'police',
           key: env.GOOGLE_MAPS_API_KEY,
       }
    });

    const centers = response.data.results.map((place, index) => ({
      id: place.place_id || index.toString(),
      name: place.name || 'Help Center',
      type: 'police' as const,
      lat: place.geometry?.location.lat || lat,
      lng: place.geometry?.location.lng || lng,
      address: place.vicinity || 'Unknown address',
      phone: undefined, // Needs place details API for exact phone
    }));

    return centers;
  }
}
