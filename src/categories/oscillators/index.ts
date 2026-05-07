import * as blinker from './blinker';
import * as beacon from './beacon';
import * as pulsar from './pulsar';
import * as toad from './toad';

export const label = 'Oscillateurs';

export const objects = {
    [blinker.name]: blinker.object,
    [beacon.name]: beacon.object,
    [pulsar.name]: pulsar.object,
    [toad.name]: toad.object,
};