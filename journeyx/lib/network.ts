export const stops = [
    ['fort', 'Colombo Fort', 280, 160], ['pettah', 'Pettah', 355, 120], ['maradana', 'Maradana', 465, 210], ['dematagoda', 'Dematagoda', 580, 130], ['borella', 'Borella', 600, 315], ['townhall', 'Town Hall', 445, 335], ['slave', 'Slave Island', 305, 285], ['kollupitiya', 'Kollupitiya', 300, 410], ['bambalapitiya', 'Bambalapitiya', 345, 530], ['wellawatte', 'Wellawatte', 405, 655], ['dehiwala', 'Dehiwala', 475, 765], ['mount', 'Mount Lavinia', 515, 860], ['thimbirigasyaya', 'Thimbirigasyaya', 530, 490], ['narahenpita', 'Narahenpita', 650, 475], ['nugegoda', 'Nugegoda', 675, 660], ['rajagiriya', 'Rajagiriya', 760, 320],
].map(([id, name, x, y]) => ({ id: String(id), name: String(name), x: Number(x), y: Number(y) }));
const rows: [
    string,
    string,
    string,
    number,
    number,
    number
][] = [
    ['fort', 'slave', '100', 8, 12, 85], ['slave', 'kollupitiya', '100', 7, 10, 85], ['kollupitiya', 'bambalapitiya', '100', 8, 12, 85], ['bambalapitiya', 'wellawatte', '100', 9, 14, 85], ['wellawatte', 'dehiwala', '100', 8, 12, 85], ['dehiwala', 'mount', '100', 7, 10, 85],
    ['fort', 'bambalapitiya', 'Coastal', 13, 22, 93], ['bambalapitiya', 'wellawatte', 'Coastal', 5, 10, 93], ['wellawatte', 'dehiwala', 'Coastal', 5, 10, 93], ['dehiwala', 'mount', 'Coastal', 4, 10, 93],
    ['fort', 'pettah', '138', 4, 8, 78], ['pettah', 'maradana', '138', 7, 10, 78], ['maradana', 'townhall', '138', 9, 12, 78], ['townhall', 'thimbirigasyaya', '138', 10, 14, 78], ['thimbirigasyaya', 'nugegoda', '138', 13, 18, 78],
    ['pettah', 'dematagoda', '154', 11, 15, 88], ['dematagoda', 'borella', '154', 9, 12, 88], ['borella', 'narahenpita', '154', 10, 14, 88], ['narahenpita', 'nugegoda', '154', 12, 16, 88],
    ['slave', 'townhall', '120', 8, 10, 82], ['townhall', 'borella', '120', 8, 12, 82], ['borella', 'rajagiriya', '177', 9, 15, 84], ['kollupitiya', 'townhall', '177', 9, 12, 84], ['bambalapitiya', 'thimbirigasyaya', '104', 7, 10, 90], ['thimbirigasyaya', 'narahenpita', '104', 6, 8, 90], ['wellawatte', 'nugegoda', '163', 11, 15, 86], ['nugegoda', 'dehiwala', '163', 13, 18, 86],
];
export const connections = rows.map(([from, to, service, minutes, fare, reliability], i) => ({ id: `e${i}`, from, to, service, minutes, fare, reliability, mode: service === 'Coastal' ? 'train' : 'bus' }));
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
export function findJourneys(from: string, to: string, priority: Priority, disruptions: Disruption[], mode = 'all'): Journey[] {
    if (from === to || !stops.some(s => s.id === from) || !stops.some(s => s.id === to))
        return [];
    const result: Journey[] = [];
    const edges = connections.filter(e => (mode === 'all' || e.mode === mode) && !disruptions.some(d => d.edgeId === e.id && d.kind === 'closed'));
    function visit(node: string, nodes: string[], legs: Connection[]) {
        if (node === to) {
            const boardings = legs.filter((e, i) => i === 0 || e.service !== legs[i - 1].service), transfers = boardings.length - 1;
            const delays = legs.reduce((sum, e) => sum + (disruptions.find(d => d.edgeId === e.id)?.delay ?? 0), 0);
            const ride = legs.reduce((sum, e) => sum + e.minutes, 0);
            const minutes = ride + boardings.reduce((sum, e) => sum + (e.mode === 'train' ? 10 : 5), 0) + transfers * 3 + delays;
            const fare = legs.reduce((sum, e) => sum + e.fare, 0) + boardings.reduce((sum, e) => sum + (e.mode === 'train' ? 65 : 25), 0);
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
