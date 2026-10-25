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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { Edit2, Trash2, Search, Filter, Eye, ShoppingCart } from "lucide-react";
import { useState } from "react";
import { CashflowOperation } from "@/types/cashflow";
import { doc, deleteDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useToast } from "@/components/ui/use-toast";
import { formatCurrency } from "@/utils/format";

interface OperationsTableProps {
    operations: CashflowOperation[];
    onOperationUpdated: () => void;
}

export const OperationsTable = ({ operations, onOperationUpdated }: OperationsTableProps) => {
    const [filterType, setFilterType] = useState<"all" | "withdraw" | "deposit">("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedOperation, setSelectedOperation] = useState<CashflowOperation | null>(null);
    const [detailsOpen, setDetailsOpen] = useState(false);
    const { toast } = useToast();

    const filteredOperations = operations.filter((op) => {
        const matchesType = filterType === "all" || op.type === filterType;
        const matchesSearch =
            op.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            op.reason.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesType && matchesSearch;
    });

    const handleDelete = async (id: string) => {
        if (confirm("Are you sure you want to delete this operation?")) {
            try {
                await deleteDoc(doc(db, "cashflow_operations", id));
                toast({
                    title: "Success",
                    description: "Operation deleted successfully",
                });
                onOperationUpdated();
            } catch (error) {
                console.error("Error deleting operation:", error);
                toast({
                    title: "Error",
                    description: "Failed to delete operation",
                    variant: "destructive",
                });
            }
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-2">
                    <div className="relative w-full md:w-64">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search operations..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-8"
                        />
                    </div>
                    <Select
                        value={filterType}
                        onValueChange={(value: "all" | "withdraw" | "deposit") => setFilterType(value)}
                    >
                        <SelectTrigger className="w-[130px]">
                            <Filter className="mr-2 h-4 w-4" />
                            <SelectValue placeholder="Filter" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Types</SelectItem>
                            <SelectItem value="withdraw">Withdrawals</SelectItem>
                            <SelectItem value="deposit">Deposits</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Type</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Employee/Source</TableHead>
                            <TableHead>Reason</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredOperations.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center">
                                    No operations found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredOperations.map((op) => (
                                <TableRow key={op.id}>
                                    <TableCell>
                                        <Badge
                                            variant={op.type === "deposit" ? "default" : "destructive"}
                                            className={op.type === "deposit" ? "bg-green-600 hover:bg-green-700" : ""}
                                        >
                                            {op.type === "deposit" ? "Deposit" : "Withdraw"}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="font-medium">
                                        {formatCurrency(op.amount)}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span>{op.employeeName}</span>
                                            {op.source === 'cashier' && (
                                                <Badge variant="outline" className="w-fit text-[10px] mt-1">
                                                    Cashier System
                                                </Badge>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>{op.reason}</TableCell>
                                    <TableCell>
                                        {format(new Date(op.date), "PP p", { locale: ar })}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            {op.metadata && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => {
                                                        setSelectedOperation(op);
                                                        setDetailsOpen(true);
                                                    }}
                                                >
                                                    <Eye className="h-4 w-4" />
                                                </Button>
                                            )}
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleDelete(op.id)}
                                            >
                                                <Trash2 className="h-4 w-4 text-destructive" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>Operation Details</DialogTitle>
                    </DialogHeader>
                    {selectedOperation && selectedOperation.metadata && (
                        <div className="space-y-4">
                            <div className="flex justify-between items-center bg-muted p-3 rounded-lg">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Sale ID</p>
                                    <p className="font-mono">{selectedOperation.metadata.saleId}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-medium text-muted-foreground">Customer</p>
                                    <p>{selectedOperation.metadata.customerName}</p>
                                </div>
                            </div>

                            <div>
                                <h4 className="font-medium mb-2 flex items-center gap-2">
                                    <ShoppingCart className="h-4 w-4" /> Purchased Items
                                </h4>
                                <div className="border rounded-md divide-y">
                                    {selectedOperation.metadata.items?.map((item: any, idx: number) => (
                                        <div key={idx} className="p-3 flex justify-between items-center">
                                            <div>
                                                <p className="font-medium">{item.name}</p>
                                                <p className="text-sm text-muted-foreground">Qty: {item.quantity}</p>
                                            </div>
                                            <p className="font-medium">{formatCurrency(item.price * item.quantity)}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="flex justify-between items-center pt-4 border-t">
                                <span className="font-bold text-lg">Total Amount</span>
                                <span className="font-bold text-lg text-green-600">
                                    {formatCurrency(selectedOperation.amount)}
                                </span>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
};
