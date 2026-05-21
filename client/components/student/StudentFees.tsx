import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase';
import { Loader2, Receipt, Phone, SmartphoneNfc } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function StudentFees() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [payingInvoice, setPayingInvoice] = useState<any | null>(null);
  const [paymentProvider, setPaymentProvider] = useState('MTN');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [payAmount, setPayAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/finance/student/invoices', {
        headers: { 'Authorization': `Bearer ${session?.access_token}` }
      });
      if (res.ok) setInvoices(await res.json());
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to load fee invoices.' });
    } finally {
      setLoading(false);
    }
  };

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingInvoice) return;
    setIsProcessing(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/finance/pay/initiate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          invoice_id: payingInvoice.id,
          amount: parseFloat(payAmount),
          provider: paymentProvider,
          phone_number: phoneNumber
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Payment failed');

      toast({
        title: 'Payment Initiated',
        description: `Please check your phone (${phoneNumber}) for the MoMo PIN prompt to complete the payment.`,
      });
      setPayingInvoice(null);
      fetchInvoices(); // Refresh invoices to show pending status if applicable
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Payment Error', description: err.message });
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'paid': return 'bg-green-100 text-green-800';
      case 'partial': return 'bg-yellow-100 text-yellow-800';
      case 'overdue': return 'bg-red-100 text-red-800';
      default: return 'bg-slate-100 text-slate-800';
    }
  };

  const calculateConvenienceFee = (amt: number, provider: string) => {
    const rate = provider === 'AIRTEL' ? 0.02 : 0.015;
    return (amt * rate).toFixed(2);
  };

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">School Fees</h2>
        <p className="text-muted-foreground">View and pay your termly school fees securely.</p>
      </div>

      {invoices.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <Receipt className="mx-auto h-12 w-12 text-slate-300 mb-4" />
            <h3 className="text-lg font-medium text-slate-900">No Invoices Found</h3>
            <p className="text-sm text-slate-500">You do not have any pending fees at the moment.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {invoices.map(inv => {
            const balance = inv.total_amount - inv.amount_paid;
            return (
              <Card key={inv.id} className="relative overflow-hidden">
                <div className={`absolute top-0 left-0 w-1 h-full ${inv.status === 'paid' ? 'bg-green-500' : 'bg-red-500'}`} />
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle>{inv.fee_structures?.term} Fees</CardTitle>
                      <CardDescription>{inv.fee_structures?.academic_year} Academic Year</CardDescription>
                    </div>
                    <Badge variant="outline" className={getStatusColor(inv.status)}>
                      {inv.status.toUpperCase()}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Total Billed:</span>
                    <span className="font-medium">{inv.currency} {inv.total_amount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Amount Paid:</span>
                    <span className="font-medium text-green-600">{inv.currency} {inv.amount_paid.toFixed(2)}</span>
                  </div>
                  <div className="pt-2 border-t flex justify-between font-bold">
                    <span>Balance Due:</span>
                    <span className="text-red-600">{inv.currency} {balance.toFixed(2)}</span>
                  </div>
                </CardContent>
                {balance > 0 && (
                  <CardFooter className="bg-slate-50 pt-4">
                    <Button className="w-full" onClick={() => {
                      setPayingInvoice(inv);
                      setPayAmount(balance.toString());
                    }}>
                      Pay Now
                    </Button>
                  </CardFooter>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Payment Dialog */}
      <Dialog open={!!payingInvoice} onOpenChange={(open) => !open && setPayingInvoice(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <SmartphoneNfc className="h-5 w-5 text-blue-600" /> Mobile Money Payment
            </DialogTitle>
            <DialogDescription>
              Pay your {payingInvoice?.fee_structures?.term} fees securely using MTN or Airtel Money.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handlePay} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Provider</Label>
              <Select value={paymentProvider} onValueChange={setPaymentProvider}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Network" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MTN">MTN Mobile Money</SelectItem>
                  <SelectItem value="AIRTEL">Airtel Money</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Phone Number (Mobile Money Account)</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                <Input 
                  className="pl-9"
                  placeholder="e.g. 0970000000" 
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Amount to Pay ({payingInvoice?.currency})</Label>
              <Input 
                type="number" 
                step="0.01" 
                max={payingInvoice?.total_amount - payingInvoice?.amount_paid}
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                required
              />
            </div>

            {payAmount && (
              <div className="bg-slate-50 p-3 rounded-md text-sm space-y-1">
                <div className="flex justify-between text-slate-500">
                  <span>Base Amount:</span>
                  <span>{payingInvoice?.currency} {parseFloat(payAmount).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Convenience Fee ({paymentProvider === 'MTN' ? '1.5%' : '2%'}):</span>
                  <span>{payingInvoice?.currency} {calculateConvenienceFee(parseFloat(payAmount), paymentProvider)}</span>
                </div>
                <div className="flex justify-between font-bold pt-1 border-t border-slate-200">
                  <span>Total to Deduct:</span>
                  <span>{payingInvoice?.currency} {(parseFloat(payAmount) + parseFloat(calculateConvenienceFee(parseFloat(payAmount), paymentProvider))).toFixed(2)}</span>
                </div>
              </div>
            )}

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setPayingInvoice(null)}>Cancel</Button>
              <Button type="submit" disabled={isProcessing || !phoneNumber || !payAmount}>
                {isProcessing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {isProcessing ? 'Processing...' : 'Authorize Payment'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
