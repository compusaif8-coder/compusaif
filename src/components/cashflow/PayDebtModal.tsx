import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { db } from "@/lib/firebase";
import { collection, addDoc, doc, updateDoc } from "firebase/firestore";
import { Debt } from "@/types/cashflow";
import { Loader2, Banknote } from "lucide-react";

interface PayDebtModalProps {
    debt: Debt;
    onPaymentComplete: () => void;
}

export const PayDebtModal = ({ debt, onPaymentComplete }: PayDebtModalProps) => {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [amount, setAmount] = useState("");
    const [notes, setNotes] = useState("");
    const { toast } = useToast();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const payAmount = Number(amount);

        if (!payAmount || payAmount <= 0) {
            toast({
                title: "Error",
                description: "Please enter a valid amount",
                variant: "destructive",
            });
            return;
        }

        if (payAmount > debt.remainingAmount) {
            toast({
                title: "Error",
                description: `Amount cannot exceed remaining debt (${debt.remainingAmount})`,
                variant: "destructive",
            });
            return;
        }

        setLoading(true);
        try {
            // 1. Create Withdrawal Operation
            await addDoc(collection(db, "cashflow_operations"), {
                type: "withdraw",
                amount: payAmount,
                employeeName: "System", // Or current user
                reason: `Debt Payment: ${debt.supplierName} ${notes ? `(${notes})` : ""}`,
                date: new Date().toISOString(),
                createdBy: "admin",
            });

            // 2. Update Debt
            const newRemaining = debt.remainingAmount - payAmount;
            const newStatus = newRemaining <= 0 ? "paid" : "partial";

            await updateDoc(doc(db, "debts", debt.id), {
                remainingAmount: newRemaining,
                status: newStatus,
            });

            toast({
                title: "Success",
                description: "Payment recorded successfully",
            });
            setOpen(false);
            setAmount("");
            setNotes("");
            onPaymentComplete();
        } catch (error) {
            console.error("Error processing payment:", error);
            toast({
                title: "Error",
                description: "Failed to process payment",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="h-8">
                    <Banknote className="mr-2 h-4 w-4" /> Pay
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Pay Debt - {debt.supplierName}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="p-4 bg-muted rounded-md">
                        <div className="flex justify-between text-sm mb-2">
                            <span>Total Debt:</span>
                            <span className="font-medium">{debt.amount.toLocaleString()} EGP</span>
                        </div>
                        <div className="flex justify-between text-sm font-bold">
                            <span>Remaining:</span>
                            <span className="text-destructive">{debt.remainingAmount.toLocaleString()} EGP</span>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Payment Amount</Label>
                        <Input
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="0.00"
                            min="0"
                            max={debt.remainingAmount}
                            step="0.01"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Notes</Label>
                        <Textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Payment notes..."
                        />
                    </div>

                    <Button type="submit" className="w-full" disabled={loading}>
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Confirm Payment
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    );
};
