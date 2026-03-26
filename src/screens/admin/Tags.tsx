"use client";

import { Tag } from 'lucide-react';
import ManageListPage from '@/components/ManageListPage';

export default function Tags() {
  return (
    <ManageListPage
      title="Tags"
      icon={<Tag className="h-5 w-5" />}
      description="Tags used for landing page sections and promotions."
      queryKey="admin-tags"
      tableName="tags"
    />
  );
}
