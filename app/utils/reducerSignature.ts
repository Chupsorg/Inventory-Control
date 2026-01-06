export const getConfigSignature = (config: any[]) =>
  JSON.stringify(
    (config || []).map((c) => ({
      date: c.date,
      days: c.days,
      date_range: c.date_range
        ? c.date_range.map((d: any) => d.toString())
        : null,
    }))
  );
