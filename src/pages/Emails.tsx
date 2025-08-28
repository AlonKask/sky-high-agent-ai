import React from 'react';
import EnhancedEmailInterface from '@/components/EnhancedEmailInterface';
import EmailHtmlBackfill from '@/components/EmailHtmlBackfill';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const Emails = () => {
  return (
    <div className="h-screen flex flex-col">
      <div className="p-4 border-b">
        <h1 className="text-2xl font-bold">Emails</h1>
      </div>
      <div className="flex-1 overflow-hidden">
        <Tabs defaultValue="emails" className="h-full flex flex-col">
          <div className="p-4 border-b">
            <TabsList>
              <TabsTrigger value="emails">Email Interface</TabsTrigger>
              <TabsTrigger value="backfill">HTML Enhancement</TabsTrigger>
            </TabsList>
          </div>
          
          <TabsContent value="emails" className="flex-1 m-0">
            <EnhancedEmailInterface />
          </TabsContent>
          
          <TabsContent value="backfill" className="flex-1 p-6">
            <EmailHtmlBackfill />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Emails;