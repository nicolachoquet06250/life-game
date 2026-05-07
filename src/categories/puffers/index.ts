import * as blockLayingSwitchEngine from './block-laying-switch-engine';
import * as gliderProducingSwitchEngine from './glider-producing-switch-engine';

export const label = 'Puffers';

export const objects = {
    [blockLayingSwitchEngine.name]: blockLayingSwitchEngine.object,
    [gliderProducingSwitchEngine.name]: gliderProducingSwitchEngine.object
};