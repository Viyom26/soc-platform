type LogItem = {
  ip: string;
  severity: string;
  failures: number;
  first_seen: string;
  last_seen: string;
};

type Props = {
  logs: LogItem[];
};

function severityColor(severity: string) {
  if (severity === "CRITICAL") return "text-red-500";
  if (severity === "HIGH") return "text-orange-500";
  if (severity === "MEDIUM") return "text-yellow-500";
  return "text-green-500";
}

export default function LogsTable({ logs }: Props) {
  return (
    <div className="overflow-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead className="bg-zinc-900 text-zinc-300">
          <tr>
            <th>IP</th>
            <th>Severity</th>
            <th>Count</th>
            <th>First Seen</th>
            <th>Last Seen</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((l: LogItem, i: number) => (
            <tr key={i} className="border-t">
              <td>{l.ip}</td>
              <td className={`font-bold ${severityColor(l.severity)}`}>
                {l.severity}
              </td>
              <td>{l.failures}</td>
              <td>{l.first_seen}</td>
              <td>{l.last_seen}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}