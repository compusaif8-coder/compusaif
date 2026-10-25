import React, { useState, useEffect, useCallback } from "react";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, limit, getDocs, startAfter, Timestamp } from "firebase/firestore";
import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft,
  RefreshCw,
  Monitor,
  Smartphone,
  Tablet,
  Globe,
  Clock,
  User,
  Wifi,
  MapPin,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface PageViewLog {
  id: string;
  page: string;
  timestamp: Date;
  deviceType?: string;
  browser?: string;
  os?: string;
  isNewVisitor?: boolean;
  isReturningVisitor?: boolean;
  connectionType?: string;
  gender?: string;
  productName?: string;
  previousPage?: string;
}

const PAGE_SIZE = 50;

const VisitorLogs = () => {
  const navigate = useNavigate();
  const [logs, setLogs] = useState<PageViewLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastVisible, setLastVisible] = useState<any>(null);
  const [hasMore, setHasMore] = useState(true);

  const fetchLogs = async (loadMore = false) => {
    try {
      setLoading(true);
      setError(null);

      const logsRef = collection(db, "page_views");
      let q = query(logsRef, orderBy("timestamp", "desc"), limit(PAGE_SIZE));

      if (loadMore && lastVisible) {
        q = query(logsRef, orderBy("timestamp", "desc"), startAfter(lastVisible), limit(PAGE_SIZE));
      }

      console.log(`📊 [Firestore Audit] Fetching page_views logs (limit: ${PAGE_SIZE}, loadMore: ${loadMore})...`);
      const querySnapshot = await getDocs(q);
      console.log(`📊 [Firestore Audit] page_views logs fetched: ${querySnapshot.docs.length} docs`);
      const fetchedLogs: PageViewLog[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        fetchedLogs.push({
          id: doc.id,
          page: data.page,
          timestamp: data.timestamp instanceof Timestamp ? data.timestamp.toDate() : new Date(data.timestamp),
          deviceType: data.deviceType,
          browser: data.browser,
          os: data.os,
          isNewVisitor: data.isNewVisitor,
          isReturningVisitor: data.isReturningVisitor,
          connectionType: data.connectionType,
          gender: data.gender,
          productName: data.productName,
          previousPage: data.previousPage,
        });
      });

      if (fetchedLogs.length < PAGE_SIZE) {
        setHasMore(false);
      } else {
        setHasMore(true);
      }

      setLastVisible(querySnapshot.docs[querySnapshot.docs.length - 1]);

      if (loadMore) {
        setLogs((prev) => [...prev, ...fetchedLogs]);
      } else {
        setLogs(fetchedLogs);
      }
    } catch (err: any) {
      console.error("Error fetching visitor logs:", err);
      setError("فشل في تحميل سجلات الزوار");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const getDeviceIcon = (device?: string) => {
    switch (device) {
      case "desktop":
        return <Monitor className="h-4 w-4" />;
      case "mobile":
        return <Smartphone className="h-4 w-4" />;
      case "tablet":
        return <Tablet className="h-4 w-4" />;
      default:
        return <Monitor className="h-4 w-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>سجل الزوار المفصل - لوحة التحكم</title>
      </Helmet>

      <div className="max-w-[95%] mx-auto py-8">
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate("/dashboard")} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              العودة للوحة التحكم
            </Button>
            <div>
              <h1 className="text-3xl font-bold">سجل الزوار المفصل</h1>
              <p className="text-muted-foreground">عرض تفصيلي لجميع الزيارات المسجلة</p>
            </div>
          </div>
          <Button onClick={() => fetchLogs(false)} disabled={loading} className="gap-2">
            <RefreshCw className={`h-4 w-4 ${loading && !logs.length ? "animate-spin" : ""}`} />
            تحديث
          </Button>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 text-red-600 rounded-lg border border-red-200">
            {error}
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>أحدث الزيارات</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>التاريخ والوقت</TableHead>
                    <TableHead>الصفحة</TableHead>
                    <TableHead>المنتج</TableHead>
                    <TableHead>الجهاز / النظام</TableHead>
                    <TableHead>المتصفح</TableHead>
                    <TableHead>الاتصال</TableHead>
                    <TableHead>نوع الزائر</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span>
                            {log.timestamp.toLocaleDateString("ar-EG")} -{" "}
                            {log.timestamp.toLocaleTimeString("ar-EG")}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate" title={log.page}>
                        {log.page}
                      </TableCell>
                      <TableCell className="max-w-[150px] truncate" title={log.productName}>
                        {log.productName || "-"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getDeviceIcon(log.deviceType)}
                          <span className="text-sm">{log.os || "غير معروف"}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Globe className="h-4 w-4 text-muted-foreground" />
                          <span>{log.browser || "غير معروف"}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Wifi className="h-4 w-4 text-muted-foreground" />
                          <span className="uppercase">{log.connectionType || "-"}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {log.isNewVisitor ? (
                          <Badge variant="default" className="bg-blue-500">
                            جديد
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-gray-200 text-gray-800">
                            عائد
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {!loading && logs.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center">
                        لا توجد سجلات.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {hasMore && (
              <div className="mt-4 flex justify-center">
                <Button variant="outline" onClick={() => fetchLogs(true)} disabled={loading}>
                  {loading ? "جاري التحميل..." : "تحميل المزيد"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default VisitorLogs;
