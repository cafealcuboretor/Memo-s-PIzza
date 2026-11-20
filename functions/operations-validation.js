class ApiError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function invalidInput(message) {
  return new ApiError(400, 'INVALID_INPUT', message);
}

function assertFields(input, allowed) {
  if (!input || typeof input !== 'object' || Array.isArray(input)
      || Object.keys(input).some(key => !allowed.includes(key))) {
    throw invalidInput('Revisa los campos enviados en la solicitud.');
  }
}

function field(value, name, max, required = true) {
  if (!required && (value === undefined || value === '')) return '';
  if (typeof value !== 'string' || value.trim().length > max
      || (required && !value.trim()) || /[\u0000-\u001f\u007f]/.test(value)) {
    throw invalidInput(`Revisa el campo ${name}.`);
  }
  return value.trim();
}

module.exports = { ApiError, assertFields, field, invalidInput };
