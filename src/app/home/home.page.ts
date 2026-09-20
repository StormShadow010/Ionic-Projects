import {
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  inject,
  signal,
} from '@angular/core';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButton,
  IonFooter,
} from '@ionic/angular';
import * as L from 'leaflet';

import { PointOfInterest } from '../../models/point-of-interest.model';
import { POINTS_OF_INTEREST } from '../../data/points-of-interest.data';
import {
  CATEGORY_ICONS,
  DEFAULT_CENTER,
  DEFAULT_ZOOM,
  ROUTE_STYLE,
  TILE_OPTIONS,
  TILE_URL,
  USER_ICON,
  USER_ZOOM,
} from '../../config/map.config';
import { LocationService } from '../../services/location.service';
import { RouteService } from '../../services/route.service';
import { formatDistance } from '../../utils/format-distance';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonFooter],
})
export class HomePage {
  private locationService = inject(LocationService);
  private routeService = inject(RouteService);

  private map!: L.Map;
  private userMarker?: L.Marker;
  private userLocation?: L.LatLng;
  private currentRoute?: L.Polyline;
  private poiLayer = L.layerGroup();

  // signal: Angular actualiza la vista apenas cambia, aunque el cambio venga de Leaflet
  hasRoute = signal(false);

  ionViewDidEnter(): void {
    if (!this.map) {
      this.createMap();
      this.showPointsOfInterest();
      this.locateUser();
    }
    // Ionic termina la animación de entrada antes de que el div tenga tamaño real
    setTimeout(() => this.map.invalidateSize(), 0);
  }

  async locateUser(): Promise<void> {
    const location = await this.locationService.getCurrentLocation();
    if (!location) return;

    this.userLocation = location;

    this.userMarker?.remove();
    this.userMarker = L.marker(location, { icon: USER_ICON })
      .addTo(this.map)
      .bindPopup('You are here!')
      .openPopup();

    this.map.setView(location, USER_ZOOM);
  }

  clearRoute(): void {
    this.currentRoute?.remove();
    this.currentRoute = undefined;
    this.hasRoute.set(false);
    this.map.closePopup();
  }

  private createMap(): void {
    this.map = L.map('map').setView(DEFAULT_CENTER, DEFAULT_ZOOM);
    L.tileLayer(TILE_URL, TILE_OPTIONS).addTo(this.map);
  }

  private showPointsOfInterest(): void {
    this.poiLayer.clearLayers();

    POINTS_OF_INTEREST.forEach((p) => {
      const marker = L.marker([p.lat, p.lng], {
        icon: CATEGORY_ICONS[p.category],
      })
        .bindPopup(this.popupBase(p))
        .addTo(this.poiLayer);

      marker.on('click', () => this.drawRoute(p, marker));
    });

    this.poiLayer.addTo(this.map);

    // Ajusta el zoom para que se vean todos
    const bounds = L.latLngBounds(
      POINTS_OF_INTEREST.map((p) => [p.lat, p.lng] as L.LatLngTuple),
    );
    this.map.fitBounds(bounds, { padding: [40, 40] });
  }

  private async drawRoute(p: PointOfInterest, marker: L.Marker): Promise<void> {
    const base = this.popupBase(p);

    if (!this.userLocation) {
      marker.setPopupContent(`${base}<br><i>Ubicación no disponible</i>`);
      return;
    }

    marker.setPopupContent(`${base}<br>Calculando...`);
    const destination = L.latLng(p.lat, p.lng);

    try {
      const { coords, distance } = await this.routeService.getRoute(
        this.userLocation,
        destination,
      );

      this.currentRoute?.remove();
      this.currentRoute = L.polyline(coords, ROUTE_STYLE).addTo(this.map);
      this.hasRoute.set(true);

      marker.setPopupContent(
        `${base}<br>Distance: ${formatDistance(distance)}`,
      );
      this.map.fitBounds(this.currentRoute.getBounds(), { padding: [50, 50] });
    } catch (err) {
      // Si OSRM falla, muestra al menos la distancia en línea recta
      const straight = this.userLocation.distanceTo(destination);
      marker.setPopupContent(
        `${base}<br>Distancia (línea recta): ${formatDistance(straight)}`,
      );
      console.error('Route error:', err);
    }
  }

  private popupBase(p: PointOfInterest): string {
    return `<b>${p.name}</b><br>${p.category}`;
  }
}
