import React from 'react';
import { GradeAnomalies } from '@/components/school-admin/GradeAnomalies';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function DataAuditPage() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-4 sm:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="print:hidden">
          <Button variant="outline" onClick={() => navigate('/school-admin')} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Admin Portal
          </Button>
        </div>
        <GradeAnomalies />
      </div>
    </div>
  );
}
