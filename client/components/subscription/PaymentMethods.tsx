import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { 
  CreditCard, 
  Building, 
  Smartphone, 
  Plus, 
  Edit, 
  Trash2, 
  Check, 
  X, 
  Shield, 
  AlertTriangle,
  Star,
  Calendar,
  DollarSign,
  Lock,
  Eye,
  EyeOff
} from 'lucide-react';

interface PaymentMethod {
  id: string;
  type: 'card' | 'bank_account' | 'mobile_money';
  isDefault: boolean;
  isActive: boolean;
  name: string;
  details: CardDetails | BankAccountDetails | MobileMoneyDetails;
  addedDate: string;
  lastUsed?: string;
  expiryDate?: string;
  isExpired?: boolean;
  failureCount: number;
  maxFailures: number;
}

interface CardDetails {
  cardNumber: string;
  cardholderName: string;
  expiryMonth: string;
  expiryYear: string;
  brand: 'visa' | 'mastercard' | 'amex' | 'discover';
  last4: string;
  fingerprint: string;
}

interface BankAccountDetails {
  accountNumber: string;
  accountName: string;
  bankName: string;
  bankCode: string;
  accountType: 'checking' | 'savings';
  routingNumber?: string;
}

interface MobileMoneyDetails {
  phoneNumber: string;
  provider: 'mtn' | 'airtel' | 'zamtel';
  accountName: string;
}

interface PaymentMethodStats {
  totalMethods: number;
  activeMethods: number;
  defaultMethod: string;
  successRate: number;
  lastPaymentDate: string;
  preferredMethod: string;
}

const PaymentMethods: React.FC = () => {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [stats, setStats] = useState<PaymentMethodStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [newMethodType, setNewMethodType] = useState<'card' | 'bank_account' | 'mobile_money'>('card');
  const [showCardNumber, setShowCardNumber] = useState(false);

  useEffect(() => {
    loadPaymentMethods();
  }, []);

  const loadPaymentMethods = async () => {
    try {
      setLoading(true);
      
      // Mock data - replace with actual API calls
      const mockPaymentMethods: PaymentMethod[] = [
        {
          id: '1',
          type: 'card',
          isDefault: true,
          isActive: true,
          name: 'Primary Credit Card',
          details: {
            cardNumber: '**** **** **** 4242',
            cardholderName: 'John Doe',
            expiryMonth: '12',
            expiryYear: '2025',
            brand: 'visa',
            last4: '4242',
            fingerprint: 'fp_1234567890'
          } as CardDetails,
          addedDate: '2024-01-15',
          lastUsed: '2024-03-10',
          expiryDate: '2025-12-31',
          failureCount: 0,
          maxFailures: 3
        },
        {
          id: '2',
          type: 'bank_account',
          isDefault: false,
          isActive: true,
          name: 'Business Account',
          details: {
            accountNumber: '****1234',
            accountName: 'School Management Ltd',
            bankName: 'Zanaco Bank',
            bankCode: 'ZAN001',
            accountType: 'checking'
          } as BankAccountDetails,
          addedDate: '2024-02-01',
          lastUsed: '2024-02-28',
          failureCount: 0,
          maxFailures: 3
        },
        {
          id: '3',
          type: 'mobile_money',
          isDefault: false,
          isActive: true,
          name: 'MTN Mobile Money',
          details: {
            phoneNumber: '+260 97 *** 5678',
            provider: 'mtn',
            accountName: 'John Doe'
          } as MobileMoneyDetails,
          addedDate: '2024-02-15',
          lastUsed: '2024-03-05',
          failureCount: 1,
          maxFailures: 3
        },
        {
          id: '4',
          type: 'card',
          isDefault: false,
          isActive: false,
          name: 'Expired Card',
          details: {
            cardNumber: '**** **** **** 1234',
            cardholderName: 'John Doe',
            expiryMonth: '01',
            expiryYear: '2024',
            brand: 'mastercard',
            last4: '1234',
            fingerprint: 'fp_0987654321'
          } as CardDetails,
          addedDate: '2023-01-15',
          lastUsed: '2024-01-10',
          expiryDate: '2024-01-31',
          isExpired: true,
          failureCount: 3,
          maxFailures: 3
        }
      ];

      const mockStats: PaymentMethodStats = {
        totalMethods: 4,
        activeMethods: 3,
        defaultMethod: 'Primary Credit Card',
        successRate: 94.2,
        lastPaymentDate: '2024-03-10',
        preferredMethod: 'card'
      };

      setPaymentMethods(mockPaymentMethods);
      setStats(mockStats);
    } finally {
      setLoading(false);
    }
  };

  const getPaymentMethodIcon = (type: string, brand?: string) => {
    switch (type) {
      case 'card':
        return <CreditCard className="h-5 w-5" />;
      case 'bank_account':
        return <Building className="h-5 w-5" />;
      case 'mobile_money':
        return <Smartphone className="h-5 w-5" />;
      default:
        return <DollarSign className="h-5 w-5" />;
    }
  };

  const getStatusBadge = (method: PaymentMethod) => {
    if (method.isExpired) {
      return <Badge variant="destructive">Expired</Badge>;
    }
    if (method.failureCount >= method.maxFailures) {
      return <Badge variant="destructive">Suspended</Badge>;
    }
    if (!method.isActive) {
      return <Badge variant="secondary">Inactive</Badge>;
    }
    if (method.isDefault) {
      return <Badge className="bg-green-100 text-green-800">Default</Badge>;
    }
    return <Badge variant="outline">Active</Badge>;
  };

  const handleSetDefault = async (methodId: string) => {
    setPaymentMethods(methods =>
      methods.map(method => ({
        ...method,
        isDefault: method.id === methodId
      }))
    );
  };

  const handleToggleActive = async (methodId: string) => {
    setPaymentMethods(methods =>
      methods.map(method =>
        method.id === methodId
          ? { ...method, isActive: !method.isActive }
          : method
      )
    );
  };

  const handleDeleteMethod = async (methodId: string) => {
    if (confirm('Are you sure you want to delete this payment method?')) {
      setPaymentMethods(methods => methods.filter(method => method.id !== methodId));
    }
  };

  const handleEditMethod = (method: PaymentMethod) => {
    setSelectedMethod(method);
    setIsEditDialogOpen(true);
  };

  const renderPaymentMethodDetails = (method: PaymentMethod) => {
    switch (method.type) {
      case 'card':
        const cardDetails = method.details as CardDetails;
        return (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm">
                {showCardNumber ? cardDetails.cardNumber : `**** **** **** ${cardDetails.last4}`}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowCardNumber(!showCardNumber)}
              >
                {showCardNumber ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            <div className="text-sm text-muted-foreground">
              <div>{cardDetails.cardholderName}</div>
              <div>Expires {cardDetails.expiryMonth}/{cardDetails.expiryYear}</div>
              <div className="capitalize">{cardDetails.brand}</div>
            </div>
          </div>
        );

      case 'bank_account':
        const bankDetails = method.details as BankAccountDetails;
        return (
          <div className="space-y-2">
            <div className="font-mono text-sm">{bankDetails.accountNumber}</div>
            <div className="text-sm text-muted-foreground">
              <div>{bankDetails.accountName}</div>
              <div>{bankDetails.bankName}</div>
              <div className="capitalize">{bankDetails.accountType} Account</div>
            </div>
          </div>
        );

      case 'mobile_money':
        const mobileDetails = method.details as MobileMoneyDetails;
        return (
          <div className="space-y-2">
            <div className="font-mono text-sm">{mobileDetails.phoneNumber}</div>
            <div className="text-sm text-muted-foreground">
              <div>{mobileDetails.accountName}</div>
              <div className="uppercase">{mobileDetails.provider} Mobile Money</div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Methods</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalMethods}</div>
              <p className="text-xs text-muted-foreground">{stats.activeMethods} active</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
              <Check className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.successRate}%</div>
              <p className="text-xs text-muted-foreground">Payment success rate</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Default Method</CardTitle>
              <Star className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-sm font-bold">{stats.defaultMethod}</div>
              <p className="text-xs text-muted-foreground">Primary payment method</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Last Payment</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-sm font-bold">
                {new Date(stats.lastPaymentDate).toLocaleDateString()}
              </div>
              <p className="text-xs text-muted-foreground">Most recent transaction</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Payment Methods List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Payment Methods</CardTitle>
            <CardDescription>Manage your payment methods and billing preferences</CardDescription>
          </div>
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Method
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {paymentMethods.map((method) => (
              <div key={method.id} className="border rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="mt-1">
                      {getPaymentMethodIcon(method.type)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-medium">{method.name}</h3>
                        {getStatusBadge(method)}
                        {method.isDefault && <Star className="h-4 w-4 text-yellow-500 fill-current" />}
                      </div>
                      
                      {renderPaymentMethodDetails(method)}
                      
                      <div className="mt-3 text-xs text-muted-foreground space-y-1">
                        <div>Added: {new Date(method.addedDate).toLocaleDateString()}</div>
                        {method.lastUsed && (
                          <div>Last used: {new Date(method.lastUsed).toLocaleDateString()}</div>
                        )}
                        {method.failureCount > 0 && (
                          <div className="text-red-500">
                            {method.failureCount} failed attempts
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {!method.isDefault && method.isActive && !method.isExpired && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSetDefault(method.id)}
                      >
                        Set Default
                      </Button>
                    )}
                    
                    <div className="flex items-center gap-1">
                      <Switch
                        checked={method.isActive}
                        onCheckedChange={() => handleToggleActive(method.id)}
                        disabled={method.isExpired || method.failureCount >= method.maxFailures}
                      />
                      <span className="text-xs text-muted-foreground">Active</span>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditMethod(method)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteMethod(method.id)}
                      disabled={method.isDefault}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Warning Messages */}
                {method.isExpired && (
                  <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    This payment method has expired and needs to be updated.
                  </div>
                )}

                {method.failureCount >= method.maxFailures && (
                  <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    This payment method has been suspended due to multiple failures.
                  </div>
                )}

                {method.failureCount > 0 && method.failureCount < method.maxFailures && (
                  <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-700 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    This payment method has {method.failureCount} failed attempts. 
                    {method.maxFailures - method.failureCount} attempts remaining before suspension.
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Add Payment Method Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Payment Method</DialogTitle>
            <DialogDescription>
              Add a new payment method to your account
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Payment Method Type</Label>
              <Select value={newMethodType} onValueChange={(value: any) => setNewMethodType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="card">Credit/Debit Card</SelectItem>
                  <SelectItem value="bank_account">Bank Account</SelectItem>
                  <SelectItem value="mobile_money">Mobile Money</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {newMethodType === 'card' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Card Number</Label>
                  <Input placeholder="1234 5678 9012 3456" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Expiry Month</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="MM" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 12 }, (_, i) => (
                          <SelectItem key={i + 1} value={String(i + 1).padStart(2, '0')}>
                            {String(i + 1).padStart(2, '0')}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Expiry Year</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="YYYY" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 10 }, (_, i) => (
                          <SelectItem key={i} value={String(new Date().getFullYear() + i)}>
                            {new Date().getFullYear() + i}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Cardholder Name</Label>
                  <Input placeholder="John Doe" />
                </div>
                <div className="space-y-2">
                  <Label>CVV</Label>
                  <Input placeholder="123" type="password" maxLength={4} />
                </div>
              </div>
            )}

            {newMethodType === 'bank_account' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Bank Name</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select bank" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="zanaco">Zanaco Bank</SelectItem>
                      <SelectItem value="fbn">First National Bank</SelectItem>
                      <SelectItem value="stanbic">Stanbic Bank</SelectItem>
                      <SelectItem value="standard">Standard Chartered</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Account Number</Label>
                  <Input placeholder="1234567890" />
                </div>
                <div className="space-y-2">
                  <Label>Account Name</Label>
                  <Input placeholder="Account holder name" />
                </div>
                <div className="space-y-2">
                  <Label>Account Type</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="checking">Checking</SelectItem>
                      <SelectItem value="savings">Savings</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {newMethodType === 'mobile_money' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Mobile Money Provider</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select provider" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mtn">MTN Mobile Money</SelectItem>
                      <SelectItem value="airtel">Airtel Money</SelectItem>
                      <SelectItem value="zamtel">Zamtel Kwacha</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Phone Number</Label>
                  <Input placeholder="+260 97 123 4567" />
                </div>
                <div className="space-y-2">
                  <Label>Account Name</Label>
                  <Input placeholder="Account holder name" />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>Method Name</Label>
              <Input placeholder="e.g., Primary Card, Business Account" />
            </div>

            <div className="flex items-center space-x-2">
              <Switch id="set-default" />
              <Label htmlFor="set-default">Set as default payment method</Label>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)} className="flex-1">
                Cancel
              </Button>
              <Button className="flex-1">
                <Shield className="mr-2 h-4 w-4" />
                Add Method
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Payment Method Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Payment Method</DialogTitle>
            <DialogDescription>
              Update your payment method details
            </DialogDescription>
          </DialogHeader>
          
          {selectedMethod && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Method Name</Label>
                <Input defaultValue={selectedMethod.name} />
              </div>

              {selectedMethod.type === 'card' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Cardholder Name</Label>
                    <Input defaultValue={(selectedMethod.details as CardDetails).cardholderName} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Expiry Month</Label>
                      <Select defaultValue={(selectedMethod.details as CardDetails).expiryMonth}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 12 }, (_, i) => (
                            <SelectItem key={i + 1} value={String(i + 1).padStart(2, '0')}>
                              {String(i + 1).padStart(2, '0')}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Expiry Year</Label>
                      <Select defaultValue={(selectedMethod.details as CardDetails).expiryYear}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 10 }, (_, i) => (
                            <SelectItem key={i} value={String(new Date().getFullYear() + i)}>
                              {new Date().getFullYear() + i}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} className="flex-1">
                  Cancel
                </Button>
                <Button className="flex-1">
                  Update Method
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PaymentMethods;