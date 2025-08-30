import React from 'react';
import EnhancedEmailInterface from '@/components/EnhancedEmailInterface';

const Emails = () => {
  return (
    <div className="h-full flex flex-col">
      <div className="px-6 py-4 border-b">
        <h1 className="text-2xl font-bold">Emails</h1>
      </div>
      <div className="flex-1 min-h-0">
        <EnhancedEmailInterface />
      </div>
    </div>
  );
};

export default Emails;