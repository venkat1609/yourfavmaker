"use client";

import ManageListPage from '@/components/ManageListPage';

export default function Tags() {
  return (
    <ManageListPage
      title="Tags"
      description="Tags used for landing page sections and promotions."
      queryKey="admin-tags"
      tableName="tags"
    />
  );
}
