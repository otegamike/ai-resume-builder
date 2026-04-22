import { User, Mail, Bell } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { currentUser } from '@clerk/nextjs/server';

export default async function SettingsPage() {
  const user = await currentUser();

  if (!user) {
    return <div>Please sign in to view settings.</div>;
  }

  return (
    <div className="p-8 max-w-4xl mx-auto flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-gray-500 mt-1">Manage your account preferences and profile.</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <User className="h-5 w-5 text-gray-500" />
            Profile Information
          </h2>
          <p className="text-sm text-gray-500 mt-1">Update your account details here.</p>
        </div>
        
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">First Name</label>
              <input value={user.firstName || ''} className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Last Name</label>
              <input value={user.lastName || ''} className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm" />
            </div>
            <div className="space-y-2 col-span-2">
              <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email Address
              </label>
              <input value={user.primaryEmailAddress?.emailAddress || ''} className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm" />
              <p className="text-xs text-gray-400 mt-1">Authentication will be required to change your email.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden mb-12">
        <div className="p-6 bg-gray-50 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Bell className="h-5 w-5 text-gray-500" />
              Notifications
            </h2>
            <p className="text-sm text-gray-500 mt-1">Manage how we communicate with you.</p>
          </div>
          <Button disabled className="bg-gray-300">Save Preferences</Button>
        </div>
      </div>
    </div>
  );
}
