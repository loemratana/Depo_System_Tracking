import { createFileRoute } from '@tanstack/react-router';
import EmployeeDetailPage from '../features/employee/pages/EmployeeDetailPage';

export const Route = createFileRoute('/employees_/$id')({
  component: EmployeeDetailComponent,
});

function EmployeeDetailComponent() {
  const { id } = Route.useParams();
  return <EmployeeDetailPage id={id} />;
}
