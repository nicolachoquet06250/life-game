import * as r_pentomino from './r-pentomino';
import * as acorn from './acorn';
import * as diehard from './diehard';

export const label = 'Mathusalems';

export const objects = {
    [r_pentomino.name]: r_pentomino.object,
    [acorn.name]: acorn.object,
    [diehard.name]: diehard.object,
};