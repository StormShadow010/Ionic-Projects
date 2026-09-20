import { Injectable } from '@angular/core';
import { Geolocation } from '@capacitor/geolocation';
import * as L from 'leaflet';

@Injectable({ providedIn: 'root' })
export class LocationService {
  /** Devuelve la ubicación actual, o null si no hay permiso o falla el GPS. */
  async getCurrentLocation(): Promise<L.LatLng | null> {
    try {
      const perm = await Geolocation.checkPermissions();
      if (perm.location !== 'granted') {
        const req = await Geolocation.requestPermissions();
        if (req.location !== 'granted') return null;
      }

      const { coords } = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
      });
      return L.latLng(coords.latitude, coords.longitude);
    } catch (err) {
      console.error('Geolocation error:', err);
      return null;
    }
  }
}
