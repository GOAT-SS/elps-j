import { proxyAnalysis } from './proxy';
export const maxDuration = 100;
export async function POST(request: Request) {
  return proxyAnalysis(request);
}
