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
import SubscriptionSettings from "@/components/settings/SubscriptionSettings";
import { IntegrationsSettings } from "@/components/settings/IntegrationsSettings";
import { SecuritySettings } from "@/components/settings/SecuritySettings";
import { AccountSettings } from "@/components/settings/AccountSettings";
import { SupportSettings } from "@/components/settings/SupportSettings";

export default function SettingsLayout({ user, subscription, products }) {
  const [activeTab, setActiveTab] = useState("account");

  const navItems = [
    { id: "account", label: "Account" },
    { id: "security", label: "Security" },
    { id: "subscription", label: "Subscription" },
    { id: "integrations", label: "Integrations" },
    { id: "support", label: "Support" },
  ];

  return (
    <div className="flex-1 flex flex-col bg-background text-foreground">
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
        <div className="flex-1 p-8">
          {activeTab === "account" && <AccountSettings user={user} />}
          {activeTab === "security" && <SecuritySettings user={user} />}
          {activeTab === "subscription" && (
            <SubscriptionSettings
              subscription={subscription}
              products={products}
            />
          )}
          {activeTab === "integrations" && <IntegrationsSettings user={user} />}
          {activeTab === "support" && <SupportSettings user={user} />}
        </div>
      </div>
    </div>
  );
}
