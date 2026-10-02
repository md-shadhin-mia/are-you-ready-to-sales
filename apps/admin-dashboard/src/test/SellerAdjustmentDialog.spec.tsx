import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { SellerAdjustmentModal } from "../pages/sellers/SellerAdjustmentModal";

describe("SellerAdjustmentModal Component (TDD)", () => {
  const sampleSeller = {
    id: "sel-1",
    companyName: "Apex Footwear Ltd",
    contactName: "Syed Nasim Manzur",
    balance: 25000,
  };

  it("shows dual-admin authorization banner when adjustment amount exceeds BDT 10,000", async () => {
    render(
      <SellerAdjustmentModal
        isOpen={true}
        onClose={vi.fn()}
        seller={sampleSeller}
        onSubmit={vi.fn()}
      />
    );

    // Initial amount 0 -> no dual auth banner
    expect(screen.queryByText(/Requires Dual-Admin Authorization/i)).not.toBeInTheDocument();

    // Type 15,000
    const amountInput = screen.getByLabelText(/Adjustment Amount/i);
    fireEvent.change(amountInput, { target: { value: "15000" } });

    expect(await screen.findByText(/Requires Dual-Admin Authorization/i)).toBeInTheDocument();
  });

  it("requires a reason code before submission", async () => {
    const handleSubmit = vi.fn();
    render(
      <SellerAdjustmentModal
        isOpen={true}
        onClose={vi.fn()}
        seller={sampleSeller}
        onSubmit={handleSubmit}
      />
    );

    const amountInput = screen.getByLabelText(/Adjustment Amount/i);
    fireEvent.change(amountInput, { target: { value: "5000" } });

    // Submit without selecting reason
    const submitBtn = screen.getByRole("button", { name: /Submit Adjustment/i });
    fireEvent.click(submitBtn);

    expect(await screen.findByText(/Reason code is required/i)).toBeInTheDocument();
    expect(handleSubmit).not.toHaveBeenCalled();
  });

  it("submits valid adjustment payload to callback", async () => {
    const handleSubmit = vi.fn().mockResolvedValue(undefined);
    render(
      <SellerAdjustmentModal
        isOpen={true}
        onClose={vi.fn()}
        seller={sampleSeller}
        onSubmit={handleSubmit}
      />
    );

    fireEvent.change(screen.getByLabelText(/Adjustment Amount/i), { target: { value: "2500" } });
    fireEvent.change(screen.getByLabelText(/Reason Code/i), { target: { value: "COMMISSION_CORRECTION" } });
    fireEvent.change(screen.getByLabelText(/Notes/i), { target: { value: "Correction for March order" } });

    const submitBtn = screen.getByRole("button", { name: /Submit Adjustment/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(handleSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 2500,
          reasonCode: "COMMISSION_CORRECTION",
          notes: "Correction for March order",
        })
      );
    });
  });
});
