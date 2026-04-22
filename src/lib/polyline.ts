// Google encoded-polyline decoder.
// https://developers.google.com/maps/documentation/utilities/polylinealgorithm
export function decodePolyline(str: string): { lat: number; lng: number }[] {
  let index = 0;
  let lat = 0;
  let lng = 0;
  const out: { lat: number; lng: number }[] = [];

  while (index < str.length) {
    let b: number;
    let shift = 0;
    let result = 0;
    do {
      b = str.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = str.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += dlng;

    out.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }
  return out;
}
