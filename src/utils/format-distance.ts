export function formatDistance(meters: number): string {
  return meters < 1000
    ? `${meters.toFixed(0)} m`
    : `${(meters / 1000).toFixed(2)} km`;
}
