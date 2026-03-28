"use client";

import { InventoryManager } from '@/components/InventoryManager';

export default function Inventory() {
  return (
    <div className="animate-fade-in space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-heading">Inventory</h1>
        <p className="text-sm text-muted-foreground max-w-2xl">
          Manage stock for products and variants separately from the product catalog.
        </p>
      </div>

      <InventoryManager scope="admin" />
    </div>
  );
}
