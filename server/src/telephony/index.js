import { env } from '../config/env.js';
import { twilioAdapter } from './twilioAdapter.js';
import { exotelAdapter } from './exotelAdapter.js';
import { mockAdapter } from './mockAdapter.js';

const adapters = { twilio: twilioAdapter, exotel: exotelAdapter, mock: mockAdapter };
export const getProvider = () => adapters[env.provider];
export const getProviderByName = (name) => adapters[name];
