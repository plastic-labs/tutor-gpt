"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface SupportFormProps {
  user: {
    id: string;
    email: string;
  };
}

function SupportForm({ user }: SupportFormProps) {
  const [message, setMessage] = useState("");

  const handleSubmit = () => {
    // Implement support message submission logic
    console.log("Submitting support message:", message);
  };

  return (
    <Card className="bg-card text-card-foreground">
      <CardHeader>
        <CardTitle className="text-primary">Contact Support</CardTitle>
        <CardDescription>
          Send us a message and we&apos;ll get back to you as soon as possible.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Textarea
          placeholder="Describe your issue or question"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="bg-input text-foreground"
          rows={5}
        />
      </CardContent>
      <CardFooter className="flex justify-start pt-6">
        <Button
          onClick={handleSubmit}
          className="bg-primary text-primary-foreground hover:bg-primary/90"
        >
          Send Message
        </Button>
      </CardFooter>
    </Card>
  );
}

interface User {
  id: string;
  email: string;
  // Add other user properties as needed
}

export function SupportSettings({ user }: { user: User }) {
  return (
    <div className="space-y-4">
      <h2 className="text-3xl font-bold text-primary">Contact Support</h2>
      <SupportForm user={user} />
    </div>
  );
}
