import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

interface DemoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const DemoModal: React.FC<DemoModalProps> = ({ isOpen, onClose }) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Project Disclaimer</DialogTitle>
          <DialogDescription>
            This project is intended to serve as a demo of my skills and passion to join the Smart Zambia team. It's not intended to replace the existing platform.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4">
          <p className="font-semibold">Luyando Chikandula</p>
          <p>luyandochikandula63@gmail.com</p>
          <p>+260 570260374</p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DemoModal;