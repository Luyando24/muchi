import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Switch } from '../ui/switch';
import { 
  CheckCircle, 
  Star, 
  Users, 
  Zap, 
  Shield, 
  Headphones, 
  ArrowUpCircle, 
  ArrowDownCircle,
  Calendar,
  CreditCard,
  AlertTriangle
} from 'lucide-react';

interface PlanFeature {
  name: string;
  included: boolean;
  description?: string;
}

interface Plan {
  id: string;
  name: string;
  slug: 'basic' | 'standard' | 'premium';
  price: number;
  yearlyPrice: number;
  maxUsers: number;
  maxSchools: number;
  features: PlanFeature[];
  popular?: boolean;
  description: string;
  color: string;
  icon: React.ComponentType<any>;
}

interface PlanChangeRequest {
  subscriptionId: string;
  currentPlan: string;
  targetPlan: string;
  billingCycle: 'monthly' | 'yearly';
  effectiveDate: 'immediate' | 'next_billing';
  prorationCredit?: number;
  additionalCharge?: number;
  reason?: string;
}

interface PlanManagementProps {
  currentPlan?: string;
  subscriptionId?: string;
  onPlanChange?: (request: PlanChangeRequest) => void;
  showComparison?: boolean;
}

const PlanManagement: React.FC<PlanManagementProps> = ({
  currentPlan = 'basic',
  subscriptionId,
  onPlanChange,
  showComparison = true
}) => {
  const [selectedPlan, setSelectedPlan] = useState<string>(currentPlan);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [isUpgradeDialogOpen, setIsUpgradeDialogOpen] = useState(false);
  const [isDowngradeDialogOpen, setIsDowngradeDialogOpen] = useState(false);
  const [effectiveDate, setEffectiveDate] = useState<'immediate' | 'next_billing'>('immediate');
  const [changeReason, setChangeReason] = useState('');

  const plans: Plan[] = [
    {
      id: 'basic',
      name: 'Basic Plan',
      slug: 'basic',
      price: 99,
      yearlyPrice: 990,
      maxUsers: 50,
      maxSchools: 1,
      description: 'Perfect for small schools getting started with digital management',
      color: 'border-gray-200',
      icon: Users,
      features: [
        { name: 'Student Management', included: true, description: 'Complete student records and enrollment' },
        { name: 'Basic Reporting', included: true, description: 'Essential reports and analytics' },
        { name: 'Email Support', included: true, description: '24-hour response time' },
        { name: 'Mobile App Access', included: true, description: 'iOS and Android apps' },
        { name: 'Data Export', included: true, description: 'CSV and PDF exports' },
        { name: 'Advanced Analytics', included: false },
        { name: 'Finance Management', included: false },
        { name: 'Communication Tools', included: false },
        { name: 'API Access', included: false },
        { name: 'Multi-School Management', included: false },
        { name: 'White-label Options', included: false }
      ]
    },
    {
      id: 'standard',
      name: 'Standard Plan',
      slug: 'standard',
      price: 199,
      yearlyPrice: 1990,
      maxUsers: 200,
      maxSchools: 3,
      description: 'Ideal for growing schools with advanced management needs',
      color: 'border-blue-500',
      icon: Zap,
      popular: true,
      features: [
        { name: 'Student Management', included: true, description: 'Complete student records and enrollment' },
        { name: 'Basic Reporting', included: true, description: 'Essential reports and analytics' },
        { name: 'Email Support', included: true, description: '24-hour response time' },
        { name: 'Mobile App Access', included: true, description: 'iOS and Android apps' },
        { name: 'Data Export', included: true, description: 'CSV and PDF exports' },
        { name: 'Advanced Analytics', included: true, description: 'Detailed insights and trends' },
        { name: 'Finance Management', included: true, description: 'Complete billing and payments' },
        { name: 'Communication Tools', included: true, description: 'SMS, email, and notifications' },
        { name: 'Priority Support', included: true, description: '12-hour response time' },
        { name: 'Custom Reports', included: true, description: 'Build your own reports' },
        { name: 'API Access', included: false },
        { name: 'Multi-School Management', included: false },
        { name: 'White-label Options', included: false }
      ]
    },
    {
      id: 'premium',
      name: 'Premium Plan',
      slug: 'premium',
      price: 299,
      yearlyPrice: 2990,
      maxUsers: 500,
      maxSchools: 10,
      description: 'Complete solution for large schools and multi-school organizations',
      color: 'border-purple-500',
      icon: Shield,
      features: [
        { name: 'Student Management', included: true, description: 'Complete student records and enrollment' },
        { name: 'Basic Reporting', included: true, description: 'Essential reports and analytics' },
        { name: 'Email Support', included: true, description: '24-hour response time' },
        { name: 'Mobile App Access', included: true, description: 'iOS and Android apps' },
        { name: 'Data Export', included: true, description: 'CSV and PDF exports' },
        { name: 'Advanced Analytics', included: true, description: 'Detailed insights and trends' },
        { name: 'Finance Management', included: true, description: 'Complete billing and payments' },
        { name: 'Communication Tools', included: true, description: 'SMS, email, and notifications' },
        { name: 'API Access', included: true, description: 'Full REST API access' },
        { name: 'Multi-School Management', included: true, description: 'Manage multiple schools' },
        { name: 'White-label Options', included: true, description: 'Custom branding' },
        { name: 'Dedicated Support', included: true, description: '4-hour response time' },
        { name: 'Advanced Integrations', included: true, description: 'Third-party integrations' }
      ]
    }
  ];

  const getCurrentPlan = () => plans.find(p => p.slug === currentPlan);
  const getSelectedPlan = () => plans.find(p => p.slug === selectedPlan);

  const calculatePlanChange = () => {
    const current = getCurrentPlan();
    const target = getSelectedPlan();
    
    if (!current || !target) return null;

    const currentPrice = billingCycle === 'yearly' ? current.yearlyPrice : current.price;
    const targetPrice = billingCycle === 'yearly' ? target.yearlyPrice : target.price;
    
    const isUpgrade = targetPrice > currentPrice;
    const priceDifference = Math.abs(targetPrice - currentPrice);
    
    return {
      isUpgrade,
      priceDifference,
      currentPrice,
      targetPrice,
      savings: billingCycle === 'yearly' ? Math.round((target.price * 12 - target.yearlyPrice)) : 0
    };
  };

  const handlePlanSelection = (planSlug: string) => {
    setSelectedPlan(planSlug);
    const changeInfo = calculatePlanChange();
    
    if (changeInfo?.isUpgrade) {
      setIsUpgradeDialogOpen(true);
    } else if (planSlug !== currentPlan) {
      setIsDowngradeDialogOpen(true);
    }
  };

  const handleConfirmChange = () => {
    const changeInfo = calculatePlanChange();
    if (!changeInfo || !subscriptionId) return;

    const request: PlanChangeRequest = {
      subscriptionId,
      currentPlan,
      targetPlan: selectedPlan,
      billingCycle,
      effectiveDate,
      reason: changeReason,
      ...(changeInfo.isUpgrade ? 
        { additionalCharge: changeInfo.priceDifference } : 
        { prorationCredit: changeInfo.priceDifference }
      )
    };

    onPlanChange?.(request);
    setIsUpgradeDialogOpen(false);
    setIsDowngradeDialogOpen(false);
  };

  const PlanCard: React.FC<{ plan: Plan; isSelected: boolean; isCurrent: boolean }> = ({ 
    plan, 
    isSelected, 
    isCurrent 
  }) => {
    const Icon = plan.icon;
    const price = billingCycle === 'yearly' ? plan.yearlyPrice : plan.price;
    const monthlyEquivalent = billingCycle === 'yearly' ? Math.round(plan.yearlyPrice / 12) : plan.price;
    
    return (
      <Card className={`relative cursor-pointer transition-all ${
        isSelected ? `${plan.color} ring-2 ring-offset-2` : plan.color
      } ${plan.popular ? 'scale-105' : ''}`}
      onClick={() => handlePlanSelection(plan.slug)}>
        {plan.popular && (
          <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
            <Badge className="bg-blue-500 text-white">
              <Star className="w-3 h-3 mr-1" />
              Most Popular
            </Badge>
          </div>
        )}
        
        {isCurrent && (
          <div className="absolute -top-3 right-4">
            <Badge className="bg-green-500 text-white">Current Plan</Badge>
          </div>
        )}

        <CardHeader className="text-center">
          <div className="mx-auto mb-4 p-3 rounded-full bg-gray-100">
            <Icon className="w-8 h-8 text-gray-600" />
          </div>
          <CardTitle className="text-xl">{plan.name}</CardTitle>
          <CardDescription className="text-sm">{plan.description}</CardDescription>
          
          <div className="mt-4">
            <div className="text-3xl font-bold">
              K{price.toLocaleString()}
              <span className="text-sm font-normal text-muted-foreground">
                /{billingCycle === 'yearly' ? 'year' : 'month'}
              </span>
            </div>
            {billingCycle === 'yearly' && (
              <div className="text-sm text-green-600">
                K{monthlyEquivalent}/month • Save K{(plan.price * 12 - plan.yearlyPrice)}
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent>
          <div className="space-y-4">
            <div className="text-center text-sm text-muted-foreground">
              <div>Up to <strong>{plan.maxUsers} users</strong></div>
              <div>Up to <strong>{plan.maxSchools} school{plan.maxSchools > 1 ? 's' : ''}</strong></div>
            </div>

            <div className="space-y-2">
              {plan.features.slice(0, 6).map((feature, index) => (
                <div key={index} className="flex items-center text-sm">
                  {feature.included ? (
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                  ) : (
                    <div className="h-4 w-4 mr-2 flex-shrink-0" />
                  )}
                  <span className={feature.included ? '' : 'text-muted-foreground line-through'}>
                    {feature.name}
                  </span>
                </div>
              ))}
              
              {plan.features.length > 6 && (
                <div className="text-xs text-muted-foreground">
                  +{plan.features.length - 6} more features
                </div>
              )}
            </div>

            <Button 
              className="w-full" 
              variant={isCurrent ? "secondary" : isSelected ? "default" : "outline"}
              disabled={isCurrent}
            >
              {isCurrent ? 'Current Plan' : isSelected ? 'Selected' : 'Select Plan'}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Billing Cycle Toggle */}
      <div className="flex justify-center">
        <div className="flex items-center space-x-4 bg-gray-100 rounded-lg p-1">
          <Button
            variant={billingCycle === 'monthly' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setBillingCycle('monthly')}
          >
            Monthly
          </Button>
          <Button
            variant={billingCycle === 'yearly' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setBillingCycle('yearly')}
          >
            Yearly
            <Badge className="ml-2 bg-green-500 text-white text-xs">Save 17%</Badge>
          </Button>
        </div>
      </div>

      {/* Plan Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            isSelected={selectedPlan === plan.slug}
            isCurrent={currentPlan === plan.slug}
          />
        ))}
      </div>

      {/* Feature Comparison Table */}
      {showComparison && (
        <Card>
          <CardHeader>
            <CardTitle>Feature Comparison</CardTitle>
            <CardDescription>Compare features across all plans</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">Feature</th>
                    {plans.map(plan => (
                      <th key={plan.id} className="text-center py-2 min-w-24">
                        {plan.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {plans[0].features.map((_, featureIndex) => {
                    const featureName = plans[0].features[featureIndex].name;
                    return (
                      <tr key={featureIndex} className="border-b">
                        <td className="py-2 text-sm">{featureName}</td>
                        {plans.map(plan => {
                          const feature = plan.features[featureIndex];
                          return (
                            <td key={plan.id} className="text-center py-2">
                              {feature?.included ? (
                                <CheckCircle className="h-4 w-4 text-green-500 mx-auto" />
                              ) : (
                                <div className="h-4 w-4 mx-auto" />
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upgrade Dialog */}
      <Dialog open={isUpgradeDialogOpen} onOpenChange={setIsUpgradeDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <ArrowUpCircle className="mr-2 h-5 w-5 text-green-500" />
              Upgrade Plan
            </DialogTitle>
            <DialogDescription>
              Upgrade from {getCurrentPlan()?.name} to {getSelectedPlan()?.name}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">New Plan</span>
                <span className="font-bold">K{calculatePlanChange()?.targetPrice}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Additional Charge</span>
                <span className="text-green-600 font-medium">
                  +K{calculatePlanChange()?.priceDifference}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Effective Date</Label>
              <Select value={effectiveDate} onValueChange={(value: 'immediate' | 'next_billing') => setEffectiveDate(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="immediate">
                    <div className="flex items-center">
                      <Zap className="mr-2 h-4 w-4" />
                      Immediate
                    </div>
                  </SelectItem>
                  <SelectItem value="next_billing">
                    <div className="flex items-center">
                      <Calendar className="mr-2 h-4 w-4" />
                      Next Billing Cycle
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Reason for Upgrade (Optional)</Label>
              <Textarea
                placeholder="Why are you upgrading?"
                value={changeReason}
                onChange={(e) => setChangeReason(e.target.value)}
              />
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setIsUpgradeDialogOpen(false)} className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleConfirmChange} className="flex-1">
                <CreditCard className="mr-2 h-4 w-4" />
                Confirm Upgrade
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Downgrade Dialog */}
      <Dialog open={isDowngradeDialogOpen} onOpenChange={setIsDowngradeDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <ArrowDownCircle className="mr-2 h-5 w-5 text-orange-500" />
              Downgrade Plan
            </DialogTitle>
            <DialogDescription>
              Downgrade from {getCurrentPlan()?.name} to {getSelectedPlan()?.name}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="bg-orange-50 border border-orange-200 p-4 rounded-lg">
              <div className="flex items-start">
                <AlertTriangle className="h-5 w-5 text-orange-500 mr-2 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-orange-800">Important Notice</p>
                  <p className="text-orange-700 mt-1">
                    Downgrading may result in loss of some features and data. Please review carefully.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">New Plan</span>
                <span className="font-bold">K{calculatePlanChange()?.targetPrice}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Credit Applied</span>
                <span className="text-blue-600 font-medium">
                  K{calculatePlanChange()?.priceDifference}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Effective Date</Label>
              <Select value={effectiveDate} onValueChange={(value: 'immediate' | 'next_billing') => setEffectiveDate(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="next_billing">
                    <div className="flex items-center">
                      <Calendar className="mr-2 h-4 w-4" />
                      Next Billing Cycle (Recommended)
                    </div>
                  </SelectItem>
                  <SelectItem value="immediate">
                    <div className="flex items-center">
                      <Zap className="mr-2 h-4 w-4" />
                      Immediate
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Reason for Downgrade (Required)</Label>
              <Textarea
                placeholder="Please tell us why you're downgrading..."
                value={changeReason}
                onChange={(e) => setChangeReason(e.target.value)}
                required
              />
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setIsDowngradeDialogOpen(false)} className="flex-1">
                Cancel
              </Button>
              <Button 
                onClick={handleConfirmChange} 
                className="flex-1"
                disabled={!changeReason.trim()}
              >
                Confirm Downgrade
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PlanManagement;