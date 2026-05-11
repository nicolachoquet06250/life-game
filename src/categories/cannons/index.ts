import * as gosperGliderGun from './gosper-glider-gun.ts';
import * as simkinGliderGun from './simkin-glider-gun';
import * as period60GliderGun from './period-60-glider-gun';

export const label = 'Cannons';

export const objects = [
    gosperGliderGun,
    simkinGliderGun,
    period60GliderGun
].reduce((r, c) => ({
    ...r,
    [c.name]: c.object
}), {});