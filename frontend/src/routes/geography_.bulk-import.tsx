import { createFileRoute } from '@tanstack/react-router';
import { GeographyBulkImportPage } from '../features/geography/pages/GeographyBulkImportPage';

export const Route = createFileRoute('/geography_/bulk-import')({
  component: GeographyBulkImportPage,
});