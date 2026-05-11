import * as max from './max';

export const label = 'Spacefillers';

export const objects = [max]
    .reduce((r, c) => ({
        ...r,
        [c.name]: c.object
    }), {});