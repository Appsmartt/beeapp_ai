export function downloadCsv(filename: string, rows: Array<Record<string, string | number>>) {
  const headers = rows.length > 0 ? Object.keys(rows[0]) : [];
  const lines = [
    headers.join(';'),
    ...rows.map((row) => headers.map((header) => {
      const value = String(row[header] ?? '').replaceAll('"', '""');
      return `"${value}"`;
    }).join(';')),
  ];
  const blob = new Blob([`\uFEFF${lines.join('\n')}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
