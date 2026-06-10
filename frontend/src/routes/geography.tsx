// src/routes/geography.tsx
import { createFileRoute } from '@tanstack/react-router';
import { GeographyPage } from '../features/geography/pages/GeographyPage';

export const Route = createFileRoute('/geography')({
  component: GeographyComponent,
  validateSearch: (search: Record<string, unknown>) => {
    return {
      provinceId: search.provinceId as string | undefined,
    };
  },
});

function GeographyComponent() {
  return <GeographyPage />;
}