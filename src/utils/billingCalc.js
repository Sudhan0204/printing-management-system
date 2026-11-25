export const UNITS = [
  { value: "sq_ft", label: "Sq.ft" },
  { value: "piece", label: "Piece" },
  { value: "meter", label: "Meter" },
  { value: "kg", label: "Kg" },
  { value: "roll", label: "Roll" },
  { value: "other", label: "Other" },
];

export const PRICING_TYPES = [
  { value: "dimension_based", label: "Dimension Based" },
  { value: "fixed_price", label: "Fixed Price" },
  { value: "quantity_based", label: "Quantity Based" },
];

export function unitLabel(unit) {
  return UNITS.find((item) => item.value === unit)?.label || unit;
}

export function pricingLabel(type) {
  return PRICING_TYPES.find((item) => item.value === type)?.label || type;
}

/**
 * Mirrors backend BillingCalc::calculateLine
 */
export function calculateLine({ pricingType, width, height, quantity, rate }) {
  const qty = Number(quantity);
  const rateValue = Number(rate);
  const widthValue = width === "" || width === null || width === undefined ? null : Number(width);
  const heightValue =
    height === "" || height === null || height === undefined ? null : Number(height);

  if (!Number.isFinite(qty) || qty <= 0) {
    return { area: null, amount: 0, error: "Quantity must be greater than zero" };
  }

  if (!Number.isFinite(rateValue) || rateValue < 0) {
    return { area: null, amount: 0, error: "Rate cannot be negative" };
  }

  if (pricingType === "dimension_based") {
    if (
      widthValue === null ||
      heightValue === null ||
      !Number.isFinite(widthValue) ||
      !Number.isFinite(heightValue) ||
      widthValue <= 0 ||
      heightValue <= 0
    ) {
      return { area: null, amount: 0, error: "Width and height are required" };
    }

    const area = round(widthValue * heightValue * qty, 4);
    const amount = round(area * rateValue, 2);
    return { area, amount, error: null };
  }

  return {
    area: null,
    amount: round(rateValue * qty, 2),
    error: null,
  };
}

export function formatMoney(value) {
  const amount = Number(value) || 0;
  return `₹${amount.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function round(value, digits) {
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}
