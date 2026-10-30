// Built-in text-to-speech voices. They are rendered by the telephony provider (Twilio <Say>) during the call.
// Provider voice names can change; verify them in your Twilio console (Voice > TTS) before going live.
export const TTS_VOICES = [
  { id: 'tts:polly-aditi', label: 'Aditi', gender: 'female', languages: ['hi', 'en'], twilioVoice: 'Polly.Aditi', note: 'Bilingual Hindi/Indian English' },
  { id: 'tts:polly-kajal', label: 'Kajal (neural)', gender: 'female', languages: ['hi', 'en'], twilioVoice: 'Polly.Kajal', note: 'Neural, Hindi/Indian English' },
  { id: 'tts:google-hi-male', label: 'Hindi male', gender: 'male', languages: ['hi'], twilioVoice: 'Google.hi-IN-Standard-B', note: 'Verify availability on your account' },
  { id: 'tts:google-en-in-male', label: 'Indian English male', gender: 'male', languages: ['en'], twilioVoice: 'Google.en-IN-Standard-B', note: 'Verify availability on your account' },
  { id: 'tts:polly-matthew', label: 'Matthew', gender: 'male', languages: ['en'], twilioVoice: 'Polly.Matthew', note: 'US English' },
];
export const LANG_CODE = { hi: 'hi-IN', en: 'en-IN' };
export const getTtsVoice = (id) => TTS_VOICES.find((v) => v.id === id);
