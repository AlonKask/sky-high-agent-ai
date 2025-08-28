import React from 'react';
import EnhancedEmailInterface from '@/components/EnhancedEmailInterface';

const Emails = () => {
  return (
    <div className="h-full flex flex-col">
      <div className="p-6 pb-4 border-b">
        <h1 className="text-2xl font-bold">Emails</h1>
      </div>
      <div className="flex-1 overflow-hidden">
        <EnhancedEmailInterface />
      </div>
    </div>
  );
};

export default Emails;