import { environment } from './environment.prod';

describe('production API configuration', () => {
  it('builds the exact Render session endpoint once', () => {
    expect(environment.apiUrl).toBe('https://newgroundedandfruitful-backend.onrender.com/api/v1');
    const sessionUrl = `${environment.apiUrl.replace(/\/$/, '')}/auth/session`;
    expect(sessionUrl).toBe('https://newgroundedandfruitful-backend.onrender.com/api/v1/auth/session');
    expect(sessionUrl).not.toContain('/api/v1/api/v1/');
  });
});
