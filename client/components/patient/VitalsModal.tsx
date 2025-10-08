import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { LabTest } from '@shared/api';
import { Api } from '@/lib/api';
import { withErrorHandling } from '@/lib/errors';

interface VitalsModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientId: string;
  hospitalId: string;
  onVitalsRecorded: () => void;
}

const vitalTests = [
  { key: 'bloodPressure', label: 'Blood Pressure', placeholder: '120/80', unit: 'mmHg' },
  { key: 'heartRate', label: 'Heart Rate', placeholder: '72', unit: 'bpm' },
  { key: 'temperature', label: 'Temperature', placeholder: '37.0', unit: '°C' },
  { key: 'respiratoryRate', label: 'Respiratory Rate', placeholder: '16', unit: 'breaths/min' },
  { key: 'oxygenSaturation', label: 'Oxygen Saturation', placeholder: '98', unit: '%' },
];

export default function VitalsModal({
  isOpen,
  onClose,
  patientId,
  hospitalId,
  onVitalsRecorded,
}: VitalsModalProps) {
  const [vitals, setVitals] = React.useState<Record<string, string>>({});

  const handleSave = async () => {
    // Create a summary of the recorded vitals
    const filledVitals = Object.entries(vitals).filter(([_, value]) => value.trim() !== '');
    
    if (filledVitals.length === 0) {
      // No vitals recorded
      onClose();
      return;
    }
    
    // Format the vitals for display in the summary
    const vitalSummary = filledVitals.map(([key, value]) => {
      const test = vitalTests.find(t => t.key === key);
      return `${test?.label}: ${value} ${test?.unit}`;
    }).join(', ');
    
    // Save the vitals to the database
    await withErrorHandling(async () => {
      const result = await Api.createTest({
        patientId,
        hospitalId,
        type: 'Vitals',
        resultSummary: vitalSummary,
        result: vitals, // Store the structured data
      });
      
      return result;
    }, 'Record Vitals');
    
    // Reset the form
    setVitals({});
    
    // Notify parent component and close the modal
    onVitalsRecorded();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record Vitals</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {vitalTests.map((test) => (
            <div className="grid grid-cols-4 items-center gap-4" key={test.key}>
              <Label htmlFor={test.key} className="text-right">
                {test.label}
              </Label>
              <div className="col-span-3 relative">
                <Input
                  id={test.key}
                  value={vitals[test.key] || ''}
                  onChange={(e) =>
                    setVitals({ ...vitals, [test.key]: e.target.value })
                  }
                  placeholder={test.placeholder}
                  className="pr-12 w-full"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm pointer-events-none">
                  {test.unit}
                </span>
              </div>
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button onClick={handleSave}>Save Vitals</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}