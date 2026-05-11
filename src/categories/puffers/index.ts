import * as blockLayingSwitchEngine from './block-laying-switch-engine';
import * as gliderProducingSwitchEngine from './glider-producing-switch-engine';

export const label = 'Puffers';

export const objects = [
    blockLayingSwitchEngine,
    gliderProducingSwitchEngine
].reduce((r, c) => ({
    ...r,
    [c.name]: c.object
}), {});