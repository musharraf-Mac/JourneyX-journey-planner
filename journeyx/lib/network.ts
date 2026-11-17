// Area-centre coordinates for orientation, not precise boarding locations.
export const stops = [
    { id: 'fort', name: 'Colombo Fort', lat: 6.9344, lng: 79.8501 },
    { id: 'pettah', name: 'Pettah', lat: 6.9366, lng: 79.8572 },
    { id: 'maradana', name: 'Maradana', lat: 6.9289, lng: 79.8648 },
    { id: 'dematagoda', name: 'Dematagoda', lat: 6.9389, lng: 79.8791 },
    { id: 'borella', name: 'Borella', lat: 6.9146, lng: 79.8774 },
    { id: 'townhall', name: 'Town Hall', lat: 6.9167, lng: 79.8635 },
    { id: 'slave', name: 'Slave Island', lat: 6.9228, lng: 79.8508 },
    { id: 'kollupitiya', name: 'Kollupitiya', lat: 6.9105, lng: 79.8501 },
    { id: 'bambalapitiya', name: 'Bambalapitiya', lat: 6.8937, lng: 79.8552 },
    { id: 'wellawatte', name: 'Wellawatte', lat: 6.8759, lng: 79.8609 },
    { id: 'dehiwala', name: 'Dehiwala', lat: 6.8526, lng: 79.8655 },
    { id: 'mount', name: 'Mount Lavinia', lat: 6.8389, lng: 79.8647 },
    { id: 'thimbirigasyaya', name: 'Thimbirigasyaya', lat: 6.8963, lng: 79.8702 },
    { id: 'narahenpita', name: 'Narahenpita', lat: 6.8960, lng: 79.8846 },
    { id: 'nugegoda', name: 'Nugegoda', lat: 6.8720, lng: 79.8896 },
    { id: 'rajagiriya', name: 'Rajagiriya', lat: 6.9091, lng: 79.8931 },
    { id: 'battaramulla', name: 'Battaramulla', lat: 6.9001, lng: 79.9195 },
    { id: 'malabe', name: 'Malabe', lat: 6.9042, lng: 79.9547 },
    { id: 'kaduwela', name: 'Kaduwela', lat: 6.9374, lng: 79.9853 },
];
export const busRouteSources: Readonly<Partial<Record<string, string>>> = {
    '177': 'https://routemaster.lk/bus/177/',
};

// Published minimum and the requested rounded planning baseline are distinct.
// We do not have verified route-specific fare stages; totals remain estimates.
export const farePolicy = {
    reportedMinimum: 34,
    planningMinimum: 35,
    effectiveDate: '2026-07-06',
    checkedDate: '2026-11-17',
    source: 'https://www.newswire.lk/2026/07/06/bus-fare-hike-effective-from-today/',
} as const;

const rows: [
    string,
    string,
    string,
    number,
    number,
    number
][] = [
    ['fort', 'slave', '100', 8, 12, 85], ['slave', 'kollupitiya', '100', 7, 10, 85], ['kollupitiya', 'bambalapitiya', '100', 8, 12, 85], ['bambalapitiya', 'wellawatte', '100', 9, 14, 85], ['wellawatte', 'dehiwala', '100', 8, 12, 85], ['dehiwala', 'mount', '100', 7, 10, 85],
    ['fort', 'pettah', '138', 4, 8, 78], ['pettah', 'maradana', '138', 7, 10, 78], ['maradana', 'townhall', '138', 9, 12, 78], ['townhall', 'thimbirigasyaya', '138', 10, 14, 78], ['thimbirigasyaya', 'nugegoda', '138', 13, 18, 78],
    ['pettah', 'dematagoda', '154', 11, 15, 88], ['dematagoda', 'borella', '154', 9, 12, 88], ['borella', 'narahenpita', '154', 10, 14, 88], ['narahenpita', 'nugegoda', '154', 12, 16, 88],
    ['slave', 'townhall', '120', 8, 10, 82], ['townhall', 'borella', '120', 8, 12, 82], ['borella', 'rajagiriya', '177', 9, 15, 84], ['kollupitiya', 'borella', '177', 16, 20, 84], ['bambalapitiya', 'thimbirigasyaya', '104', 7, 10, 90], ['thimbirigasyaya', 'narahenpita', '104', 6, 8, 90], ['wellawatte', 'nugegoda', '163', 11, 15, 86], ['nugegoda', 'dehiwala', '163', 13, 18, 86],
    // Selected areas along published route 177. Metrics remain simulated.
    ['rajagiriya', 'battaramulla', '177', 11, 12, 84],
    ['battaramulla', 'malabe', '177', 15, 18, 84],
    ['malabe', 'kaduwela', '177', 13, 16, 84],
];
export const connections = rows.map(([from, to, service, minutes, fare, reliability], i) => ({ id: `e${i < 6 ? i : i + 4}`, from, to, service, minutes, fare, reliability }));
export type Connection = typeof connections[number];
export type Priority = 'Balanced' | 'Fastest' | 'Cheapest' | 'Reliable';
export type Disruption = {
    edgeId: string;
    kind: 'delay' | 'closed';
    delay: number;
};
export type Journey = {
    id: string;
    nodes: string[];
    legs: Connection[];
    minutes: number;
    fare: number;
    transfers: number;
    reliability: number;
    score: number;
};
export const stopName = (id: string) => stops.find(s => s.id === id)?.name ?? id;
export function findJourneys(from: string, to: string, priority: Priority, disruptions: Disruption[], service?: string): Journey[] {
    if (from === to || !stops.some(s => s.id === from) || !stops.some(s => s.id === to))
        return [];
    const result: Journey[] = [];
    const edges = connections.filter(e => (!service || e.service === service) && !disruptions.some(d => d.edgeId === e.id && d.kind === 'closed'));
    function visit(node: string, nodes: string[], legs: Connection[]) {
        if (node === to) {
            const boardings = legs.filter((e, i) => i === 0 || e.service !== legs[i - 1].service), transfers = boardings.length - 1;
            const delays = legs.reduce((sum, e) => sum + (disruptions.find(d => d.edgeId === e.id)?.delay ?? 0), 0);
            const ride = legs.reduce((sum, e) => sum + e.minutes, 0);
            const minutes = ride + boardings.length * 5 + transfers * 3 + delays;
            // The first connection is covered by each ride's minimum estimate.
            // Staying on that service adds simulated increments; a transfer starts a new fare.
            const fare = legs.reduce((sum, e, i) => sum + (i === 0 || e.service !== legs[i - 1].service
                ? farePolicy.planningMinimum : e.fare), 0);
            const reliability = Math.max(10, Math.round(legs.reduce((sum, e) => sum + e.reliability * e.minutes, 0) / ride - transfers * 3 - delays * .6));
            result.push({ id: legs.map(e => e.id).join('-'), nodes, legs, minutes, fare, transfers, reliability, score: 0 });
            return;
        }
        // Exhaustive simple paths are practical for this small demo graph; never revisit a stop.
        for (const e of edges) {
            const next = e.from === node ? e.to : e.to === node ? e.from : null;
            if (next && !nodes.includes(next))
                visit(next, [...nodes, next], [...legs, e]);
        }
    }
    visit(from, [from], []);
    const w = { Balanced: [.35, .3, .15, .2], Fastest: [1, 0, 0, 0], Cheapest: [0, 1, 0, 0], Reliable: [0, 0, 0, 1] }[priority];
    const minTime = Math.min(...result.map(j => j.minutes)), minFare = Math.min(...result.map(j => j.fare));
    for (const j of result)
        j.score = w[0] * j.minutes / minTime + w[1] * j.fare / minFare + w[2] * j.transfers + w[3] * (100 - j.reliability) / 10;
    return result.sort((a, b) => a.score - b.score || a.minutes - b.minutes || a.fare - b.fare).slice(0, 3);
}
