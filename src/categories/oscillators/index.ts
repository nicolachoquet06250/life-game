import * as blinker from './blinker';
import * as beacon from './beacon';
import * as pulsar from './pulsar';
import * as toad from './toad';

export const label = 'Oscillateurs';

export const objects = [
    blinker,
    beacon,
    pulsar,
    toad
].reduce((r, c) => ({
    ...r,
    [c.name]: c.object
}), {});