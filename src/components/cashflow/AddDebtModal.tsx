import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { db } from "@/lib/firebase";
import { collection, addDoc, doc, updateDoc } from "firebase/firestore";
import { Loader2, Plus, Check, ChevronsUpDown } from "lucide-react";
import { Debt } from "@/types/cashflow";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface AddDebtModalProps {
    onDebtAdded: () => void;
    existingDebts: Debt[];
}

export const AddDebtModal = ({ onDebtAdded, existingDebts }: AddDebtModalProps) => {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [supplierName, setSupplierName] = useState("");
    const [amount, setAmount] = useState("");
    const [dueDate, setDueDate] = useState("");
    const [notes, setNotes] = useState("");
    const [comboboxOpen, setComboboxOpen] = useState(false);
    const { toast } = useToast();

    // Extract unique supplier names
    const uniqueSuppliers = useMemo(() => {
        const names = new Set(existingDebts.map(d => d.supplierName));
        return Array.from(names).sort();
    }, [existingDebts]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!amount || !supplierName) {
            toast({
                title: "Error",
                description: "Please fill in required fields",
                variant: "destructive",
            });
            return;
        }

        setLoading(true);
        try {
            // Check if supplier already has a debt record
            const existingDebt = existingDebts.find(
                d => d.supplierName.toLowerCase() === supplierName.toLowerCase()
            );

            if (existingDebt) {
                // Merge with existing debt
                const newAmount = Number(amount);
                await updateDoc(doc(db, "debts", existingDebt.id), {
                    amount: existingDebt.amount + newAmount,
                    remainingAmount: existingDebt.remainingAmount + newAmount,
                    status: "partial", // Reset to partial/unpaid since we added more debt
                    notes: existingDebt.notes + `\n[${new Date().toLocaleDateString()}] Added ${newAmount}: ${notes}`,
                    // Update due date only if new one is provided
                    ...(dueDate ? { dueDate: new Date(dueDate).toISOString() } : {}),
                });

                toast({
                    title: "Success",
                    description: `Added ${newAmount} to existing debt for ${supplierName}`,
                });
            } else {
                // Create new debt
                await addDoc(collection(db, "debts"), {
                    supplierName,
                    amount: Number(amount),
                    remainingAmount: Number(amount),
                    dueDate: dueDate ? new Date(dueDate).toISOString() : null,
                    notes,
                    status: "unpaid",
                    createdAt: new Date().toISOString(),
                });

                toast({
                    title: "Success",
                    description: "New debt record created",
                });
            }

            setOpen(false);
            resetForm();
            onDebtAdded();
        } catch (error) {
            console.error("Error adding debt:", error);
            toast({
                title: "Error",
                description: "Failed to add debt",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setSupplierName("");
        setAmount("");
        setDueDate("");
        setNotes("");
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline">
                    <Plus className="mr-2 h-4 w-4" /> Add Debt
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Add Debt</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2 flex flex-col">
                        <Label>Supplier/Partner Name</Label>
                        <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    role="combobox"
                                    aria-expanded={comboboxOpen}
                                    className="justify-between"
                                >
                                    {supplierName || "Select or type name..."}
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="p-0">
                                <Command>
                                    <CommandInput
                                        placeholder="Search supplier..."
                                        onValueChange={(search) => {
                                            // Allow typing new names that aren't in the list
                                            if (!uniqueSuppliers.includes(search)) {
                                                setSupplierName(search);
                                            }
                                        }}
                                    />
                                    <CommandList>
                                        <CommandEmpty>
                                            <div className="p-2 text-sm text-muted-foreground">
                                                Type to add "{supplierName}"
                                            </div>
                                        </CommandEmpty>
                                        <CommandGroup>
                                            {uniqueSuppliers.map((name) => (
                                                <CommandItem
                                                    key={name}
                                                    value={name}
                                                    onSelect={(currentValue) => {
                                                        setSupplierName(currentValue);
                                                        setComboboxOpen(false);
                                                    }}
                                                >
                                                    <Check
                                                        className={cn(
                                                            "mr-2 h-4 w-4",
                                                            supplierName === name ? "opacity-100" : "opacity-0"
                                                        )}
                                                    />
                                                    {name}
                                                </CommandItem>
                                            ))}
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
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
                        <Label>Due Date (Optional)</Label>
                        <Input
                            type="date"
                            value={dueDate}
                            onChange={(e) => setDueDate(e.target.value)}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Notes</Label>
                        <Textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Additional notes..."
                        />
                    </div>

                    <Button type="submit" className="w-full" disabled={loading}>
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Debt
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    );
};
