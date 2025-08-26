import React from 'react';
import { Layout } from '@/components/Layout';
import EmailManager from '@/components/EmailManager';
import { GmailConnectionStatus } from '@/components/GmailConnectionStatus';

const Emails = () => {
  return (
    <Layout>
      <div className="h-full flex flex-col">
        <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex h-14 items-center justify-between px-4">
            <h1 className="font-semibold">Emails</h1>
            <GmailConnectionStatus />
          </div>
        </div>
        <EmailManager />
      </div>
    </Layout>
  );
};

export default Emails;