import { asyncHandler, ok } from '../utils/errors.js';
import { TTS_VOICES } from '../voice/catalog.js';

// Built-in provider voices are configuration data, not user-uploaded records.
export const list = asyncHandler(async (_req, res) => {
  ok(res, { builtin: TTS_VOICES.map(({ twilioVoice, ...voice }) => voice), recordings: [] });
});
