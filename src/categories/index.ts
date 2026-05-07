import * as shift from './ships';
import * as oscillators from './oscillators';
import * as mathusalems from './mathusalems';
import * as puffers from './puffers';
import * as cannons from './cannons';
import * as spacefillers from './spacefillers';
import * as infiniteGrowth from './infinite-growth';

export default {
    [shift.label]: shift.objects,
    [oscillators.label]: oscillators.objects,
    [mathusalems.label]: mathusalems.objects,
    [puffers.label]: puffers.objects,
    [cannons.label]: cannons.objects,
    [spacefillers.label]: spacefillers.objects,
    [infiniteGrowth.label]: infiniteGrowth.objects,
}