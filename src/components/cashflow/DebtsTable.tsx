import { useState } from "react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Debt } from "@/types/cashflow";
import { format } from "date-fns";
import { Trash2, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { deleteDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useToast } from "@/components/ui/use-toast";
import { PayDebtModal } from "./PayDebtModal";

interface DebtsTableProps {
    debts: Debt[];
    onDebtUpdated: () => void;
}

export const DebtsTable = ({ debts, onDebtUpdated }: DebtsTableProps) => {
    const [searchTerm, setSearchTerm] = useState("");
    const { toast } = useToast();

    const filteredDebts = debts.filter((debt) =>
        debt.supplierName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleDelete = async (id: string) => {
        try {
            await deleteDoc(doc(db, "debts", id));
            toast({
                title: "Success",
                description: "Debt deleted successfully",
            });
            onDebtUpdated();
        } catch (error) {
            console.error("Error deleting debt:", error);
            toast({
                title: "Error",
                description: "Failed to delete debt",
                variant: "destructive",
            });
        }
    };

    const getStatusBadge = (status: Debt["status"]) => {
        switch (status) {
            case "paid":
                return <Badge className="bg-green-600">Paid</Badge>;
            case "partial":
                return <Badge className="bg-yellow-600">Partial</Badge>;
            default:
                return <Badge variant="destructive">Unpaid</Badge>;
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center">
                <div className="relative w-full sm:w-72">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search by supplier..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-8"
                    />
                </div>
            </div>

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Supplier</TableHead>
                            <TableHead>Total Amount</TableHead>
                            <TableHead>Remaining</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Due Date</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredDebts.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-8">
                                    No debts found
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredDebts.map((debt) => (
                                <TableRow key={debt.id}>
                                    <TableCell className="font-medium">{debt.supplierName}</TableCell>
                                    <TableCell>{debt.amount.toLocaleString()} EGP</TableCell>
                                    <TableCell className="text-destructive font-bold">
                                        {debt.remainingAmount.toLocaleString()} EGP
                                    </TableCell>
                                    <TableCell>{getStatusBadge(debt.status)}</TableCell>
                                    <TableCell>
                                        {debt.dueDate ? format(new Date(debt.dueDate), "MMM d, yyyy") : "-"}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            {debt.status !== "paid" && (
                                                <PayDebtModal debt={debt} onPaymentComplete={onDebtUpdated} />
                                            )}

                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="text-destructive">
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                            This will permanently delete this debt record.
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                        <AlertDialogAction onClick={() => handleDelete(debt.id)}>
                                                            Delete
                                                        </AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
};
