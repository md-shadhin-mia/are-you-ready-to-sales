import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { KycAuditModal } from "../pages/students/KycAuditModal";

describe("KycAuditModal Component (TDD)", () => {
  const mockStudent = {
    id: "std-1",
    fullName: "Rahim Chowdhury",
    email: "rahim@platform.local",
    phone: "+8801700000021",
    nationalId: "19941234567890123",
    kycDocuments: {
      nidFront: "https://cdn.platform.local/nid-front.jpg",
      nidBack: "https://cdn.platform.local/nid-back.jpg",
      photo: "https://cdn.platform.local/photo.jpg",
    },
  };

  it("renders student information and side-by-side NID document previews", () => {
    render(
      <KycAuditModal
        isOpen={true}
        onClose={vi.fn()}
        student={mockStudent}
        onDecision={vi.fn()}
      />
    );

    expect(screen.getByText("Rahim Chowdhury")).toBeInTheDocument();
    expect(screen.getByText("19941234567890123")).toBeInTheDocument();
    expect(screen.getByText("NID Front")).toBeInTheDocument();
    expect(screen.getByText("NID Back")).toBeInTheDocument();
  });

  it("requires a rejection reason when REJECT decision is selected", async () => {
    const handleDecision = vi.fn();
    render(
      <KycAuditModal
        isOpen={true}
        onClose={vi.fn()}
        student={mockStudent}
        onDecision={handleDecision}
      />
    );

    // Click Reject radio/button
    const rejectBtn = screen.getByTestId("decision-reject");
    fireEvent.click(rejectBtn);

    // Try submitting without reason
    const submitBtn = screen.getByRole("button", { name: /Submit Decision/i });
    fireEvent.click(submitBtn);

    expect(await screen.findByText(/Rejection reason is required/i)).toBeInTheDocument();
    expect(handleDecision).not.toHaveBeenCalled();
  });

  it("submits approval with auditor notes successfully", async () => {
    const handleDecision = vi.fn().mockResolvedValue(undefined);
    render(
      <KycAuditModal
        isOpen={true}
        onClose={vi.fn()}
        student={mockStudent}
        onDecision={handleDecision}
      />
    );

    // Enter auditor notes
    const notesInput = screen.getByPlaceholderText(/Enter verification notes/i);
    fireEvent.change(notesInput, { target: { value: "All documents valid and verified against election database." } });

    // Click submit
    const submitBtn = screen.getByRole("button", { name: /Submit Decision/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(handleDecision).toHaveBeenCalledWith(
        expect.objectContaining({
          decision: "APPROVE",
          auditorNotes: "All documents valid and verified against election database.",
        })
      );
    });
  });
});
