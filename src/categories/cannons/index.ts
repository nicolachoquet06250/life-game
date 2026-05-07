import * as gosperGliderGun from './gosper-glider-gun.ts';
import * as simkinGliderGun from './simkin-glider-gun';
import * as period60GliderGun from './period-60-glider-gun';

export const label = 'Cannons';

export const objects = {
    [gosperGliderGun.name]: gosperGliderGun.object,
    [simkinGliderGun.name]: simkinGliderGun.object,
    [period60GliderGun.name]: period60GliderGun.object,
};