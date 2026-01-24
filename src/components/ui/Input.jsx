import { clsx } from 'clsx';

export function Input({
  label,
  error,
  className,
  id,
  ...props
}) {
  const inputId = id || props.name;

  return (
    <div className={className}>
      {label && (
        <label
          htmlFor={inputId}
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={clsx(
          'block w-full px-3 py-2 rounded-lg border shadow-sm',
          'focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500',
          'placeholder:text-gray-400',
          'transition-colors duration-200',
          error
            ? 'border-red-300 text-red-900 focus:ring-red-500 focus:border-red-500'
            : 'border-gray-300 text-gray-900'
        )}
        {...props}
      />
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}

export function CurrencyInput({
  label,
  error,
  className,
  value,
  onChange,
  id,
  ...props
}) {
  const inputId = id || props.name;

  const handleChange = (e) => {
    // Allow only numbers and decimal point
    const rawValue = e.target.value.replace(/[^0-9.]/g, '');
    // Ensure only one decimal point
    const parts = rawValue.split('.');
    let formatted = parts[0];
    if (parts.length > 1) {
      formatted += '.' + parts[1].slice(0, 2);
    }
    onChange(formatted);
  };

  return (
    <div className={className}>
      {label && (
        <label
          htmlFor={inputId}
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          {label}
        </label>
      )}
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
          $
        </span>
        <input
          id={inputId}
          type="text"
          inputMode="decimal"
          value={value}
          onChange={handleChange}
          className={clsx(
            'block w-full pl-7 pr-3 py-2 rounded-lg border shadow-sm',
            'focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500',
            'placeholder:text-gray-400',
            'transition-colors duration-200',
            error
              ? 'border-red-300 text-red-900 focus:ring-red-500 focus:border-red-500'
              : 'border-gray-300 text-gray-900'
          )}
          {...props}
        />
      </div>
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}
