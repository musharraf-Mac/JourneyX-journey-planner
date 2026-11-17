'use client';
import { useEffect, useRef, type ReactNode } from 'react';
export function Icon({ name, size = 20 }: {
    name: string;
    size?: number;
}) {
    const paths: Record<string, ReactNode> = { emergency: <><path d="M12 3 2 21h20L12 3Z"/><path d="M12 9v5m0 3h.01"/></>, chat: <><path d="M21 11a8 8 0 0 1-8 8H6l-4 3V11a9 9 0 0 1 19 0Z"/><path d="M7 11h.01M12 11h.01M17 11h.01"/></>, route: <><circle cx="5" cy="5" r="2"/><circle cx="19" cy="19" r="2"/><path d="M7 5h8a4 4 0 0 1 0 8H9a4 4 0 0 0 0 8h8"/></>, bus: <><rect x="5" y="3" width="14" height="16" rx="3"/><path d="M5 11h14M8 6h8M8 19v2m8-2v2M8 15h1m6 0h1"/></>, clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>, shield: <><path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6z"/><path d="m8 12 3 3 5-6"/></>, wallet: <><rect x="3" y="5" width="18" height="15" rx="3"/><path d="M3 8V5l14-3v3m4 7h-6v5h6"/></>, arrow: <path d="M4 12h16m-6-6 6 6-6 6"/>, swap: <path d="M8 3v17m-4-4 4 4 4-4M16 21V4m-4 4 4-4 4 4"/>, pin: <><path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 0 1 14 0Z"/><circle cx="12" cy="10" r="2"/></>, bookmark: <path d="M6 3h12v18l-6-4-6 4z"/>, sun: <><circle cx="12" cy="12" r="4"/><path d="M12 1v2m0 18v2M1 12h2m18 0h2M4 4l2 2m12 12 2 2M4 20l2-2M18 6l2-2"/></>, network: <><circle cx="12" cy="5" r="3"/><circle cx="5" cy="19" r="3"/><circle cx="19" cy="19" r="3"/><path d="m10 8-4 8m8-8 4 8M8 19h8"/></>, close: <path d="m6 6 12 12M6 18 18 6"/>, check: <path d="m5 12 4 4L19 6"/>, compare: <path d="M5 3v18m14-18v18M2 8h6m8 8h6M9 5h6m-6 14h6"/>, info: <><circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10h.01"/></>, plus: <path d="M12 5v14M5 12h14"/>, minus: <path d="M5 12h14"/>, layers: <path d="m12 3 10 6-10 6L2 9zm-10 12 10 6 10-6"/> };
    return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name] ?? paths.route}</svg>;
}
export function Modal({ title, children, onClose }: {
    title: string;
    children: ReactNode;
    onClose: () => void;
}) { const ref = useRef<HTMLDialogElement>(null); useEffect(() => { const d = ref.current; d?.showModal(); return () => d?.close(); }, []); return <dialog ref={ref} onCancel={onClose} onClick={e => { if (e.target === e.currentTarget)
    onClose(); }}><div className="modal-header"><h2>{title}</h2><button className="icon-button" aria-label="Close dialog" onClick={onClose}><Icon name="close"/></button></div><div className="modal-body">{children}</div></dialog>; }
