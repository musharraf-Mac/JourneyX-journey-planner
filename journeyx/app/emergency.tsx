'use client';

import { useEffect, useRef, useState } from 'react';
import { Modal } from './components';
import { currentPosition, emergencyMessage, normalizePhone, smsLink } from '@/lib/location';

export function EmergencyDialog({ onClose }: { onClose: () => void }) {
    const [phone, setPhone] = useState('');
    const [message, setMessage] = useState('');
    const [status, setStatus] = useState('');
    const [busy, setBusy] = useState(false);
    const [apple, setApple] = useState(false);
    const mounted = useRef(true);
    useEffect(() => {
        mounted.current = true;
        return () => { mounted.current = false; };
    }, []);
    async function prepare() {
        setApple(/iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));
        setMessage('');
        if (!normalizePhone(phone)) {
            setStatus('Enter a Sri Lankan 10-digit number or an international number starting with +.');
            return;
        }
        setBusy(true);
        setStatus('Getting a fresh location…');
        try {
            const position = await currentPosition();
            if (!mounted.current) return;
            setMessage(emergencyMessage({ lat: position.coords.latitude, lng: position.coords.longitude }, position.coords.accuracy, position.timestamp));
            setStatus('Location ready. Open your SMS app, check the recipient, then tap Send.');
        } catch (error) {
            if (mounted.current) setStatus(error instanceof Error ? error.message : 'Could not get your location.');
        } finally {
            if (mounted.current) setBusy(false);
        }
    }
    return <Modal title="Share emergency location" onClose={onClose}>
        <p className="muted">Send your coordinates and a map link to someone you trust. This opens your SMS app; JourneyX cannot send or confirm delivery.</p>
        <form onSubmit={event => { event.preventDefault(); void prepare(); }}>
            <label className="form-field">Recipient phone number
                <input type="tel" inputMode="tel" autoComplete="tel" required maxLength={30} placeholder="07XXXXXXXX or +94…"
                    value={phone} disabled={busy} onChange={event => { setPhone(event.target.value); setMessage(''); setStatus(''); }}/>
            </label>
            <button className="primary" disabled={busy}>{busy ? 'Getting location…' : message ? 'Refresh location' : 'Prepare location SMS'}</button>
        </form>
        <p role="status" className="emergency-status">{status}</p>
        {message && normalizePhone(phone) && <div className="emergency-preview">
            <label className="form-field">Message preview<textarea readOnly value={message} rows={5}/></label>
            <div className="emergency-actions">
                <a className="primary" href={smsLink(phone, message, apple)} onClick={() => setStatus('SMS app requested. Tap Send there to share. If no app opens, copy the message below.')}>Open SMS app</a>
                <button className="secondary" onClick={async () => {
                    try { await navigator.clipboard.writeText(message); setStatus('Message copied. Paste it into your messaging app and send it.'); }
                    catch { setStatus('Copy is unavailable. Select the message above and copy it manually.'); }
                }}>Copy message</button>
            </div>
        </div>}
        <p className="muted emergency-status">Your phone number and coordinates are not saved. SMS availability and charges depend on your device and carrier.</p>
    </Modal>;
}
