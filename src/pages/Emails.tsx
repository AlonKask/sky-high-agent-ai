import React from 'react';
import EmailManager from '@/components/EmailManager';

const Emails = () => {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Emails</h1>
      </div>
      <EmailManager />
    </div>
  );
};

export default Emails;