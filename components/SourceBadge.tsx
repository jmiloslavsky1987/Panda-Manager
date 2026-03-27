'use client';

import { Badge } from '@/components/ui/badge';

interface SourceBadgeProps {
  source: string;
  artifactName?: string | null;
  discoverySource?: string | null;
}

export function SourceBadge({ source, artifactName, discoverySource }: SourceBadgeProps) {
  if (source === 'ingestion' && artifactName) {
    return (
      <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-xs font-normal">
        Ingested — {artifactName}
      </Badge>
    );
  }
  if (source === 'discovery') {
    return (
      <Badge className="bg-purple-100 text-purple-800 border-purple-200 text-xs font-normal">
        {discoverySource ? `Discovered — ${discoverySource}` : 'Discovered'}
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-xs font-normal text-gray-500">
      Manual
    </Badge>
  );
}
