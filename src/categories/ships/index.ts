import * as glider from './glider';
import * as lwss from './lwss';
import * as mwss from './mwss';
import * as hwss from './hwss';

export const label = 'Vaisseaux'

export const objects = {
    [glider.name]: glider.object,
    [lwss.name]: lwss.object,
    [mwss.name]: mwss.object,
    [hwss.name]: hwss.object,
}