export function formatMark(value) {
  if (value === null || value === undefined) {
    return "Incomplete";
  }

  return `${Number(value).toLocaleString(undefined, {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  })}%`;
}

export function formatGradePoint(value) {
  if (value === null || value === undefined) {
    return "Pending";
  }

  return Number(value).toLocaleString(undefined, {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  });
}

export function getOutcomePillClass(result) {
  if (result.publicationStatus !== "published") {
    return "pill muted-pill";
  }

  if (result.outcome === "pass") {
    return "pill";
  }

  if (result.outcome === "fail") {
    return "pill danger-pill";
  }

  return "pill warning-pill";
}
