"use client";

import { InventoryManager } from '@/components/InventoryManager';

export default function Inventory() {
  return (
    <div className="animate-fade-in space-y-6">
      <InventoryManager scope="admin" />
    </div>
  );
}
