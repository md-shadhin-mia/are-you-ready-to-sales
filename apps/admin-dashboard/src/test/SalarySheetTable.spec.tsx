import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import SalarySheetPage from '../pages/employees/SalarySheetPage';

describe('SalarySheetPage Component (TDD)', () => {
  it('dynamically recalculates net salary when penalty is updated in draft mode', async () => {
    render(<SalarySheetPage />);

    // Initial Net for first employee: Base 35000 + Comm 5000 - Penalty 1000 = 39000
    expect(screen.getByTestId('net-salary-emp-1')).toHaveTextContent('39,000');

    // Change penalty input from 1000 to 2500
    const penaltyInput = screen.getByTestId('penalty-input-emp-1');
    fireEvent.change(penaltyInput, { target: { value: '2500' } });

    // New Net: 35000 + 5000 - 2500 = 37500
    expect(screen.getByTestId('net-salary-emp-1')).toHaveTextContent('37,500');
  });

  it('disables editing and shows LOCKED badge when payroll is finalized', async () => {
    render(<SalarySheetPage />);

    const finalizeBtn = screen.getByRole('button', { name: /Finalize & Lock Payroll/i });
    fireEvent.click(finalizeBtn);

    // Confirm prompt dialog
    const confirmBtn = screen.getByRole('button', { name: /Confirm Lock/i });
    fireEvent.click(confirmBtn);

    // LOCKED badge is displayed
    expect(screen.getByTestId('payroll-locked-badge')).toBeInTheDocument();

    // Inputs are now disabled
    const penaltyInput = screen.getByTestId('penalty-input-emp-1');
    expect(penaltyInput).toBeDisabled();
  });
});
