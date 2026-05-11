import * as shift from './ships';
import * as oscillators from './oscillators';
import * as mathusalems from './mathusalems';
import * as puffers from './puffers';
import * as cannons from './cannons';
import * as spacefillers from './spacefillers';
import * as infiniteGrowth from './infinite-growth';

export default [shift, oscillators, mathusalems, puffers, cannons, spacefillers, infiniteGrowth]
    .reduce((r, c) => ({
        ...r,
        [c.label]: c.objects
    }), {});