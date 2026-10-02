import React, { useState } from 'react';
import { Sliders, CheckCircle2, ShieldCheck, ToggleLeft, ToggleRight } from 'lucide-react';
import { Button, Badge } from '@repo/ui';

interface GatewayMethod {
  id: string;
  name: string;
  type: 'MOBILE_BANKING' | 'BANK_WIRE' | 'CASH_ON_DELIVERY';
  feePercentage: number;
  isActive: boolean;
  testMode: boolean;
}

const initialGateways: GatewayMethod[] = [
  {
    id: 'gw-bkash',
    name: 'bKash Merchant Direct',
    type: 'MOBILE_BANKING',
    feePercentage: 1.5,
    isActive: true,
    testMode: false,
  },
  {
    id: 'gw-nagad',
    name: 'Nagad Online Payment',
    type: 'MOBILE_BANKING',
    feePercentage: 1.5,
    isActive: true,
    testMode: false,
  },
  {
    id: 'gw-bank',
    name: 'Direct Corporate Bank Wire (BRAC / EBL)',
    type: 'BANK_WIRE',
    feePercentage: 0.0,
    isActive: true,
    testMode: false,
  },
  {
    id: 'gw-cod',
    name: 'Cash on Delivery (Courier Hub Pay)',
    type: 'CASH_ON_DELIVERY',
    feePercentage: 1.0,
    isActive: true,
    testMode: false,
  },
];

export default function PaymentMethodsPage() {
  const [methods, setMethods] = useState<GatewayMethod[]>(initialGateways);

  const toggleStatus = (id: string) => {
    setMethods((prev) =>
      prev.map((m) => (m.id === id ? { ...m, isActive: !m.isActive } : m))
    );
  };

  const toggleTestMode = (id: string) => {
    setMethods((prev) =>
      prev.map((m) => (m.id === id ? { ...m, testMode: !m.testMode } : m))
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Sliders className="h-6 w-6 text-primary" />
            Payment Gateways & Methods
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Configure checkout payment channels, transaction fees, and sandbox testing modes.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {methods.map((method) => (
          <div key={method.id} className="p-5 rounded-xl border border-border bg-card space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-foreground">{method.name}</h3>
                <span className="text-[11px] text-muted-foreground font-mono">{method.type}</span>
              </div>
              <Badge variant={method.isActive ? 'default' : 'secondary'} className="text-[10px]">
                {method.isActive ? 'ACTIVE' : 'DISABLED'}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-border">
              <div>
                <span className="text-muted-foreground">Gateway Fee:</span>
                <span className="ml-1.5 font-semibold text-foreground">{method.feePercentage}%</span>
              </div>
              <div>
                <span className="text-muted-foreground">Environment:</span>
                <span className={`ml-1.5 font-semibold ${method.testMode ? 'text-amber-500' : 'text-emerald-500'}`}>
                  {method.testMode ? 'Sandbox' : 'Production'}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-border">
              <Button
                size="sm"
                variant="outline"
                onClick={() => toggleTestMode(method.id)}
                className="text-xs h-7"
              >
                Toggle {method.testMode ? 'Production' : 'Sandbox'}
              </Button>
              <Button
                size="sm"
                variant={method.isActive ? 'destructive' : 'default'}
                onClick={() => toggleStatus(method.id)}
                className="text-xs h-7"
              >
                {method.isActive ? 'Disable' : 'Enable'}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
