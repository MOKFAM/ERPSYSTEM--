type CsvCell = string | number | null | undefined

function escapeCell(value: CsvCell): string {
  const s = value === null || value === undefined ? '' : String(value)
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

// 헤더 + 행 데이터를 CSV 문자열로 변환 (엑셀 한글 호환을 위해 UTF-8 BOM 포함)
export function buildCsv(headers: string[], rows: CsvCell[][]): string {
  const lines = [headers, ...rows].map((row) => row.map(escapeCell).join(','))
  return '\uFEFF' + lines.join('\r\n')
}

// 브라우저에서 CSV 파일 다운로드 트리거
export function downloadCsv(filename: string, headers: string[], rows: CsvCell[][]): void {
  const csv = buildCsv(headers, rows)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
