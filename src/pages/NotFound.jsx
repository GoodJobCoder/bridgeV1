import { Link } from 'react-router-dom';
import { PageHeader } from '../components/ui.jsx';

export default function NotFound() {
  return (
    <PageHeader title="Page not found" lead="That page doesn’t exist.">
      <Link to="/" className="btn btn-primary">Back to home</Link>
    </PageHeader>
  );
}
