"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  CreditCard, 
  Calendar, 
  Users,
  BarChart3
} from "lucide-react";

// Import all the setting components
import EmployeeSummary from "@/components/EmployeeSummary";
import Allowance from "@/components/Allowance";
import WorkingDays from "@/components/WorkingDays";
import Teams from "@/components/Teams";
import DailyBreakdown from "@/components/DailyBreakdown";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("employeeSummary");

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
        <TabsList className="w-max md:w-full md:grid md:grid-cols-5 gap-2">
          <TabsTrigger value="employeeSummary" className="flex items-center gap-2 text-lg md:text-base px-5 py-3 md:px-4 md:py-2.5 whitespace-nowrap font-medium">
            <BarChart3 className="h-6 w-6 md:h-5 md:w-5" />
            Employee Summary
          </TabsTrigger>
          <TabsTrigger value="allowance" className="flex items-center gap-2 text-lg md:text-base px-5 py-3 md:px-4 md:py-2.5 whitespace-nowrap font-medium">
            <CreditCard className="h-6 w-6 md:h-5 md:w-5" />
            Allowance
          </TabsTrigger>
          <TabsTrigger value="working-days" className="flex items-center gap-2 text-lg md:text-base px-5 py-3 md:px-4 md:py-2.5 whitespace-nowrap font-medium">
            <Calendar className="h-6 w-6 md:h-5 md:w-5" />
            Working Days
          </TabsTrigger>
          <TabsTrigger value="team" className="flex items-center gap-2 text-lg md:text-base px-5 py-3 md:px-4 md:py-2.5 whitespace-nowrap font-medium">
            <Users className="h-6 w-6 md:h-5 md:w-5" />
            Team
          </TabsTrigger>
          <TabsTrigger value="dailyBreakdown" className="flex items-center gap-2 text-lg md:text-base px-5 py-3 md:px-4 md:py-2.5 whitespace-nowrap font-medium">
            <BarChart3 className="h-6 w-6 md:h-5 md:w-5" />
            Daily Breakdown
          </TabsTrigger>
        </TabsList>
        </div>
        
        <TabsContent value="employeeSummary">
          <EmployeeSummary />
        </TabsContent>
        
        <TabsContent value="allowance">
          <Allowance />
        </TabsContent>
        
        <TabsContent value="working-days">
          <WorkingDays />
        </TabsContent>
        
        <TabsContent value="team">
          <Teams />
        </TabsContent>
        
        <TabsContent value="dailyBreakdown">
          <DailyBreakdown />
        </TabsContent>
      </Tabs>
    </div>
  );
}
