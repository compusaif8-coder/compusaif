import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { db } from "@/lib/firebase";
import { collection, addDoc } from "firebase/firestore";
import { OperationType } from "@/types/cashflow";
import { Loader2, Plus } from "lucide-react";

interface AddOperationModalProps {
    onOperationAdded: () => void;
}

export const AddOperationModal = ({ onOperationAdded }: AddOperationModalProps) => {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [type, setType] = useState<OperationType>("withdraw");
    const [amount, setAmount] = useState("");
    const [employeeName, setEmployeeName] = useState("");
    const [reason, setReason] = useState("");
    const { toast } = useToast();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!amount || !employeeName || !reason) {
            toast({
                title: "Error",
                description: "Please fill in all required fields",
                variant: "destructive",
            });
            return;
        }

        setLoading(true);
        try {
            await addDoc(collection(db, "cashflow_operations"), {
                type,
                amount: Number(amount),
                employeeName,
                reason,
                date: new Date().toISOString(),
                createdBy: "admin", // TODO: Replace with actual user ID
            });

            toast({
                title: "Success",
                description: "Operation added successfully",
            });
            setOpen(false);
            resetForm();
            onOperationAdded();
        } catch (error) {
            console.error("Error adding operation:", error);
            toast({
                title: "Error",
                description: "Failed to add operation",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setType("withdraw");
        setAmount("");
        setEmployeeName("");
        setReason("");
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <Plus className="mr-2 h-4 w-4" /> Add Operation
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Add New Operation</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label>Operation Type</Label>
                        <Select value={type} onValueChange={(val: OperationType) => setType(val)}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="withdraw">Withdrawal (سحب)</SelectItem>
                                <SelectItem value="deposit">Deposit (إيداع)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>Amount</Label>
                        <Input
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="0.00"
                            min="0"
                            step="0.01"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Employee Name</Label>
                        <Input
                            value={employeeName}
                            onChange={(e) => setEmployeeName(e.target.value)}
                            placeholder="Enter employee name"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Reason</Label>
                        <Textarea
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="Reason for operation..."
                        />
                    </div>

                    <Button type="submit" className="w-full" disabled={loading}>
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Operation
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    );
};
