import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CashflowStats as StatsType } from "@/types/cashflow";
import { ArrowDownRight, ArrowUpRight, Wallet } from "lucide-react";

interface CashflowStatsProps {
    stats: StatsType;
}

export const CashflowStats = ({ stats }: CashflowStatsProps) => {
    return (
        <div className="grid gap-4 md:grid-cols-3">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Balance</CardTitle>
                    <Wallet className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{stats.balance.toLocaleString()} EGP</div>
                    <p className="text-xs text-muted-foreground">
                        Current treasury balance
                    </p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Deposits</CardTitle>
                    <ArrowUpRight className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-green-600">
                        +{stats.totalIn.toLocaleString()} EGP
                    </div>
                    <p className="text-xs text-muted-foreground">
                        Total money in
                    </p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Withdrawals</CardTitle>
                    <ArrowDownRight className="h-4 w-4 text-red-600" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-red-600">
                        -{stats.totalOut.toLocaleString()} EGP
                    </div>
                    <p className="text-xs text-muted-foreground">
                        Total money out
                    </p>
                </CardContent>
            </Card>
        </div>
    );
};
