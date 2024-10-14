"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SettingsForm } from "@/components/SettingsForm";
import SubscriptionManager from "@/components/SubscriptionManager";
import SupportForm from "@/components/SupportForm";

export default function SettingsLayout({ user, subscription, products }) {
  const [activeTab, setActiveTab] = useState("account");

  const navItems = [
    { id: "account", label: "Account" },
    { id: "security", label: "Security" },
    { id: "subscription", label: "Subscription" },
    { id: "support", label: "Support" },
  ];

  return (
    <div className="flex-1 flex flex-col bg-background text-foreground">
      {/* Top Navigation */}
      <div className="p-4 border-b border-border">
        <Link href="/">
          <Button
            variant="outline"
            className="text-primary hover:bg-primary hover:text-primary-foreground"
          >
            Return to Home
          </Button>
        </Link>
      </div>

      <div className="flex-1 flex">
        {/* Left Navigation */}
        <nav className="w-64 bg-muted p-4">
          <h2 className="text-2xl font-bold mb-4 text-primary">Settings</h2>
          <ul>
            {navItems.map((item) => (
              <li key={item.id} className="mb-2">
                <button
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full text-left p-2 rounded ${
                    activeTab === item.id
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-accent hover:text-accent-foreground"
                  }`}
                >
                  {item.label}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {/* Main Content */}
        <div className="flex-1 p-8">
          {activeTab === "account" && (
            <div className="space-y-4">
              <h2 className="text-3xl font-bold text-primary">
                Account Settings
              </h2>
              <SettingsForm user={user} type="account" />
            </div>
          )}
          {activeTab === "security" && (
            <div className="space-y-4">
              <h2 className="text-3xl font-bold text-primary">
                Security Settings
              </h2>
              <SettingsForm user={user} type="security" />
            </div>
          )}
          {activeTab === "subscription" && (
            <div className="space-y-4">
              <h2 className="text-3xl font-bold text-primary">
                Subscription Management
              </h2>
              <SubscriptionManager
                subscription={subscription}
                products={products}
              />
            </div>
          )}
          {activeTab === "support" && (
            <div className="space-y-4">
              <h2 className="text-3xl font-bold text-primary">
                Contact Support
              </h2>
              <SupportForm user={user} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
