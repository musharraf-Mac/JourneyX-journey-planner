import { allow, sameOrigin } from '@/lib/auth';
import { answerBusQuestion } from '@/lib/bus-assistant';
import { connections, stops, type Disruption, type Priority } from '@/lib/network';

const priorities: Priority[] = ['Balanced', 'Fastest', 'Cheapest', 'Reliable'];
const help = 'Pick start and destination on the map by double-clicking, or use the covered bus-area selectors, or ask me directly, for example “from Kaduwela to Kollupitiya”. Use Board from my current location to match your position to a covered bus area within 2 km. Use Track my location on the map to follow your position. Map connectors are straight lines, not walking routes. The emergency icon beside the logo prepares a location SMS to a phone number you enter; you must tap Send in your SMS app. Sign in to save a journey.';

export async function POST(request: Request) {
    if (!sameOrigin(request)) return Response.json({ error: 'Invalid origin' }, { status: 403 });

    const body = await request.json().catch(() => null);
    const message = typeof body?.message === 'string' ? body.message.trim() : '';
    if (!message || message.length > 2000) {
        return Response.json({ error: 'Ask a question of 1–2000 characters.' }, { status: 400 });
    }

    const priority = priorities.includes(body.priority) ? body.priority : 'Balanced';
    const from = stops.some(stop => stop.id === body.from) ? body.from : 'fort';
    const to = stops.some(stop => stop.id === body.to) ? body.to : 'mount';
    const disruptions: Disruption[] = Array.isArray(body.disruptions)
        ? body.disruptions.slice(0, connections.length).filter((item: Partial<Disruption> | null) =>
            item !== null && connections.some(edge => edge.id === item.edgeId)
            && (item.kind === 'delay' || item.kind === 'closed')
            && typeof item.delay === 'number' && Number.isFinite(item.delay) && item.delay >= 0 && item.delay <= 120)
        : [];
    const history: string[] = Array.isArray(body.history)
        ? body.history.slice(-8).filter((item: { role?: unknown; content?: unknown } | null) =>
            item?.role === 'user' && typeof item.content === 'string')
            .map((item: { content: string }) => item.content.slice(0, 2000))
        : [];

    const answer = answerBusQuestion(message, history, { from, to, priority }, disruptions);
    if (answer) return Response.json({ answer });
    if (!process.env.GROQ_API || !allow('ai-global', 10)) return Response.json({ answer: help });

    try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${process.env.GROQ_API}`,
                'Content-Type': 'application/json',
            },
            signal: AbortSignal.timeout(15000),
            body: JSON.stringify({
                model: process.env.GROQ_MODEL?.trim() || 'openai/gpt-oss-20b',
                max_completion_tokens: 500,
                messages: [
                    { role: 'system', content: `You provide help using JourneyX, a bus-only demo. ${help} The map uses browser location only with consent. If asked about bus routing, ask for origin and destination. Do not provide route numbers, live information, walking directions, fares or times. Keep answers short and avoid tables.` },
                    { role: 'user', content: message },
                ],
            }),
        });
        if (!response.ok) return Response.json({ answer: help });
        const result = await response.json();
        const text = result.choices?.[0]?.message?.content;
        return Response.json({ answer: typeof text === 'string' && text.trim() ? text.trim() : help });
    } catch {
        return Response.json({ answer: help });
    }
}
