import React, { useState } from 'react';
import { Button } from "@/components/ui/Button";
import { MessageSquare, X } from "lucide-react";

interface AIAssistantProps {
  onClose: () => void;
  isOpen: boolean;
}

export function AIAssistant({ onClose, isOpen }: AIAssistantProps) {
  return (
    <div className={`fixed right-0 top-20 w-[850px] max-h-[40vh] bg-white shadow-lg rounded-l-lg p-6 overflow-y-auto transition-all duration-300 ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">AI Assistant</h2>
        <Button variant="default" size="default" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className="space-y-4">
        {/* AI Assistant content will go here */}
      </div>
    </div>
  );
} 