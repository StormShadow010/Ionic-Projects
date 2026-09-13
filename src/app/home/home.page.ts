import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButton,
  IonFooter,
} from '@ionic/angular';
import { Geolocation } from '@capacitor/geolocation';
import * as L from 'leaflet';

L.Icon.Default.imagePath = 'assets/leaflet/';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonFooter],
})
export class HomePage {
  private map!: L.Map;
  private userMarker?: L.Marker;

  constructor() {}

  ionViewDidEnter(): void {
    if (!this.map) {
      this.initializeMap();
    }
    this.map.invalidateSize();
  }

  private initializeMap(): void {
    this.map = L.map('map').setView([4.60641, -74.08132], 17);

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.map);

    L.marker([4.60641, -74.08132])
      .addTo(this.map)
      .bindPopup('A pretty CSS popup.<br> Easily customizable.')
      .openPopup();
  }

  async Point(): Promise<void> {
    try {
      const perm = await Geolocation.checkPermissions();
      if (perm.location !== 'granted') {
        await Geolocation.requestPermissions();
      }

      const point = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
      });
      const { latitude: lat, longitude: lng } = point.coords;

      this.userMarker?.remove();
      this.userMarker = L.marker([lat, lng])
        .addTo(this.map)
        .bindPopup('You are here!')
        .openPopup();

      this.map.setView([lat, lng], 17);
    } catch (err) {
      console.error('Geolocation error:', err);
    }
  }
}
