"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface User {
  id: string;
  email: string;
  // Add other user properties as needed
}

interface SettingsFormProps {
  user: User;
  type: "account" | "security";
}

export function SettingsForm({ user, type }: SettingsFormProps) {
  const [email, setEmail] = useState(user.email);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleEmailChange = () => {
    // Implement email change logic
    console.log("Changing email to:", email);
  };

  const handlePasswordChange = () => {
    // Implement password change logic
    console.log("Changing password");
  };

  return (
    <Card className="bg-card text-card-foreground">
      <CardHeader>
        <CardTitle className="text-primary">
          {type === "account" ? "Account Information" : "Security Settings"}
        </CardTitle>
        <CardDescription>
          {type === "account"
            ? "Update your account settings here."
            : "Manage your security settings and change your password."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {type === "account" && (
          <div className="space-y-2">
            <Label htmlFor="email" className="text-foreground">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-input text-foreground flex-grow"
            />
          </div>
        )}
        {type === "security" && (
          <>
            <div className="space-y-2">
              <Label htmlFor="currentPassword" className="text-foreground">
                Current Password
              </Label>
              <Input
                id="currentPassword"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="bg-input text-foreground"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPassword" className="text-foreground">
                New Password
              </Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="bg-input text-foreground"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-foreground">
                Confirm New Password
              </Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="bg-input text-foreground"
              />
            </div>
          </>
        )}
      </CardContent>
      <CardFooter className="flex justify-start border-t pt-6">
        {type === "account" && (
          <Button
            onClick={handleEmailChange}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            Update Email
          </Button>
        )}
        {type === "security" && (
          <Button
            onClick={handlePasswordChange}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            Change Password
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
