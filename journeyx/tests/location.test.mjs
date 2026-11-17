import assert from 'node:assert/strict';
import test from 'node:test';
import { distanceMetres, matchPlace, normalizePhone, emergencyMessage, smsLink, currentPosition } from '../lib/location.ts';
import { stops } from '../lib/network.ts';

test('pins match the nearest area and reject distant or invalid coordinates', () => {
    assert.equal(matchPlace(stops[0], stops).stopId, 'fort');
    assert.equal(matchPlace({ lat: 6.9345, lng: 79.8502 }, stops).stopId, 'fort');
    assert.equal(matchPlace({ lat: 7.29, lng: 80.63 }, stops).stopId, null);
    assert.equal(matchPlace(stops[0], []).stopId, null);
    assert.throws(() => matchPlace({ lat: NaN, lng: 80 }, stops));
    assert.throws(() => matchPlace({ lat: 91, lng: 80 }, stops));
    assert.equal(distanceMetres(stops[0], stops[0]), 0);
    assert(Math.abs(distanceMetres({ lat: 0, lng: 0 }, { lat: 0, lng: 1 }) - 111195) < 1);
    const equator = [{ id: 'test', name: 'Test', lat: 0, lng: 0 }];
    assert.equal(matchPlace({ lat: 0, lng: 0.017 }, equator).stopId, 'test');
    assert.equal(matchPlace({ lat: 0, lng: 0.019 }, equator).stopId, null);
});

test('SMS recipients normalize local numbers and reject malformed recipients', () => {
    assert.equal(normalizePhone('077 123 4567'), '+94771234567');
    assert.equal(normalizePhone('+94 (77) 123-4567'), '+94771234567');
    for (const value of ['', '123', 'text', '+0012345678', '0771234567?body=other', '0771234567,0711234567']) {
        assert.equal(normalizePhone(value), null);
    }
});

test('emergency SMS preserves coordinates, accuracy, timestamp and link on both mobile schemes', () => {
    const message = emergencyMessage({ lat: 6.9344, lng: 79.8501 }, 12, Date.UTC(2026, 10, 17));
    assert.match(message, /6.934400,79.850100/);
    assert.match(message, /12 m/);
    assert.match(message, /2026-11-17T00:00:00.000Z/);
    assert.match(message, /https:\/\/www.google.com\/maps\?q=6.934400,79.850100/);
    assert.equal(decodeURIComponent(smsLink('0771234567', message, false).split('?body=')[1]), message);
    assert.equal(decodeURIComponent(smsLink('0771234567', message, true).split('&body=')[1]), message);
    assert.throws(() => smsLink('not a number', message, false));
});

test('geolocation requests a fresh fix and provides readable permission and timeout errors', async () => {
    const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
    const originalNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
    try {
        Object.defineProperty(globalThis, 'window', { configurable: true, value: { isSecureContext: true } });
        let errorCode = 0;
        Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { geolocation: {
            getCurrentPosition(resolve, reject, options) {
                assert.equal(options.maximumAge, 0);
                assert.equal(options.timeout, 15000);
                if (errorCode) reject({ code: errorCode });
                else resolve({ coords: { latitude: 6.9, longitude: 79.8, accuracy: 10 }, timestamp: 1 });
            }
        } } });
        assert.equal((await currentPosition()).coords.latitude, 6.9);
        errorCode = 1;
        await assert.rejects(currentPosition(), /permission was denied/);
        errorCode = 3;
        await assert.rejects(currentPosition(), /timed out/);
        globalThis.window.isSecureContext = false;
        await assert.rejects(currentPosition(), /HTTPS/);
    } finally {
        if (originalWindow) Object.defineProperty(globalThis, 'window', originalWindow);
        else delete globalThis.window;
        if (originalNavigator) Object.defineProperty(globalThis, 'navigator', originalNavigator);
        else delete globalThis.navigator;
    }
});
