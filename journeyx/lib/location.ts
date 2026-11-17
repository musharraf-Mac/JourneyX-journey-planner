export type Point = { lat: number; lng: number };
export type SelectedPlace = Point & { stopId: string | null; distance: number; label: string };
export const MAX_STOP_DISTANCE_METRES = 2000;

export function distanceMetres(a: Point, b: Point) {
    const rad = Math.PI / 180;
    const h = Math.sin((b.lat - a.lat) * rad / 2) ** 2
        + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin((b.lng - a.lng) * rad / 2) ** 2;
    return 6371000 * 2 * Math.asin(Math.sqrt(Math.min(1, Math.max(0, h))));
}

export function matchPlace(point: Point, stops: (Point & { id: string; name: string })[], label = 'Map pin'): SelectedPlace {
    if (!Number.isFinite(point.lat) || !Number.isFinite(point.lng) || Math.abs(point.lat) > 90 || Math.abs(point.lng) > 180) {
        throw new Error('Choose a valid map location.');
    }
    const nearest = stops.map(stop => ({ stop, distance: distanceMetres(point, stop) }))
        .sort((a, b) => a.distance - b.distance)[0];
    return { ...point, label, stopId: nearest && nearest.distance <= MAX_STOP_DISTANCE_METRES ? nearest.stop.id : null,
        distance: nearest?.distance ?? Infinity };
}

export function currentPosition(): Promise<GeolocationPosition> {
    return new Promise((resolve, reject) => {
        if (!window.isSecureContext || !navigator.geolocation) {
            reject(new Error('Location needs HTTPS or localhost and a browser with location support.'));
            return;
        }
        navigator.geolocation.getCurrentPosition(resolve, error => reject(new Error(error.code === 1
            ? 'Location permission was denied. Allow location in your browser settings and try again.'
            : error.code === 3 ? 'Location request timed out. Try again with a better signal.'
                : 'Your location is unavailable. Check your device location settings and try again.')),
        { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 });
    });
}

export function normalizePhone(value: string) {
    const phone = value.trim().replace(/[\s()-]/g, '');
    if (/^0\d{9}$/.test(phone)) return `+94${phone.slice(1)}`;
    if (/^\+[1-9]\d{7,14}$/.test(phone)) return phone;
    return null;
}

export function emergencyMessage(point: Point, accuracy: number, timestamp: number) {
    const coordinates = `${point.lat.toFixed(6)},${point.lng.toFixed(6)}`;
    return `I need help. My current location: ${coordinates} (accuracy about ${Math.round(accuracy)} m). Captured ${new Date(timestamp).toISOString()}. Map: https://www.google.com/maps?q=${coordinates}`;
}

export function smsLink(phone: string, message: string, appleDevice: boolean) {
    const recipient = normalizePhone(phone);
    if (!recipient) throw new Error('Enter a Sri Lankan 10-digit number or an international number starting with +.');
    return `sms:${recipient}${appleDevice ? '&' : '?'}body=${encodeURIComponent(message)}`;
}
