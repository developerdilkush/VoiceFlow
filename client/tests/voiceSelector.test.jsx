import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { VoiceSelector } from '../src/components/calls/VoiceSelector.jsx';

const voices = {
  builtin: [
    { id: 'tts:a', label: 'Aditi', gender: 'female', languages: ['hi', 'en'] },
    { id: 'tts:b', label: 'Matthew', gender: 'male', languages: ['en'] },
  ],
  recordings: [{ id: '1', voiceId: 'rec:1', name: 'My greeting' }],
};

describe('VoiceSelector', () => {
  it('lists only voices supporting the language, plus recordings', () => {
    render(<VoiceSelector voices={voices} language="hi" value="" onChange={() => {}} />);
    expect(screen.getByRole('option', { name: /Aditi/ })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /Matthew/ })).not.toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'My greeting' })).toBeInTheDocument();
  });
  it('reports the selected voice', async () => {
    const onChange = vi.fn();
    render(<VoiceSelector voices={voices} language="en" value="" onChange={onChange} />);
    await userEvent.selectOptions(screen.getByLabelText('Voice'), 'tts:b');
    expect(onChange).toHaveBeenCalledWith('tts:b');
  });
});
