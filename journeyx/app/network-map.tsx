'use client';

import { useEffect, useRef, useState } from 'react';
import type { LayerGroup, Map as LeafletMap, LeafletMouseEvent } from 'leaflet';
import { connections, stops, type Disruption, type Journey } from '@/lib/network';
import type { Point, SelectedPlace } from '@/lib/location';
import { Icon } from './components';

type MapInstance = {
    map: LeafletMap;
    leaflet: typeof import('leaflet');
    routes: LayerGroup;
    location: LayerGroup;
    selections: LayerGroup;
};

const coordinates = stops.map(({ lat, lng }): [number, number] => [lat, lng]);
const stopCoordinates = new Map(stops.map((stop, index) => [stop.id, coordinates[index]]));
const attribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

export function NetworkMap({ journey, network, disruptions, fromPlace, toPlace, pickMode, onPickMode, onPick }: {
    journey?: Journey;
    network: boolean;
    disruptions: Disruption[];
    fromPlace: SelectedPlace;
    toPlace: SelectedPlace;
    pickMode: 'from' | 'to';
    onPickMode: (mode: 'from' | 'to') => void;
    onPick: (point: Point, mode: 'from' | 'to') => void;
}) {
    const canvas = useRef<HTMLDivElement>(null);
    const watchId = useRef<number | null>(null);
    const [instance, setInstance] = useState<MapInstance>();
    const [mapStatus, setMapStatus] = useState('Loading street map…');
    const [locationStatus, setLocationStatus] = useState('');
    const [tracking, setTracking] = useState(false);

    useEffect(() => {
        let cancelled = false;
        let map: LeafletMap | undefined;
        let resizeObserver: ResizeObserver | undefined;
        async function initialize() {
            const leaflet = await import('leaflet');
            const container = canvas.current;
            if (cancelled || !container) return;

            const current = leaflet.map(container, { scrollWheelZoom: false, doubleClickZoom: false });
            map = current;
            current.setView([6.91, 79.9], 12);
            current.attributionControl.setPrefix(false);
            const tiles = leaflet.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
                maxZoom: 19,
                attribution,
            }).addTo(current);
            tiles.on('load', () => setMapStatus(''));
            tiles.on('tileerror', () => setMapStatus('Some street tiles could not load. Check your connection.'));
            current.createPane('journey-location').style.zIndex = '450';

            let fitted = false;
            resizeObserver = new ResizeObserver(() => {
                if (!container.clientWidth || !container.clientHeight) return;
                current.invalidateSize({ pan: false });
                if (!fitted) {
                    fitted = true;
                    current.fitBounds(coordinates, { padding: [25, 25] });
                }
            });
            resizeObserver.observe(container);
            setInstance({
                map: current,
                leaflet,
                routes: leaflet.layerGroup().addTo(current),
                location: leaflet.layerGroup().addTo(current),
                selections: leaflet.layerGroup().addTo(current),
            });
        }
        initialize().catch(() => {
            if (!cancelled) setMapStatus('Street map could not be loaded.');
        });
        return () => {
            cancelled = true;
            resizeObserver?.disconnect();
            if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
            watchId.current = null;
            map?.remove();
        };
    }, []);

    useEffect(() => {
        if (!instance) return;
        const pick = (event: LeafletMouseEvent) => {
            // Stop following so a subsequent GPS update cannot move the map while selecting.
            if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
            watchId.current = null;
            instance.location.clearLayers();
            setTracking(false);
            setLocationStatus('');
            const point = event.latlng.wrap();
            onPick({ lat: point.lat, lng: point.lng }, pickMode);
        };
        instance.map.on('dblclick', pick);
        return () => { instance.map.off('dblclick', pick); };
    }, [instance, onPick, pickMode]);

    useEffect(() => {
        if (!instance) return;
        const { leaflet, selections, map } = instance;
        selections.clearLayers();
        for (const [label, place, color] of [['Start', fromPlace, '#2365cf'], ['Destination', toPlace, '#ce4f1b']] as const) {
            const point: [number, number] = [place.lat, place.lng];
            leaflet.circleMarker(point, { radius: 10, color, fillColor: color, fillOpacity: 0.8, weight: 3 })
                .bindTooltip(`${label}${place.stopId ? ` · ${stops.find(s => s.id === place.stopId)?.name}` : ' · Outside coverage'}`, { permanent: true, direction: 'top' }).addTo(selections);
            const stop = stopCoordinates.get(place.stopId ?? '');
            if (stop && place.distance > 30) {
                leaflet.polyline([point, stop], { color, weight: 2, dashArray: '3 6' })
                    .bindTooltip('Straight-line distance to covered area; not a walking route').addTo(selections);
            }
        }
        map.fitBounds([[fromPlace.lat, fromPlace.lng], [toPlace.lat, toPlace.lng]], { padding: [42, 42], maxZoom: 15 });
    }, [instance, fromPlace, toPlace]);

    useEffect(() => {
        if (!instance) return;
        const { leaflet, routes } = instance;
        routes.clearLayers();
        const routeStops = new Set(journey?.nodes);
        const selectedLegs = new Set(journey?.legs.map(leg => leg.id));

        for (const edge of connections) {
            const selected = selectedLegs.has(edge.id);
            const disruption = disruptions.find(item => item.edgeId === edge.id);
            if (!network && !selected && !disruption) continue;
            leaflet.polyline([stopCoordinates.get(edge.from)!, stopCoordinates.get(edge.to)!], {
                color: disruption ? '#b43a44' : selected ? '#ce4f1b' : '#52667e',
                weight: selected ? 5 : 3,
                opacity: selected || disruption ? 1 : 0.55,
                dashArray: '7 8',
            }).bindTooltip(`Bus ${edge.service}${disruption ? disruption.kind === 'closed' ? ' · Simulated closure' : ` · +${disruption.delay} min simulation` : ''}`).addTo(routes);
        }

        for (const stop of stops) {
            const selected = routeStops.has(stop.id);
            leaflet.circleMarker([stop.lat, stop.lng], {
                radius: selected ? 6 : 4,
                color: selected ? '#ce4f1b' : '#465c72',
                weight: 2,
                fillColor: '#fff',
                fillOpacity: 1,
            }).bindTooltip(stop.name).addTo(routes);
        }
    }, [instance, journey, network, disruptions]);

    function stopTracking(status = 'Location tracking stopped.') {
        if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
        watchId.current = null;
        instance?.location.clearLayers();
        setTracking(false);
        setLocationStatus(status);
    }

    function startTracking() {
        if (!instance) return;
        if (!window.isSecureContext || !navigator.geolocation) {
            setLocationStatus('Location needs a supported browser on HTTPS or localhost.');
            return;
        }
        const { leaflet, map, location } = instance;
        setTracking(true);
        setLocationStatus('Waiting for your location…');
        try {
            watchId.current = navigator.geolocation.watchPosition(({ coords }) => {
                const point: [number, number] = [coords.latitude, coords.longitude];
                location.clearLayers();
                leaflet.circle(point, {
                    pane: 'journey-location', radius: coords.accuracy, color: '#2365cf', fillOpacity: 0.14,
                }).addTo(location);
                leaflet.circleMarker(point, {
                    pane: 'journey-location', radius: 8, color: '#fff', weight: 2,
                    fillColor: '#2365cf', fillOpacity: 1,
                }).bindTooltip('Your location').addTo(location);
                map.setView(point, Math.max(map.getZoom(), coords.accuracy > 300 ? 14 : 16), { animate: false });
                setLocationStatus(`Following your location · accuracy ±${Math.round(coords.accuracy)} m`);
            }, error => {
                const message = error.code === 1
                    ? 'Location permission was denied. Allow it in your browser settings and try again.'
                    : 'Your location could not be determined. Try again when your device has a better signal.';
                stopTracking(message);
            }, { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 });
        } catch {
            stopTracking('Your browser could not start location tracking.');
        }
    }

    function fitRoute() {
        if (!instance) return;
        if (tracking) stopTracking();
        const points = journey?.nodes.map(id => stopCoordinates.get(id)!) ?? coordinates;
        instance.map.fitBounds(points, { padding: [32, 32], maxZoom: 16 });
    }

    return <div className="street-map">
        <div className="map-picking" role="group" aria-label="Map selection">
            <button className="secondary" type="button" aria-pressed={pickMode === 'from'} onClick={() => onPickMode('from')}>1 · Pick start</button>
            <button className="secondary" type="button" aria-pressed={pickMode === 'to'} onClick={() => onPickMode('to')}>2 · Pick destination</button>
            <p>Double-click or double-tap to set your {pickMode === 'from' ? 'start' : 'destination'}. On touch or keyboard, move the map and use its centre.</p>
            <button className="text-button" type="button" disabled={!instance} onClick={() => {
                if (!instance) return;
                if (tracking) stopTracking();
                const centre = instance.map.getCenter().wrap();
                onPick({ lat: centre.lat, lng: centre.lng }, pickMode);
            }}>Use map centre as {pickMode === 'from' ? 'start' : 'destination'}</button>
        </div>
        <div className="street-map-tools">
            <button type="button" className="secondary" disabled={!instance} onClick={fitRoute}>
                <Icon name="route" size={16}/> {journey ? 'Show bus route' : 'Show network'}
            </button>
            <button type="button" className="secondary" disabled={!instance} aria-pressed={tracking}
                onClick={() => tracking ? stopTracking() : startTracking()}>
                <Icon name="pin" size={16}/> {tracking ? 'Stop tracking' : 'Track my location'}
            </button>
        </div>
        <div className="map-canvas-wrap"><div className="map street-map-canvas" ref={canvas} role="region" aria-label="Colombo bus street map"/><span className="map-crosshair" aria-hidden="true">+</span></div>
        <div className="street-map-info">
            <div className="map-selected-places" aria-live="polite">
                {([['Start', fromPlace], ['Destination', toPlace]] as const).map(([label, place]) => <p key={label}>
                    <strong>{label}:</strong> {place.stopId ? stops.find(stop => stop.id === place.stopId)?.name : 'Outside current coverage — no covered bus area within 2 km'}
                    {place.stopId && place.distance > 30 ? ` · ${Math.round(place.distance)} m straight-line from pin` : ''}
                </p>)}
            </div>
            {mapStatus && <p role="status">{mapStatus}</p>}
            {locationStatus && <p role="status">{locationStatus}</p>}
            <p>Dashed lines connect approximate bus stop areas.</p>
            <p>Pins connect to the nearest covered area within 2 km. Dotted connectors are straight-line distances, not walking directions. Coverage remains limited to the listed bus network.</p>
        </div>
    </div>;
}
