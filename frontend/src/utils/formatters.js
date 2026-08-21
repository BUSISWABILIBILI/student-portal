export const formatNumber = (value) => Number(value || 0).toLocaleString();

export const getInitials = (user) => {
  const first = user?.firstName?.[0] || "";
  const last = user?.lastName?.[0] || "";

  return `${first}${last}` || "SP";
};

export const optionalTextValue = (value) => {
  const trimmedValue = value.trim();

  return trimmedValue ? trimmedValue : null;
};

export const optionalDateValue = (value) => value || null;

export const dateToInputValue = (value) => {
  if (!value) {
    return "";
  }

  return String(value).slice(0, 10);
};

export const formatShortDate = (value) => {
  if (!value) {
    return "unknown";
  }

  return new Date(value).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

export const formatOptionalShortDate = (value) =>
  value ? formatShortDate(value) : "N/A";
