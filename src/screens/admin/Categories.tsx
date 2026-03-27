"use client";

import ManageListPage from '@/components/ManageListPage';

export default function Categories() {
  return (
    <ManageListPage
      title="Categories"
      description="Product categories used in the shop catalog filters."
      queryKey="admin-categories"
      tableName="categories"
    />
  );
}
