export type ComponentDefinition = {
  key: string;
  label: string;
  options: ReadonlyArray<readonly [string, string]>;
};
export type ConceptMapSnapshot = {
  values: Record<string, string>;
  connections: Array<{ source: string; target: string }>;
};
export type ConceptConnection = readonly [string, string];
export const emptyConceptMapSnapshot: ConceptMapSnapshot = { values: {}, connections: [] };

export function assessStructure(
  snapshot: ConceptMapSnapshot,
  correctValues: Record<string, string>,
  connections: ReadonlyArray<ConceptConnection>,
) {
  const keys = Object.keys(correctValues);
  const incorrectKeys = keys.filter((key) => snapshot.values[key] !== correctValues[key]);
  const connectionSet = new Set(snapshot.connections.map(({ source, target }) => `${source}->${target}`));
  const expectedSet = new Set(connections.map(([source, target]) => `${source}->${target}`));
  const missingConnections = connections.filter(([source, target]) => !connectionSet.has(`${source}->${target}`));
  const extraConnections = snapshot.connections.filter(({ source, target }) => !expectedSet.has(`${source}->${target}`));
  const isReady = keys.every((key) => Boolean(snapshot.values[key])) && snapshot.connections.length >= connections.length;
  return {
    correctNodeCount: keys.length - incorrectKeys.length,
    correctConnectionCount: connections.length - missingConnections.length,
    incorrectKeys,
    missingConnections,
    extraConnections,
    isReady,
    isCorrect: isReady && incorrectKeys.length === 0 && missingConnections.length === 0 &&
      snapshot.connections.length === connections.length && Object.keys(snapshot.values).length === keys.length,
  };
}
