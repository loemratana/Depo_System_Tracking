import { createFileRoute } from '@tanstack/react-router';
import { BulkOperationsPage } from '../features/bulk-operations/pages/BulkOperationsPage';

export const Route = createFileRoute('/bulk-operations')({
  component: BulkOperationsComponent,
});

function BulkOperationsComponent() {
  return <BulkOperationsPage />;
}
