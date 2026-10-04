import {
  Component,
  ElementRef,
  OnDestroy,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { DecimalPipe } from '@angular/common';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonFooter,
  IonModal,
  IonFab,
  IonFabButton,
  IonIcon,
} from '@ionic/angular';
import { Geolocation } from '@capacitor/geolocation';
import { addIcons } from 'ionicons';
import { cameraOutline, locateOutline } from 'ionicons/icons';
import * as L from 'leaflet';
import { Coordinates, PhotoRecord } from '../models/photo-record';
import { PhotoStore } from '../services/photo';
import {
  PhotoForm,
  PhotoFormData,
} from '../components/photo-form/photo-form.component';

// Ícono explícito con las imágenes copiadas en angular.json
const markerIcon = L.icon({
  iconUrl: 'assets/leaflet/marker-icon.png',
  iconRetinaUrl: 'assets/leaflet/marker-icon-2x.png',
  shadowUrl: 'assets/leaflet/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

@Component({
  selector: 'app-tab1',
  templateUrl: 'tab1.page.html',
  styleUrls: ['tab1.page.scss'],
  imports: [
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonFooter,
    IonModal,
    IonFab,
    IonFabButton,
    IonIcon,
    DecimalPipe,
    PhotoForm,
  ],
})
export class Tab1Page implements OnDestroy {
  private photoStore = inject(PhotoStore);

  private mapContainer =
    viewChild.required<ElementRef<HTMLDivElement>>('mapContainer');
  private map = signal<L.Map | undefined>(undefined);

  // Capa con los marcadores de los registros
  private markersLayer = L.layerGroup();

  // Punto azul de "estás aquí"
  private userMarker = L.circleMarker([0, 0], {
    radius: 8,
    color: '#ffffff',
    weight: 3,
    fillColor: '#1a73e8',
    fillOpacity: 1,
  });

  // Punto seleccionado para un nuevo registro (null cuando no hay ninguno)
  protected selectedPoint = signal<Coordinates | null>(null);

  // Controla si el modal está abierto
  protected isModalOpen = signal(false);

  // Última ubicación conocida del usuario
  protected userLocation = signal<Coordinates | null>(null);

  // true mientras se espera la respuesta del GPS
  protected locating = signal(false);

  constructor() {
    addIcons({ locateOutline, cameraOutline });

    // Redibuja los marcadores cuando cambia el mapa o la lista
    effect(() => {
      const map = this.map();
      const records = this.photoStore.records();
      if (!map) return;
      this.renderMarkers(records);
    });

    // Mueve el punto azul cuando cambia la ubicación del usuario
    effect(() => {
      const map = this.map();
      const location = this.userLocation();
      if (!map || !location) return;

      this.userMarker.setLatLng([location.lat, location.lng]);
      if (!map.hasLayer(this.userMarker)) {
        this.userMarker.addTo(map);
      }
    });
  }

  ionViewDidEnter() {
    if (!this.map()) {
      this.initMap();
    }
    setTimeout(() => this.map()?.invalidateSize(), 100);
  }

  private initMap() {
    const map = L.map(this.mapContainer().nativeElement).setView(
      [4.6097, -74.0817],
      13,
    );

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    this.markersLayer.addTo(map);
    map.on('click', (e: L.LeafletMouseEvent) => this.onMapClick(e));

    this.map.set(map);
  }

  // ───────── Ubicación ─────────

  // Botón 📍: centra el mapa en la ubicación actual
  protected async locateMe() {
    const coords = await this.getCurrentPosition();
    if (!coords) return;
    this.map()?.setView([coords.lat, coords.lng], 17);
  }

  // Botón 📷: localiza y abre el formulario en la ubicación actual
  protected async photoAtMyLocation() {
    const coords = await this.getCurrentPosition();
    if (!coords) return;
    this.map()?.setView([coords.lat, coords.lng], 17);
    this.openForm(coords);
  }

  // Pide la posición al GPS; devuelve null si falla o se niega el permiso
  private async getCurrentPosition(): Promise<Coordinates | null> {
    this.locating.set(true);
    try {
      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10000,
      });
      const coords = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      };
      this.userLocation.set(coords);
      return coords;
    } catch (e) {
      console.error('No se pudo obtener la ubicación:', e);
      return null;
    } finally {
      this.locating.set(false);
    }
  }

  // ───────── Modal ─────────

  private onMapClick(e: L.LeafletMouseEvent) {
    const { lat, lng } = e.latlng;
    this.openForm({ lat, lng });
  }

  // Punto único para abrir el formulario (clic en el mapa o botón 📷)
  private openForm(point: Coordinates) {
    this.selectedPoint.set(point);
    this.isModalOpen.set(true);
  }

  protected closeModal() {
    this.isModalOpen.set(false);
  }

  protected onModalDismissed() {
    this.isModalOpen.set(false);
    this.selectedPoint.set(null);
  }

  protected async onSaved(data: PhotoFormData) {
    const point = this.selectedPoint();
    if (!point) return;

    try {
      await this.photoStore.add({
        position: point,
        description: data.description,
        photo: data.photo,
      });
      this.closeModal();
    } catch (e) {
      console.error('No se pudo guardar el registro:', e);
    }
  }

  // ───────── Marcadores ─────────

  private renderMarkers(records: PhotoRecord[]) {
    this.markersLayer.clearLayers();

    for (const record of records) {
      L.marker([record.position.lat, record.position.lng], { icon: markerIcon })
        .bindPopup(this.buildPopup(record))
        .addTo(this.markersLayer);
    }
  }

  private buildPopup(record: PhotoRecord): HTMLElement {
    const container = document.createElement('div');
    container.className = 'photo-popup';

    if (record.webviewPath) {
      const img = document.createElement('img');
      img.src = record.webviewPath;
      img.alt = record.description;
      container.appendChild(img);
    }

    const description = document.createElement('p');
    description.className = 'description';
    description.textContent = record.description;
    container.appendChild(description);

    const date = document.createElement('p');
    date.className = 'meta';
    date.textContent = new Date(record.timestamp).toLocaleString('es-CO', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
    container.appendChild(date);

    const coords = document.createElement('p');
    coords.className = 'meta';
    coords.textContent = `${record.position.lat.toFixed(6)}, ${record.position.lng.toFixed(6)}`;
    container.appendChild(coords);

    return container;
  }

  ngOnDestroy() {
    this.map()?.remove();
  }
}
