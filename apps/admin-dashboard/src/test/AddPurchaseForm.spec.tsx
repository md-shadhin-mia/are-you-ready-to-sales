import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { AddPurchaseModal, calculatePurchaseTotals } from "../pages/purchases/AddPurchaseModal";

describe("AddPurchaseModal Component (TDD)", () => {
  const sampleSuppliers = [
    { id: "sup-1", companyName: "Apex Manufacturing Ltd" },
    { id: "sup-2", companyName: "Square Textiles" },
  ];

  it("calculates purchase totals correctly: Subtotal, Tax, Freight, Grand Total", () => {
    const items = [
      { sku: "SKU-1", title: "Item 1", quantity: 10, unitCost: 100, taxRate: 5 }, // 1000 + 50 = 1050
      { sku: "SKU-2", title: "Item 2", quantity: 5, unitCost: 200, taxRate: 10 }, // 1000 + 100 = 1100
    ];
    const freight = 150;

    const totals = calculatePurchaseTotals(items, freight);
    expect(totals.subtotal).toBe(2000);
    expect(totals.tax).toBe(150);
    expect(totals.grandTotal).toBe(2300); // 2000 + 150 + 150
  });

  it("requires at least one purchase item before submitting", async () => {
    const handleSubmit = vi.fn();
    render(
      <AddPurchaseModal
        isOpen={true}
        onClose={vi.fn()}
        suppliers={sampleSuppliers}
        onSubmit={handleSubmit}
      />
    );

    const submitBtn = screen.getByRole("button", { name: /Record Direct Purchase/i });
    fireEvent.click(submitBtn);

    expect(await screen.findByText(/At least one item is required/i)).toBeInTheDocument();
    expect(handleSubmit).not.toHaveBeenCalled();
  });

  it("adds line items dynamically and submits full purchase payload", async () => {
    const handleSubmit = vi.fn().mockResolvedValue(undefined);
    render(
      <AddPurchaseModal
        isOpen={true}
        onClose={vi.fn()}
        suppliers={sampleSuppliers}
        onSubmit={handleSubmit}
      />
    );

    // Fill supplier and invoice
    fireEvent.change(screen.getByLabelText(/Supplier/i), { target: { value: "sup-1" } });
    fireEvent.change(screen.getByLabelText(/Invoice Number/i), { target: { value: "INV-2026-99" } });

    // Click Add Line Item
    const addRowBtn = screen.getByRole("button", { name: /Add Item Line/i });
    fireEvent.click(addRowBtn);

    // Fill line item fields
    fireEvent.change(screen.getByPlaceholderText(/Item Title/i), { target: { value: "Cotton Polo Shirt" } });
    fireEvent.change(screen.getByPlaceholderText(/SKU/i), { target: { value: "POLO-WHT-L" } });
    fireEvent.change(screen.getByLabelText(/Qty/i), { target: { value: "50" } });
    fireEvent.change(screen.getByLabelText(/Unit Cost/i), { target: { value: "300" } });

    const submitBtn = screen.getByRole("button", { name: /Record Direct Purchase/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(handleSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          supplierId: "sup-1",
          invoiceNumber: "INV-2026-99",
          items: expect.arrayContaining([
            expect.objectContaining({
              sku: "POLO-WHT-L",
              quantity: 50,
              unitCost: 300,
            }),
          ]),
        })
      );
    });
  });
});
