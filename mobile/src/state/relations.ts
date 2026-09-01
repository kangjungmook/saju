import { Relation } from '../types/domain';
import { getJSON, setJSON } from './storage';

function key(ownerId: string) {
  return `relations:${ownerId}`;
}

export async function getRelations(ownerId: string): Promise<Relation[]> {
  return (await getJSON<Relation[]>(key(ownerId))) ?? [];
}

export async function saveRelation(ownerId: string, relation: Relation): Promise<Relation[]> {
  const list = await getRelations(ownerId);
  const next = [...list.filter((r) => r.id !== relation.id), relation];
  await setJSON(key(ownerId), next);
  return next;
}

export async function deleteRelation(ownerId: string, relationId: string): Promise<Relation[]> {
  const list = await getRelations(ownerId);
  const next = list.filter((r) => r.id !== relationId);
  await setJSON(key(ownerId), next);
  return next;
}
