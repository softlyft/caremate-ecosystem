import { Card, CardContent } from '@/components/ui/card';

export function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <Card>
      <CardContent className="p-5">
        <p className="text-2xl font-semibold">{value}</p>
        <p className="text-sm text-muted">{label}</p>
      </CardContent>
    </Card>
  );
}
