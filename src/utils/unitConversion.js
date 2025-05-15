export const UNITS = {
  mm: {
    name: 'mm',
    factor: 1,
    precision: 0,
    label: 'мм'
  },
  cm: {
    name: 'cm',
    factor: 0.1,
    precision: 1,
    label: 'см'
  },
  m: {
    name: 'm',
    factor: 0.001,
    precision: 2,
    label: 'м'
  }
};

export function convertFromMM(value, unit) {
  const unitConfig = UNITS[unit];
  if (!unitConfig) return value;
  return (value * unitConfig.factor).toFixed(unitConfig.precision);
}

export function convertToMM(value, unit) {
  const unitConfig = UNITS[unit];
  if (!unitConfig) return value;
  return value / unitConfig.factor;
}

export function formatMeasurement(value, unit) {
  const unitConfig = UNITS[unit];
  if (!unitConfig) return `${value} ${unit}`;
  return `${convertFromMM(value, unit)} ${unitConfig.label}`;
} 