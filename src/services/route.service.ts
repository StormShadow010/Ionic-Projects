import { Injectable } from '@angular/core';
import * as L from 'leaflet';

export interface RouteResult {
  coords: L.LatLng[];
  distance: number; // metros por calles
}

@Injectable({ providedIn: 'root' })
export class RouteService {
  private readonly baseUrl = 'https://router.project-osrm.org/route/v1/driving';

  async getRoute(from: L.LatLng, to: L.LatLng): Promise<RouteResult> {
    // OSRM usa el orden lng,lat
    const url =
      `${this.baseUrl}/${from.lng},${from.lat};${to.lng},${to.lat}` +
      `?overview=full&geometries=geojson`;

    const response = await fetch(url);
    const data = await response.json();

    if (!data.routes?.length) throw new Error('No route found');

    const route = data.routes[0];
    return {
      // GeoJSON devuelve [lng, lat]; Leaflet necesita [lat, lng]
      coords: route.geometry.coordinates.map(([lng, lat]: [number, number]) =>
        L.latLng(lat, lng),
      ),
      distance: route.distance,
    };
  }
}
