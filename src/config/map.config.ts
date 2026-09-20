import * as L from 'leaflet';
import { PoiCategory } from '../models/point-of-interest.model';

L.Icon.Default.imagePath = 'assets/leaflet/';

export const DEFAULT_CENTER: L.LatLngTuple = [4.60641, -74.08132]; // Bogotá
export const DEFAULT_ZOOM = 13;
export const USER_ZOOM = 17;

export const TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
export const TILE_OPTIONS: L.TileLayerOptions = {
  maxZoom: 19,
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
};

export const ROUTE_STYLE: L.PolylineOptions = {
  color: '#3388ff',
  weight: 5,
  opacity: 0.8,
};

export const USER_ICON = L.icon({
  iconUrl: 'assets/icon/home.png',
  iconSize: [40, 40],
  popupAnchor: [0, -10],
});

export const CATEGORY_ICONS: Record<PoiCategory, L.Icon> = {
  hospital: L.icon({ iconUrl: 'assets/icon/hospital.png', iconSize: [50, 50] }),
  general: L.icon({ iconUrl: 'assets/icon/general.png', iconSize: [60, 60] }),
  university: L.icon({
    iconUrl: 'assets/icon/university.png',
    iconSize: [70, 70],
  }),
  food: L.icon({ iconUrl: 'assets/icon/food.png', iconSize: [60, 60] }),
  park: L.icon({ iconUrl: 'assets/icon/park.png', iconSize: [60, 60] }),
};
