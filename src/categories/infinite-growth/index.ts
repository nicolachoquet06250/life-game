import * as infiniteGrowth1 from './infinite-growth-1';
import * as infiniteGrowth2 from './infinite-growth-2';
import * as infiniteGrowth2x12 from './2x12-infinite-growth.ts';
import * as unidimensionalInfiniteGrowth from './unidimensional-infinite-growth';
import * as timeBomb from './time-bomb';

export const label = 'Objets à croissance infinie';

export const objects = {
    [infiniteGrowth1.name]: infiniteGrowth1.object,
    [infiniteGrowth2.name]: infiniteGrowth2.object,
    [infiniteGrowth2x12.name]: infiniteGrowth2x12.object,
    [unidimensionalInfiniteGrowth.name]: unidimensionalInfiniteGrowth.object,
    [timeBomb.name]: timeBomb.object,
};