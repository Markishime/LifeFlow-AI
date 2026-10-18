import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {request} from '../services/api';
import {useSession} from '../store/session';

export function useData<T>(path: string, polling = false, enabled = true) {
  const owner = useSession(s => s.session?.user.id);
  return useQuery<T>({queryKey: [owner, path], queryFn: () => request<T>(path), enabled: Boolean(owner) && enabled,
    refetchInterval: polling ? 10000 : false});
}
export function useAction<T = unknown>() {
  const client = useQueryClient();
  return useMutation<T, Error, {path: string; method?: string; data?: unknown}>({
    mutationFn: ({path, method = 'POST', data}) => request<T>(path, {method, body: data === undefined ? undefined : JSON.stringify(data)}),
    onSuccess: async () => {await client.invalidateQueries();},
  });
}
