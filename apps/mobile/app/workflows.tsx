import {useRouter} from 'expo-router';
import type {Page, Template, Workflow} from '@lifeflow/api-contracts';
import {Button, ErrorNote, Label, Panel, Screen, Section} from '../components/ui';
import {useAction, useData} from '../hooks/data';

export default function Workflows() {
  const router = useRouter(); const templates = useData<Page<Template>>('/workflow-templates'); const flows = useData<Page<Workflow>>('/workflows'); const action = useAction<Workflow>();
  return <Screen title="Big moments, small steps" eyebrow="Life workflows"><ErrorNote error={templates.error || flows.error || action.error}/>
    <Section title="In progress">{flows.data?.items.map(flow => <Panel key={flow.id}><Label>{flow.title}</Label><Label muted>{flow.status.replaceAll('_', ' ')}</Label><Button title="Open checklist" secondary onPress={() => router.push(`/workflow/${flow.id}`)}/></Panel>)}</Section>
    <Section title="Start with a plan">{templates.data?.items.map(template => <Panel key={template.id}><Label>{template.title}</Label><Label muted>{template.description}</Label>
      <Button title="Start workflow" pending={action.isPending} onPress={() => action.mutate({path: '/workflows', data: {template_id: template.id}}, {onSuccess: flow => router.push(`/workflow/${flow.id}`)})}/></Panel>)}</Section>
    <Button title="Back home" secondary onPress={() => router.replace('/')}/></Screen>;
}
