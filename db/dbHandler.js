const useMock = true;

export const db = useMock
    ? await import('./mockDbHandler.js')
    : await import('./realDbHandler.js');