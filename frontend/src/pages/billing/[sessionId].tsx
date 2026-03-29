// ============================================================
// TeeBad — Billing Page /billing/[sessionId]
// คิดเงิน + ส่งบิล + สร้างคำสั่งขุนทอง
// ============================================================

import { useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { useLiff } from '@/hooks/useLiff';
import { useAdmin } from '@/hooks/useAdmin';
import { useBilling } from '@/hooks/useBilling';
import { BillTable } from '@/components/billing/BillTable';
import { toast } from 'sonner';

export default function BillingPage() {
  const router = useRouter();
  const sessionId = router.query.sessionId as string;

  const { idToken, isReady } = useLiff();
  const { isAdmin } = useAdmin({ idToken });
  const {
    bill,
    loading,
    error,
    notifyAll,
    notifying,
    khunthongCommand,
    buildKhunthong,
    buildingKhunthong,
  } = useBilling({ sessionId: sessionId ?? '', idToken });

  const [copied, setCopied] = useState(false);

  async function handleNotifyAll() {
    const result = await notifyAll();
    if (result) {
      toast.success(`ส่งบิลแล้ว ${result.sent} คน${result.failed > 0 ? ` (ล้มเหลว ${result.failed} คน)` : ''}`);
    }
  }

  async function handleCopy() {
    if (!khunthongCommand) return;
    await navigator.clipboard.writeText(khunthongCommand);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (!isReady || loading) {
    return (
      <div className="p-4 space-y-3">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>คิดเงิน — TeeBad</title>
      </Head>

      <div className="min-h-screen bg-background">
        <div className="p-4 space-y-4 max-w-2xl mx-auto">
          {/* Header */}
          <div>
            <Link href={`/board/${sessionId}`} className="text-sm text-muted-foreground">
              ← กลับ
            </Link>
            <h1 className="text-xl font-bold mt-1">คิดเงิน</h1>
          </div>

          {error && (
            <Alert variant="destructive">
              <p className="text-sm">{error}</p>
            </Alert>
          )}

          {!bill ? (
            <p className="text-center text-muted-foreground py-8">ไม่มีข้อมูลบิล</p>
          ) : (
            <Tabs defaultValue="bill">
              <TabsList className="w-full">
                <TabsTrigger value="bill" className="flex-1">บิล</TabsTrigger>
                {isAdmin && (
                  <>
                    <TabsTrigger value="notify" className="flex-1">แจ้งเตือน</TabsTrigger>
                    <TabsTrigger value="khunthong" className="flex-1">ขุนทอง</TabsTrigger>
                  </>
                )}
              </TabsList>

              {/* Tab: บิล */}
              <TabsContent value="bill" className="mt-3">
                <BillTable bill={bill} />
              </TabsContent>

              {/* Tab: แจ้งเตือน (admin) */}
              {isAdmin && (
                <TabsContent value="notify" className="mt-3 space-y-3">
                  <Card>
                    <CardContent className="p-4 space-y-3">
                      <p className="text-sm text-muted-foreground">
                        ส่ง LINE Service Message พร้อมยอดชำระให้ทุกคนที่ยังค้างอยู่
                      </p>
                      <Button
                        className="w-full"
                        onClick={handleNotifyAll}
                        disabled={notifying}
                      >
                        {notifying ? 'กำลังส่ง…' : '📨 ส่งบิลทุกคน'}
                      </Button>
                    </CardContent>
                  </Card>
                </TabsContent>
              )}

              {/* Tab: ขุนทอง (admin) */}
              {isAdmin && (
                <TabsContent value="khunthong" className="mt-3 space-y-3">
                  <Card>
                    <CardContent className="p-4 space-y-3">
                      <p className="text-sm text-muted-foreground">
                        สร้างข้อความสำเร็จรูปสำหรับก็อปวางในกลุ่ม LINE
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          className="flex-1"
                          onClick={() => buildKhunthong('split')}
                          disabled={buildingKhunthong}
                        >
                          แจ้งยอดทุกคน
                        </Button>
                        <Button
                          variant="outline"
                          className="flex-1"
                          onClick={() => buildKhunthong('remind')}
                          disabled={buildingKhunthong}
                        >
                          ทวงเฉพาะค้าง
                        </Button>
                      </div>

                      {khunthongCommand && (
                        <div className="space-y-2">
                          <pre className="bg-muted rounded-md p-3 text-sm whitespace-pre-wrap break-words">
                            {khunthongCommand}
                          </pre>
                          <Button
                            className="w-full"
                            variant="secondary"
                            onClick={handleCopy}
                          >
                            {copied ? '✅ คัดลอกแล้ว' : '📋 คัดลอก'}
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              )}
            </Tabs>
          )}
        </div>
      </div>
    </>
  );
}
