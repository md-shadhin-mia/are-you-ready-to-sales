import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { CreateExchangeWizard, calculateExchangeDelta } from "../pages/exchanges/CreateExchangeWizard";

describe("CreateExchangeWizard Component (TDD)", () => {
  const sampleOrder = {
    orderNumber: "ORD-94812",
    customerName: "Sakib Al Hasan",
    customerPhone: "+8801700112233",
    items: [
      { id: "item-1", sku: "TSHIRT-BLK-M", title: "Classic Black T-Shirt (M)", price: 1000, quantity: 1 },
    ],
  };

  const sampleCatalog = [
    { id: "prod-2", sku: "TSHIRT-BLK-L", title: "Classic Black T-Shirt (L)", basePrice: 1200, stock: 15 },
  ];

  it("calculates exchange price delta correctly: (Replacement - Original) + Fee", () => {
    // Replacement: 1200, Original: 1000, Exchange Fee: 120 -> Delta = +320
    const delta = calculateExchangeDelta(1000, 1200, 120);
    expect(delta).toBe(320);

    // Replacement cheaper: Replacement: 800, Original: 1000, Fee: 120 -> Delta = -80 (Refund to customer)
    const refundDelta = calculateExchangeDelta(1000, 800, 120);
    expect(refundDelta).toBe(-80);
  });

  it("enforces proof photo upload when defect reason is selected", async () => {
    render(
      <CreateExchangeWizard
        isOpen={true}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
        initialOrder={sampleOrder}
        catalog={sampleCatalog}
      />
    );

    // Step 1: Click next to proceed to items
    const step1Next = screen.getByRole("button", { name: /Proceed to Items/i });
    fireEvent.click(step1Next);

    // Step 2: Select return item
    const itemCheckbox = screen.getByRole("checkbox");
    fireEvent.click(itemCheckbox);

    // Select "Defective" reason
    const reasonSelect = screen.getByLabelText(/Defect Reason/i);
    fireEvent.change(reasonSelect, { target: { value: "DEFECTIVE_PRODUCT" } });

    // Try proceeding without proof photo
    const step2Next = screen.getByRole("button", { name: /Next: Select Replacement/i });
    fireEvent.click(step2Next);

    expect(await screen.findByText(/Proof photo is required for defective claims/i)).toBeInTheDocument();
  });

  it("completes full 4-step wizard and submits exchange order payload", async () => {
    const handleSuccess = vi.fn().mockResolvedValue(undefined);
    render(
      <CreateExchangeWizard
        isOpen={true}
        onClose={vi.fn()}
        onSuccess={handleSuccess}
        initialOrder={sampleOrder}
        catalog={sampleCatalog}
      />
    );

    // Step 1
    fireEvent.click(screen.getByRole("button", { name: /Proceed to Items/i }));

    // Step 2: Select item and non-defect reason (e.g. Size Mismatch)
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.change(screen.getByLabelText(/Defect Reason/i), { target: { value: "SIZE_TOO_SMALL" } });
    fireEvent.click(screen.getByRole("button", { name: /Next: Select Replacement/i }));

    // Step 3: Select replacement SKU
    const selectReplacement = await screen.findByRole("button", { name: /Select Replacement SKU/i });
    fireEvent.click(selectReplacement);
    fireEvent.click(screen.getByRole("button", { name: /Next: Review Price Delta/i }));

    // Step 4: Verify calculated summary and submit
    const matches = await screen.findAllByText(/320/);
    expect(matches.length).toBeGreaterThan(0);

    const submitBtn = screen.getByRole("button", { name: /Confirm & Dispatch Exchange/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(handleSuccess).toHaveBeenCalledWith(
        expect.objectContaining({
          originalOrderNumber: "ORD-94812",
          priceAdjustment: 320,
        })
      );
    });
  });
});
