import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import StockAdjustmentModal from '../pages/inventory/StockAdjustmentModal';

describe('StockAdjustmentModal Component (TDD)', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onSubmit: vi.fn(),
    initialStockItem: {
      sku: 'SKU-SHIRT-BLUE-L',
      productName: 'Oxford Cotton Shirt - Blue L',
      warehouseHub: 'Central Hub - Dhaka',
      systemCount: 45,
    },
  };

  it('calculates discrepancy automatically based on physical count input', async () => {
    render(<StockAdjustmentModal {...defaultProps} />);

    expect(screen.getByText('SKU-SHIRT-BLUE-L')).toBeInTheDocument();
    expect(screen.getByText('45')).toBeInTheDocument();

    const physicalInput = screen.getByLabelText(/Actual Physical Count/i);
    fireEvent.change(physicalInput, { target: { value: '40' } });

    // Discrepancy: 40 - 45 = -5
    expect(screen.getByTestId('calculated-discrepancy')).toHaveTextContent('-5');
  });

  it('requires shrinkage reason code when physical count is less than system count', async () => {
    const onSubmit = vi.fn();
    render(<StockAdjustmentModal {...defaultProps} onSubmit={onSubmit} />);

    const physicalInput = screen.getByLabelText(/Actual Physical Count/i);
    fireEvent.change(physicalInput, { target: { value: '42' } });

    // Try submitting without reason
    const submitBtn = screen.getByRole('button', { name: /Submit Adjustment/i });
    fireEvent.click(submitBtn);

    expect(await screen.findByText(/Shrinkage reason code is required for negative discrepancy/i)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits valid adjustment payload with supervisor notes', async () => {
    const onSubmit = vi.fn();
    render(<StockAdjustmentModal {...defaultProps} onSubmit={onSubmit} />);

    const physicalInput = screen.getByLabelText(/Actual Physical Count/i);
    fireEvent.change(physicalInput, { target: { value: '42' } });

    const reasonSelect = screen.getByLabelText(/Adjustment Reason/i);
    fireEvent.change(reasonSelect, { target: { value: 'THEFT_SHRINKAGE' } });

    const notesInput = screen.getByLabelText(/Supervisor Signature \/ Notes/i);
    fireEvent.change(notesInput, { target: { value: 'Verified by Warehouse Manager' } });

    const submitBtn = screen.getByRole('button', { name: /Submit Adjustment/i });
    fireEvent.click(submitBtn);

    expect(onSubmit).toHaveBeenCalledWith({
      sku: 'SKU-SHIRT-BLUE-L',
      warehouseHub: 'Central Hub - Dhaka',
      systemCount: 45,
      physicalCount: 42,
      discrepancy: -3,
      reason: 'THEFT_SHRINKAGE',
      notes: 'Verified by Warehouse Manager',
    });
  });
});
