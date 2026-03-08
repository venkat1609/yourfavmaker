import { Package } from 'lucide-react';
import ManageListPage from '@/components/ManageListPage';

export default function Categories() {
  return (
    <ManageListPage
      title="Categories"
      icon={<Package className="h-5 w-5" />}
      description="Product categories used in the shop catalog filters."
      queryKey="admin-categories"
      tableName="categories"
    />
  );
}
