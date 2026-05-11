import * as infiniteGrowth1 from './infinite-growth-1';
import * as infiniteGrowth2 from './infinite-growth-2';
import * as infiniteGrowth2x12 from './2x12-infinite-growth.ts';
import * as unidimensionalInfiniteGrowth from './unidimensional-infinite-growth';
import * as timeBomb from './time-bomb';

export const label = 'Objets à croissance infinie';

export const objects = [
    infiniteGrowth1,
    infiniteGrowth2,
    infiniteGrowth2x12,
    unidimensionalInfiniteGrowth,
    timeBomb
].reduce((r, c) => ({
    ...r,
    [c.name]: c.object
}), {});