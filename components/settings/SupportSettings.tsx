'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export function SupportSettings() {
  return (
    <div className="space-y-4">
      <h2 className="text-3xl font-bold text-primary">Contact Support</h2>
      <Card className="bg-card text-card-foreground">
        <CardHeader>
          <CardTitle className="text-primary">Need Help?</CardTitle>
          <CardDescription>
            {`We're here to assist you with any questions or issues you may
            have.`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>
            For support, please email us at:{' '}
            <a
              href="mailto:hello@plasticlabs.ai"
              className="text-primary hover:underline"
            >
              hello@plasticlabs.ai
            </a>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
