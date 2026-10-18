import {useState} from 'react';
import {useLocalSearchParams, useRouter} from 'expo-router';
import type {Workflow} from '@lifeflow/api-contracts';
import {Button, ErrorNote, Field, Label, Panel, Screen} from '../../components/ui';
import {useAction, useData} from '../../hooks/data';

export default function WorkflowDetail() {
  const {id} = useLocalSearchParams<{id: string}>(); const router = useRouter(); const data = useData<Workflow>(`/workflows/${id}`); const action = useAction();
  const [evidence, setEvidence] = useState<Record<string, string>>({});
  return <Screen title={data.data?.title || 'Workflow'} eyebrow={data.data?.status.replaceAll('_', ' ')}><ErrorNote error={data.error || action.error}/><Label muted>{data.data?.description}</Label>
    {data.data?.steps?.map(step => {
      const blocked = step.dependencies.some(position => data.data?.steps?.find(s => s.position === position)?.status !== 'completed');
      return <Panel key={step.id}><Label>{step.position + 1}. {step.title}</Label><Label muted>{step.status}{blocked ? ' · Complete the earlier step first' : ''}</Label>
        {step.status === 'completed' ? <Label>{step.evidence}</Label> : <><Field label="What did you complete?" value={evidence[step.id] || ''} onChangeText={text => setEvidence(old => ({...old, [step.id]: text}))}/>
          <Button title="Complete step" disabled={blocked || !evidence[step.id]?.trim() || data.data?.status !== 'active'} pending={action.isPending} onPress={() => action.mutate({path: `/workflows/${id}/steps/${step.id}/complete`, data: {evidence: evidence[step.id]}})}/></>}</Panel>;
    })}<Button title="Back to workflows" secondary onPress={() => router.replace('/workflows')}/></Screen>;
}
