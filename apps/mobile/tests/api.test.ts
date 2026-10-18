jest.mock('../store/session', () => ({useSession: {getState: () => ({session: {access_token: 'test-token'}, setSession: jest.fn()})}}));
jest.mock('../services/auth', () => ({supabase: {auth: {signOut: jest.fn()}}}));
import {request, ApiError} from '../services/api';

afterEach(() => jest.restoreAllMocks());

test('private API calls attach the session token', async () => {
  const mocked = jest.spyOn(globalThis, 'fetch').mockResolvedValue({ok: true, status: 200, json: async () => ({items: []})} as Response);
  await request('/tasks');
  expect(mocked.mock.calls[0]?.[1]?.headers).toMatchObject({Authorization: 'Bearer test-token'});
});

test('API errors are shown instead of fabricated success', async () => {
  jest.spyOn(globalThis, 'fetch').mockResolvedValue({ok: false, status: 403, json: async () => ({error: {message: 'Access denied'}})} as Response);
  await expect(request('/tasks')).rejects.toBeInstanceOf(ApiError);
});
