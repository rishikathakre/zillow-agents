export default function PDFReport({ record }) {
  async function handleDownload() {
    const response = await fetch("/api/pdf", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        property_details: record.property_details,
        scores: {
          score_rows: record.score_rows,
        },
        report_text: record.report_text,
        recommendation: record.recommendation,
        weighted_total: record.weighted_total,
      }),
    });
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "investment-report.pdf";
    anchor.click();
    window.URL.revokeObjectURL(url);
  }

  return (
    <button type="button" onClick={handleDownload} className="rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white">
      Download PDF Report
    </button>
  );
}
