import * as glider from './glider';
import * as lwss from './lwss';
import * as mwss from './mwss';
import * as hwss from './hwss';

export const label = 'Vaisseaux'

export const objects = [
    glider,
    lwss,
    mwss,
    hwss
].reduce((r, c) => ({
    ...r,
    [c.name]: c.object
}), {});