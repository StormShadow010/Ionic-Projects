import {
  Component,
  ElementRef,
  OnDestroy,
  viewChild,
  signal,
} from '@angular/core';
import { IonHeader, IonToolbar, IonTitle, IonContent } from '@ionic/angular';
import * as L from 'leaflet';
@Component({
  selector: 'app-tab1',
  templateUrl: 'tab1.page.html',
  styleUrls: ['tab1.page.scss'],
  imports: [IonHeader, IonToolbar, IonTitle, IonContent],
})
export class Tab1Page implements OnDestroy {
  constructor() {}
  // Referencia al <div #mapContainer> del HTML
  private mapContainer =
    viewChild.required<ElementRef<HTMLDivElement>>('mapContainer');

  // Instancia del mapa (undefined hasta que se crea)
  private map = signal<L.Map | undefined>(undefined);

  // Se ejecuta cada vez que el tab se vuelve visible
  ionViewDidEnter() {
    if (!this.map()) {
      this.initMap();
    }
    setTimeout(() => this.map()?.invalidateSize(), 100);
  }

  // Crea el mapa y le agrega la capa de titles de OpenStreetMap
  private initMap() {
    const map = L.map(this.mapContainer().nativeElement).setView(
      [4.6097, -74.0817],
      13,
    );

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    this.map.set(map);
  }

  // Libera el mapa al destruir el componente
  ngOnDestroy() {
    this.map()?.remove();
  }
}
