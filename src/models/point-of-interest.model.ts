export type PoiCategory =
  | 'hospital'
  | 'general'
  | 'university'
  | 'food'
  | 'park';

export interface PointOfInterest {
  name: string;
  category: PoiCategory;
  lat: number;
  lng: number;
}
