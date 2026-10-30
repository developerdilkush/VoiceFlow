/** Browser-side preview only (Web Speech API). The real call uses the provider's voice, which sounds different. */
export function previewSpeech(text, language) {
  if (!('speechSynthesis' in window)) throw new Error('Voice preview is not supported in this browser.');
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = language === 'hi' ? 'hi-IN' : 'en-IN';
  window.speechSynthesis.speak(u);
}
export const stopSpeech = () => window.speechSynthesis?.cancel();
