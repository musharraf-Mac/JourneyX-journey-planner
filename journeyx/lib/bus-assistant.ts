import { busRouteSources, connections, findJourneys, stopName, stops, type Disruption, type Priority } from './network';

type TripQuery = { from: string; to: string; priority: Priority };

const aliases: Record<string, string[]> = {
    fort: ['fort', 'fort station', 'colombo fort station'],
    kaduwela: ['kaduwele', 'kaduwala'],
    kollupitiya: ['colpetty', 'kolpity'],
    mount: ['mt lavinia', 'mount lavinia'],
    slave: ['kompanna veediya', 'kompannaveediya'],
    townhall: ['townhall', 'colombo town hall'],
};
const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

function mentionedStops(text: string) {
    const normalized = ` ${normalize(text)} `;
    return stops.flatMap(stop => {
        const positions = [stop.name, ...(aliases[stop.id] ?? [])]
            .map(name => normalized.indexOf(` ${normalize(name)} `))
            .filter(index => index !== -1);
        return positions.length ? [{ id: stop.id, index: Math.min(...positions) }] : [];
    }).sort((a, b) => a.index - b.index).map(stop => stop.id);
}

function writtenPair(question: string) {
    const text = question.replace(/\s+/g, ' ').replace(/^how\s+(?:do i |can i |to )?(?:go|travel|get)\b\s*/i, '');
    const explicit = text.match(/\bfrom\s+(.+?)\s+to\s+(.+)/i);
    if (explicit) return { from: mentionedStops(explicit[1]).at(-1), to: mentionedStops(explicit[2])[0] };
    const reverse = text.match(/\bto\s+(.+?)\s+\bfrom\s+(.+)/i);
    if (reverse) return { from: mentionedStops(reverse[2])[0], to: mentionedStops(reverse[1])[0] };
    const forward = text.match(/(.+?)(?:\s+to\s+|\s*→\s*|\s*->\s*)(.+)/i);
    if (!forward) return null;
    const from = mentionedStops(forward[1]).at(-1);
    const to = mentionedStops(forward[2])[0];
    // "How to go ..." and "how to save ..." use "to" as a verb marker.
    const isTrip = Boolean(from || to || /\bfrom\b|→|->/i.test(text) || /\b(?:bus|travel|route)\b/i.test(text) && !/\bto\s+(?:go|use|find|save|compare|get)\b/i.test(text));
    if (!isTrip) return null;

    return { from, to };
}

function tripFromText(text: string) {
    const written = writtenPair(text);
    if (written) return written;
    const locations = mentionedStops(text);
    return locations.length === 2 ? { from: locations[0], to: locations[1] } : null;
}

function priorityFor(text: string, fallback: Priority): Priority {
    if (/\b(cheap\w*|budget|lowest fare|least expensive)\b/i.test(text)) return 'Cheapest';
    if (/\b(fast\w*|quick\w*|shortest time)\b/i.test(text)) return 'Fastest';
    if (/\b(reliab\w*|dependable)\b/i.test(text)) return 'Reliable';
    if (/\bbalanced\b/i.test(text)) return 'Balanced';
    return fallback;
}

const estimated = 'Travel times, fares and reliability are demo estimates. Confirm boarding stops and departures locally.';
const reference = (service: string) => busRouteSources[service]
    ? `\nBus ${service} route reference: ${busRouteSources[service]}`
    : '';

export function answerBusQuestion(message: string, history: string[], current: TripQuery, disruptions: Disruption[]) {
    const earlierTrip = [...history].reverse().map(tripFromText).find(pair => pair?.from && pair.to);
    const context = earlierTrip?.from && earlierTrip.to && !/\b(current|selected|planner)\b/i.test(message)
        ? { ...current, from: earlierTrip.from, to: earlierTrip.to }
        : current;
    const busNumber = message.match(/\b(?:bus(?:\s+(?:route|number))?|route)\s*#?\s*(\d+)\b/i)?.[1];
    const routeEdges = connections.filter(edge => edge.service === busNumber);
    const pair = tripFromText(message);
    const namedStops = mentionedStops(message);

    if (/\b(train|railway|rail)\b/i.test(message) && !/\bbus\b/i.test(message)) {
        return 'JourneyX plans bus journeys. Tell me your origin and destination to see bus options.';
    }
    if (!namedStops.length && /\b(?:save|bookmark|register|sign in|log in|theme|track my location)\b/i.test(message)) {
        return null;
    }

    if (busNumber && (!pair || ((!pair.from || !pair.to) && namedStops.length === 1))) {
        if (!routeEdges.length) return `Bus ${busNumber} is outside the current JourneyX network. Try the NTC bus maps below to look it up.`;
        if (namedStops.length === 1) {
            const [stop] = namedStops;
            const included = routeEdges.some(edge => edge.from === stop || edge.to === stop);
            return `Bus ${busNumber} ${included ? 'serves' : 'does not list'} **${stopName(stop)}** in the JourneyX data.${reference(busNumber)}\n\n${estimated}`;
        }
        const areas = [...new Set(routeEdges.flatMap(edge => [edge.from, edge.to]))].map(stopName);
        return `**Bus ${busNumber}**\n- Areas included in JourneyX: ${areas.join(', ')}.${reference(busNumber)}\n\n${estimated}`;
    }

    const askingAboutTrip = /\b(route\w*|bus\w*|journey\w*|cheap\w*|fast\w*|quick\w*|fare\w*|minutes?|cost\w*|transfer\w*|direct|options?|recommend\w*|reliab\w*|how long|how much|estimated time|where do i (get|board)|other way)\b/i.test(message);
    if (!pair && !namedStops.length && !askingAboutTrip) return null;
    if (pair && (!pair.from || !pair.to)) {
        const known = pair.from ?? pair.to;
        return known
            ? `I found **${stopName(known)}**. Which covered stop should I use as the ${pair.from ? 'destination' : 'origin'}?`
            : 'I couldn’t match either place to a stop in JourneyX. Choose stops in the planner or tell me their names.';
    }
    if (!pair && namedStops.length) {
        if (namedStops.length > 1) return 'Which two stops are your origin and destination? Use “from [stop] to [stop]”.';
        const [stop] = namedStops;
        const services = [...new Set(connections.filter(edge => edge.from === stop || edge.to === stop).map(edge => edge.service))];
        return `**${stopName(stop)}** is covered by ${services.map(service => `bus ${service}`).join(', ')} in JourneyX. Tell me the other stop and which direction you’re going.${services.map(reference).join('')}`;
    }

    const reversed = !pair && /\b(reverse|return journey|other way)\b/i.test(message);
    const from = pair?.from ?? (reversed ? context.to : context.from);
    const to = pair?.to ?? (reversed ? context.from : context.to);
    const priority = priorityFor(message, current.priority);
    if (from === to) return `Both stops are **${stopName(from)}**. Choose a different destination.`;

    // Query the same graph and use the same ranking as the planner.
    const journeys = findJourneys(from, to, priority, disruptions, busNumber);
    const title = `**${stopName(from)} → ${stopName(to)}**`;
    if (!journeys.length) {
        const withoutDisruptions = findJourneys(from, to, priority, [], busNumber);
        const reason = withoutDisruptions.length
            ? 'Simulated closures currently block this journey. Reset the simulations to check it again.'
            : busNumber
                ? `There is no connection using only bus ${busNumber} between these stops in JourneyX. Ask for all bus options to include transfers.`
                : 'These stops have no connecting bus path in the current JourneyX network.';
        return `${title}\n${reason}`;
    }

    const services = new Set<string>();
    const options = journeys.map((journey, index) => {
        const legs = journey.legs.flatMap((edge, i) => {
            if (i > 0 && edge.service === journey.legs[i - 1].service) return [];
            services.add(edge.service);
            return [`bus ${edge.service} at ${stopName(journey.nodes[i])}`];
        });
        const transfers = journey.transfers === 0 ? 'direct' : `${journey.transfers} transfer${journey.transfers === 1 ? '' : 's'}`;
        const label = index === 0 ? `${priority} pick` : `Option ${index + 1}`;
        return `- **${label}:** ${legs.join(', then ')} · ${journey.minutes} min · LKR ${journey.fare} · ${transfers} · reliability ${journey.reliability}/100.`;
    }).join('\n');

    return `${title}\n${options}\n\n${estimated}${services.size ? [...services].map(reference).join('') : ''}`;
}
