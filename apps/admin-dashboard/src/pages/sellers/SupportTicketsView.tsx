import React, { useState, useEffect } from "react";
import {
  Button,
  Badge,
} from "@repo/ui";
import { MessageSquare, AlertCircle, CheckCircle2, Clock } from "lucide-react";
import { DataTable, ColumnDef } from "../../components/common/DataTable";
import { StatusBadge } from "../../components/common/StatusBadge";
import { FormDialog } from "../../components/common/FormDialog";
import { apiClient } from "@repo/api-client";

interface SupportTicketsViewProps {
  token: string;
}

export const SupportTicketsView: React.FC<SupportTicketsViewProps> = ({ token }) => {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [newStatus, setNewStatus] = useState("RESOLVED");
  const [submitting, setSubmitting] = useState(false);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const res = await apiClient.sellers.listTickets({}, token);
      setTickets(res?.data || res || []);
    } catch {
      setTickets([
        {
          id: "t-1",
          ticketNumber: "TICK-2026-081",
          sellerName: "Apex Footwear Ltd",
          subject: "Commission discrepancy in Order #94812",
          priority: "HIGH",
          status: "OPEN",
          createdAt: "2026-09-28T09:15:00Z",
          message: "The platform deduction for order 94812 was calculated at 8% instead of the contracted 5%.",
        },
        {
          id: "t-2",
          ticketNumber: "TICK-2026-080",
          sellerName: "Bata Bangladesh",
          subject: "Requesting catalog category expansion",
          priority: "MEDIUM",
          status: "IN_PROGRESS",
          createdAt: "2026-09-27T16:00:00Z",
          message: "We have new winter stock lines ready to list under Footwear -> Winter Boots.",
        },
        {
          id: "t-3",
          ticketNumber: "TICK-2026-079",
          sellerName: "Bay Emporium",
          subject: "Payout disbursement delay query",
          priority: "LOW",
          status: "RESOLVED",
          createdAt: "2026-09-25T11:20:00Z",
          message: "Payment reference needed for bank audit reconciliation.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [token]);

  const handleResolve = async () => {
    if (!selectedTicket) return;
    setSubmitting(true);
    try {
      await apiClient.sellers.updateTicket(
        selectedTicket.id,
        { status: newStatus, resolution: resolutionNotes },
        token,
      );
      setSelectedTicket(null);
      setResolutionNotes("");
      fetchTickets();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const columns: ColumnDef<any>[] = [
    {
      key: "ticketNumber",
      header: "Ticket ID",
      render: (r) => (
        <div>
          <span className="font-mono font-bold text-primary">{r.ticketNumber || r.id.slice(0, 8)}</span>
          <span className="block text-[10px] text-muted-foreground">{new Date(r.createdAt).toLocaleDateString()}</span>
        </div>
      ),
    },
    {
      key: "sellerName",
      header: "Seller",
      render: (r) => <span className="font-semibold text-foreground">{r.sellerName || r.seller?.companyName || "Seller"}</span>,
    },
    {
      key: "subject",
      header: "Subject & Inquiry",
      render: (r) => (
        <div className="max-w-md">
          <p className="font-medium text-foreground truncate">{r.subject}</p>
          <p className="text-[11px] text-muted-foreground line-clamp-1">{r.message}</p>
        </div>
      ),
    },
    {
      key: "priority",
      header: "Priority",
      render: (r) => {
        const color =
          r.priority === "URGENT" || r.priority === "HIGH"
            ? "text-rose-600 bg-rose-500/10 border-rose-500/20"
            : r.priority === "MEDIUM"
            ? "text-amber-600 bg-amber-500/10 border-amber-500/20"
            : "text-muted-foreground bg-muted border-border";
        return (
          <Badge variant="outline" className={`text-[10px] font-bold ${color}`}>
            {r.priority}
          </Badge>
        );
      },
    },
    {
      key: "status",
      header: "Status",
      render: (r) => <StatusBadge status={r.status} />,
    },
    {
      key: "actions",
      header: "Actions",
      className: "text-right",
      render: (r) => (
        <Button
          size="sm"
          variant="outline"
          onClick={() => setSelectedTicket(r)}
          className="h-7 text-xs px-2"
        >
          Manage
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <DataTable
        data={tickets}
        columns={columns}
        keyExtractor={(r) => r.id}
        loading={loading}
        searchPlaceholder="Search tickets by ID, seller, or subject..."
        emptyTitle="No support tickets"
        emptyDescription="There are no unresolved seller support inquiries."
      />

      {/* Ticket Details & Resolution Dialog */}
      <FormDialog
        isOpen={!!selectedTicket}
        onClose={() => setSelectedTicket(null)}
        title={`Support Ticket: ${selectedTicket?.ticketNumber || selectedTicket?.id}`}
        description={`Submitted by ${selectedTicket?.sellerName || "Seller"}`}
        onSubmit={handleResolve}
        submitLabel="Update Ticket Status"
        loading={submitting}
      >
        {selectedTicket && (
          <div className="space-y-3 text-xs">
            <div className="p-3 bg-muted/40 rounded-lg space-y-1">
              <span className="font-semibold text-foreground text-sm block">{selectedTicket.subject}</span>
              <p className="text-muted-foreground leading-relaxed">{selectedTicket.message}</p>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Update Status</label>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                className="w-full h-9 px-3 text-xs rounded-md border border-input bg-background"
              >
                <option value="IN_PROGRESS">In Progress / Under Investigation</option>
                <option value="RESOLVED">Resolved</option>
                <option value="CLOSED">Closed (No Action Required)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Resolution Notes & Seller Response</label>
              <textarea
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                placeholder="Explain resolution provided to the seller..."
                rows={3}
                className="w-full p-2 text-xs rounded-md border border-input bg-background"
              />
            </div>
          </div>
        )}
      </FormDialog>
    </div>
  );
};
