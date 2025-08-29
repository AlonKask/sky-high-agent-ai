import React from 'react';
import EnhancedEmailInterface from '@/components/EnhancedEmailInterface';

const Emails = () => {
  return (
    <div className="h-full flex flex-col -mx-4 sm:-mx-6 lg:-mx-8 -my-6 lg:-my-8">
      <div className="px-4 sm:px-6 lg:px-8 py-6 pb-4 border-b">
        <h1 className="text-2xl font-bold">Emails</h1>
      </div>
      <div className="flex-1 overflow-hidden">
        <EnhancedEmailInterface />
      </div>
    </div>
  );
};

export default Emails;